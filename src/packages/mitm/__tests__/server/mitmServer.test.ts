// El servidor MITM de extremo a extremo (omniroute: src/mitm/server.cjs, MIT): un router
// local que registra lo que recibe, un upstream https para el paso directo, y el servidor
// en un puerto libre. Las peticiones llevan el Host del agente; el certificado se mide
// aparte, con la CA, en su propio caso.
import { afterEach, test } from 'bun:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import https from 'node:https'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import tls from 'node:tls'

import { loadOrCreateMitmCa } from '../../src/cert/rootCa.ts'
import { generateMitmCa, issueLeafCertForHosts } from '../../src/dynamicCert.ts'
import { INGEST_PATH } from '../../src/server/ingest.ts'
import { createMitmServer, type MitmServerHandle } from '../../src/server/mitmServer.ts'
import type { MitmServerConfig } from '../../src/server/serverConfig.ts'
import { setMitmAliasAll } from '../../src/state/mitmAlias.ts'
import { openMitmStateStore } from '../../src/state/stateStore.ts'

const ANTIGRAVITY_HOST = 'daily-cloudcode-pa.googleapis.com'
const CHAT_PATH = '/v1internal:streamGenerateContent?alt=sse'

const cleanups: Array<() => void | Promise<void>> = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()!()
})

interface Recorded {
  path: string
  headers: Record<string, string>
  body: string
}

async function freePort(): Promise<number> {
  const probe = net.createServer()
  await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', () => resolve()))
  const port = (probe.address() as net.AddressInfo).port
  await new Promise<void>(resolve => probe.close(() => resolve()))
  return port
}

async function harness(options: {
  routerStatus?: number
  config?: Partial<MitmServerConfig>
  targetsJson?: unknown
  bypassJson?: unknown
  upstreamPort?: number
  listenPort?: number
} = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-mitm-server-'))
  cleanups.push(() => fs.rmSync(dataDir, { recursive: true, force: true }))
  if (options.targetsJson) fs.writeFileSync(path.join(dataDir, 'targets.json'), JSON.stringify(options.targetsJson))
  if (options.bypassJson) fs.writeFileSync(path.join(dataDir, 'bypass.json'), JSON.stringify(options.bypassJson))
  const ca = await generateMitmCa('test CA')
  const leaf = await issueLeafCertForHosts([ANTIGRAVITY_HOST, 'api.anthropic.com', 'other.example.com'], ca)
  fs.writeFileSync(path.join(dataDir, 'server.key'), leaf.key)
  fs.writeFileSync(path.join(dataDir, 'server.crt'), leaf.cert)

  const routed: Recorded[] = []
  const ingested: Record<string, unknown>[] = []
  const router = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    async fetch(request) {
      const url = new URL(request.url)
      const body = await request.text()
      if (url.pathname === INGEST_PATH) {
        ingested.push(JSON.parse(body) as Record<string, unknown>)
        return new Response('{}')
      }
      routed.push({ path: url.pathname, headers: Object.fromEntries(request.headers), body })
      if (options.routerStatus && options.routerStatus !== 200) {
        return new Response('upstream said no at /srv/app/secret/file.ts:12', { status: options.routerStatus })
      }
      return new Response('data: {"ok":true}\n\n', { headers: { 'content-type': 'text/event-stream' } })
    },
  })
  cleanups.push(() => router.stop(true))

  const passthroughSeen: Recorded[] = []
  const upstream = https.createServer({ key: leaf.key, cert: leaf.cert }, (req, res) => {
    let body = ''
    req.on('data', chunk => (body += chunk))
    req.on('end', () => {
      passthroughSeen.push({ path: req.url ?? '', headers: req.headers as Record<string, string>, body })
      res.writeHead(201, { 'x-upstream': 'yes' })
      res.end('from upstream')
    })
  })
  await new Promise<void>(resolve => upstream.listen(0, '127.0.0.1', () => resolve()))
  cleanups.push(() => new Promise<void>(resolve => upstream.close(() => resolve())))

  const db = openMitmStateStore(':memory:')
  cleanups.push(() => db.close())
  const lines: string[] = []
  const config: MitmServerConfig = {
    localPort: options.listenPort ?? 443,
    dataDir,
    routerBaseUrl: `http://127.0.0.1:${router.port}`,
    apiKey: 'local-key',
    certMode: 'legacy',
    verbose: 1,
    disableTlsVerify: true,
    ingestToken: '',
    ingestBaseUrl: `http://127.0.0.1:${router.port}`,
    ...options.config,
  }
  const mitm: MitmServerHandle = await createMitmServer(config, {
    db,
    resolveTargetIp: async () => '127.0.0.1',
    upstreamPort: options.upstreamPort ?? (upstream.address() as net.AddressInfo).port,
    writeLine: line => lines.push(line),
  })
  const port = await mitm.listen(options.listenPort ?? 0)
  cleanups.push(() => mitm.close())

  const send = (host: string, requestPath: string, body: unknown, headers: Record<string, string> = {}) =>
    fetch(`https://127.0.0.1:${port}${requestPath}`, {
      method: 'POST',
      headers: { host, 'content-type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
      tls: { rejectUnauthorized: false },
    } as RequestInit)
  return { ca, db, dataDir, mitm, port, send, routed, ingested, passthroughSeen, lines }
}

const ENVELOPE = { model: 'gemini-x', project: 'p', request: { contents: [{ role: 'user', parts: [{ text: 'hi' }] }] } }

test('a mapped antigravity chat is rewritten and forwarded to the router as cloudcode', async () => {
  const h = await harness()
  setMitmAliasAll(h.db, 'antigravity', { 'gemini-x': { model: 'cx/gpt-y', reasoningEffort: 'high' } })
  const response = await h.send(ANTIGRAVITY_HOST, CHAT_PATH, ENVELOPE)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'text/event-stream')
  assert.equal(await response.text(), 'data: {"ok":true}\n\n')
  assert.equal(h.routed.length, 1)
  const [routed] = h.routed
  assert.equal(routed!.path, '/v1/antigravity')
  assert.equal(routed!.headers.authorization, 'Bearer local-key')
  assert.equal(routed!.headers['x-thyrox-source'], 'agent-bridge')
  assert.equal(routed!.headers['x-thyrox-agent'], 'antigravity')
  const body = JSON.parse(routed!.body)
  assert.equal(body.model, 'cx/gpt-y')
  assert.equal(body.reasoningEffortOverride, 'high')
  assert.deepEqual(body.request, ENVELOPE.request)
  assert.equal(h.mitm.stats.interceptedRequests, 1)
  assert.equal(h.passthroughSeen.length, 0)
})

test('a chat without an alias passes through to the real host, untouched', async () => {
  const h = await harness()
  const response = await h.send(ANTIGRAVITY_HOST, CHAT_PATH, ENVELOPE)
  assert.equal(response.status, 201)
  assert.equal(response.headers.get('x-upstream'), 'yes')
  assert.equal(await response.text(), 'from upstream')
  assert.equal(h.routed.length, 0)
  assert.equal(h.passthroughSeen.length, 1)
  assert.equal(h.passthroughSeen[0]!.path, CHAT_PATH)
  assert.equal(h.passthroughSeen[0]!.headers.host, ANTIGRAVITY_HOST)
  assert.deepEqual(JSON.parse(h.passthroughSeen[0]!.body), ENVELOPE)
})

test('hosts outside the targets, non-chat URLs and our own traffic pass through', async () => {
  const h = await harness()
  setMitmAliasAll(h.db, 'antigravity', { '*': 'cx/any' })
  await (await h.send('other.example.com', CHAT_PATH, ENVELOPE)).text()
  await (await h.send(ANTIGRAVITY_HOST, '/v1internal:loadCodeAssist', ENVELOPE)).text()
  await (await h.send(ANTIGRAVITY_HOST, CHAT_PATH, ENVELOPE, { 'x-thyrox-source': 'thyrox' })).text()
  assert.equal(h.routed.length, 0)
  assert.equal(h.passthroughSeen.length, 3)
  assert.equal(h.passthroughSeen[0]!.headers.host, 'other.example.com')
})

test('a model in the URL counts when the body has none', async () => {
  const h = await harness()
  setMitmAliasAll(h.db, 'antigravity', { 'gemini-url': 'cx/from-url' })
  const response = await h.send(ANTIGRAVITY_HOST, '/v1beta/models/gemini-url:streamGenerateContent', {
    request: { contents: [] },
  })
  await response.text()
  assert.equal(JSON.parse(h.routed[0]!.body).model, 'cx/from-url')
})

test('an agent declared in targets.json that speaks Anthropic goes to /v1/messages', async () => {
  const h = await harness({ targetsJson: { targets: [{ id: 'claude-code', hosts: ['api.anthropic.com'] }] } })
  setMitmAliasAll(h.db, 'claude-code', { 'claude-src': 'anthropic/claude-sonnet-5' })
  const response = await h.send('api.anthropic.com', '/v1/messages', { model: 'claude-src', messages: [] })
  await response.text()
  assert.equal(h.routed[0]!.path, '/v1/messages')
  assert.equal(h.routed[0]!.headers['x-thyrox-agent'], 'claude-code')
  assert.equal(JSON.parse(h.routed[0]!.body).model, 'anthropic/claude-sonnet-5')
})

test('a router failure answers 500 with a sanitized mitm_error', async () => {
  const h = await harness({ routerStatus: 400 })
  setMitmAliasAll(h.db, 'antigravity', { 'gemini-x': 'cx/y' })
  const response = await h.send(ANTIGRAVITY_HOST, CHAT_PATH, ENVELOPE)
  assert.equal(response.status, 500)
  const body = (await response.json()) as { error: { message: string; type: string } }
  assert.equal(body.error.type, 'mitm_error')
  assert.match(body.error.message, /400/)
  assert.ok(!body.error.message.includes('/srv/app/secret/file.ts'), body.error.message)
})

test('with an ingest token the inspector gets the capture and the final entry', async () => {
  const h = await harness({ config: { ingestToken: 'ingest-tok' } })
  setMitmAliasAll(h.db, 'antigravity', { 'gemini-x': 'cx/y' })
  await (await h.send(ANTIGRAVITY_HOST, CHAT_PATH, ENVELOPE)).text()
  await Bun.sleep(100)
  const statuses = h.ingested.map(entry => entry.status)
  assert.deepEqual(statuses, ['in-flight', 200])
  const final = h.ingested[1]!
  assert.equal(final.agent, 'antigravity')
  assert.equal(final.sourceModel, 'gemini-x')
  assert.equal(final.mappedModel, 'cx/y')
  assert.equal(final.responseBody, 'data: {"ok":true}\n\n')
})

test('the capture goes to the MITM API, not to the router', async () => {
  const received: Record<string, unknown>[] = []
  const api = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    async fetch(request) {
      if (new URL(request.url).pathname === INGEST_PATH) received.push((await request.json()) as Record<string, unknown>)
      return new Response('{}')
    },
  })
  cleanups.push(() => api.stop(true))
  const h = await harness({ config: { ingestToken: 'ingest-tok', ingestBaseUrl: `http://127.0.0.1:${api.port}` } })
  setMitmAliasAll(h.db, 'antigravity', { 'gemini-x': 'cx/y' })
  await (await h.send(ANTIGRAVITY_HOST, CHAT_PATH, ENVELOPE)).text()
  await Bun.sleep(100)
  assert.equal(received.length, 2)
  assert.equal(h.ingested.length, 0)
})


test('without an ingest token nothing is posted to the inspector', async () => {
  const h = await harness()
  setMitmAliasAll(h.db, 'antigravity', { 'gemini-x': 'cx/y' })
  await (await h.send(ANTIGRAVITY_HOST, CHAT_PATH, ENVELOPE)).text()
  await Bun.sleep(100)
  assert.equal(h.ingested.length, 0)
})

test('the loop guard refuses to dial back into the server itself', async () => {
  const port = await freePort()
  const h = await harness({ listenPort: port, upstreamPort: port })
  const response = await h.send('other.example.com', '/', '')
  assert.equal(response.status, 508)
  assert.equal(await response.text(), 'Loop Detected')
})

test('with TLS verification on, an untrusted upstream is a 502', async () => {
  const h = await harness({ config: { disableTlsVerify: false } })
  const response = await h.send('other.example.com', '/', '')
  assert.equal(response.status, 502)
  assert.equal(h.passthroughSeen.length, 0)
})

test('stats are counted and written next to the certificates', async () => {
  const h = await harness()
  setMitmAliasAll(h.db, 'antigravity', { 'gemini-x': 'cx/y' })
  await (await h.send(ANTIGRAVITY_HOST, CHAT_PATH, ENVELOPE)).text()
  await (await h.send('other.example.com', '/', '')).text()
  const stats = JSON.parse(fs.readFileSync(path.join(h.dataDir, 'stats.json'), 'utf8'))
  assert.equal(stats.totalRequests, 2)
  assert.equal(stats.interceptedRequests, 1)
  assert.ok(stats.startedAt)
  assert.ok(stats.lastInterceptAt)
})

test('THYROX_MITM_VERBOSE 0 silences the per-request decisions', async () => {
  const loud = await harness()
  await (await loud.send('other.example.com', '/', '')).text()
  assert.ok(loud.lines.some(line => line.includes('PASSTHROUGH')))
  const quiet = await harness({ config: { verbose: 0 } })
  await (await quiet.send('other.example.com', '/', '')).text()
  assert.ok(!quiet.lines.some(line => line.includes('PASSTHROUGH')))
})

test('the root-CA mode presents one leaf, signed by the stored CA, for every target host', async () => {
  const h = await harness({
    config: { certMode: 'root-ca' },
    targetsJson: { targets: [{ id: 'cursor', hosts: ['api2.cursor.sh'] }] },
  })
  const ca = await loadOrCreateMitmCa(h.dataDir)
  for (const servername of [ANTIGRAVITY_HOST, 'api2.cursor.sh']) {
    const authorized = await new Promise<boolean>(resolve => {
      const socket = tls.connect({ host: '127.0.0.1', port: h.port, servername, ca: ca.cert }, () => {
        resolve(socket.authorized)
        socket.destroy()
      })
      socket.on('error', () => resolve(false))
    })
    assert.equal(authorized, true, servername)
  }
})

function connectThrough(port: number, authority: string, ca: string): Promise<{ status: string; tunnel: tls.TLSSocket }> {
  return new Promise((resolve, reject) => {
    const outer = tls.connect({ host: '127.0.0.1', port, servername: ANTIGRAVITY_HOST, rejectUnauthorized: false }, () => {
      outer.write(`CONNECT ${authority} HTTP/1.1\r\nHost: ${authority}\r\n\r\n`)
    })
    outer.once('data', data => resolve({ status: data.toString().split('\r\n')[0]!, tunnel: outer }))
    outer.once('error', reject)
    void ca
  })
}

test('a CONNECT to a passthrough host becomes a raw TCP tunnel', async () => {
  const h = await harness()
  const echo = net.createServer(socket => socket.on('data', data => socket.write(`echo:${data}`)))
  await new Promise<void>(resolve => echo.listen(0, '127.0.0.1', () => resolve()))
  cleanups.push(() => new Promise<void>(resolve => echo.close(() => resolve())))
  const { status, tunnel } = await connectThrough(h.port, `127.0.0.1:${(echo.address() as net.AddressInfo).port}`, h.ca.cert)
  assert.equal(status, 'HTTP/1.1 200 Connection Established')
  const reply = await new Promise<string>(resolve => {
    tunnel.once('data', data => resolve(data.toString()))
    tunnel.write('ping')
  })
  tunnel.destroy()
  assert.equal(reply, 'echo:ping')
})

test('a CONNECT to a target host is decrypted by the server itself', async () => {
  const h = await harness()
  setMitmAliasAll(h.db, 'antigravity', { 'gemini-x': 'cx/y' })
  const { status, tunnel } = await connectThrough(h.port, `${ANTIGRAVITY_HOST}:443`, h.ca.cert)
  assert.equal(status, 'HTTP/1.1 200 Connection Established')
  const body = JSON.stringify(ENVELOPE)
  const reply = await new Promise<string>(resolve => {
    const inner = tls.connect({ socket: tunnel, servername: ANTIGRAVITY_HOST, ca: h.ca.cert }, () => {
      inner.write(
        `POST ${CHAT_PATH} HTTP/1.1\r\nHost: ${ANTIGRAVITY_HOST}\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`,
      )
    })
    let text = ''
    inner.on('data', data => {
      text += data.toString()
      if (text.includes('"ok":true')) {
        resolve(text)
        inner.destroy()
      }
    })
    inner.on('error', error => resolve(`error: ${error.message}`))
  })
  assert.match(reply, /^HTTP\/1\.1 200/)
  assert.equal(h.routed.length, 1)
})

test('a CONNECT to a host in bypass.json is tunneled without decryption', async () => {
  const echo = net.createServer(socket => socket.on('data', data => socket.write(`echo:${data}`)))
  await new Promise<void>(resolve => echo.listen(0, '127.0.0.1', () => resolve()))
  cleanups.push(() => new Promise<void>(resolve => echo.close(() => resolve())))
  const h = await harness({ bypassJson: { patterns: ['127.0.0.*'] } })
  const authority = `127.0.0.1:${(echo.address() as net.AddressInfo).port}`
  const { status, tunnel } = await connectThrough(h.port, authority, h.ca.cert)
  assert.equal(status, 'HTTP/1.1 200 Connection Established')
  const reply = await new Promise<string>(resolve => {
    tunnel.once('data', data => resolve(data.toString()))
    tunnel.write('ping')
  })
  tunnel.destroy()
  assert.equal(reply, 'echo:ping')
  assert.ok(h.lines.some(line => line.includes(`${authority} → BYPASS`)), h.lines.join('\n'))
})

