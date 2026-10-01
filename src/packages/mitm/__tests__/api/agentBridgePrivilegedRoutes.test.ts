/**
 * Las rutas privilegiadas del AgentBridge: servidor, certificado, DNS por
 * agente, reinicio de un agente, reparación, diagnóstico, CA del upstream y
 * captura TPROXY. Toda operación con sudo pasa por la misma compuerta, y la
 * contraseña dada sólo se recuerda tras un éxito.
 *
 * Porte de `omniroute: tests/unit/agent-bridge-{cert-trust-sudo-gate,
 * cert-route-validation,cert-trust-mismatch,dns-route-validation,
 * dns-sudo-gate,dns-params-7271,dns-per-agent-8466,reset-route,
 * repair-route-validation,repair-sudo-gate,server-route-dynamic-import}`,
 * `tproxy-route` y `upstream-ca-test-route-3488` (MIT), con las operaciones
 * del sistema como dobles que registran sus llamadas.
 */
import { afterAll, beforeAll, beforeEach, afterEach, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { createApiHandler } from '../../src/api/router.ts'
import { createAgentDnsRoutes, type AgentDnsRouteDeps } from '../../src/api/routes/agentBridge/agentDns.ts'
import { AGENT_BRIDGE_BASE } from '../../src/api/routes/agentBridge/basePath.ts'
import { createCertRoutes, type CertRouteDeps } from '../../src/api/routes/agentBridge/cert.ts'
import { createDiagnoseRoutes, type DiagnoseRouteDeps } from '../../src/api/routes/agentBridge/diagnose.ts'
import { createRepairRoutes, type RepairRouteDeps } from '../../src/api/routes/agentBridge/repair.ts'
import { createServerRoutes, type ServerRouteDeps } from '../../src/api/routes/agentBridge/server.ts'
import { createTproxyRoutes, type TproxyCapture } from '../../src/api/routes/agentBridge/tproxy.ts'
import { createUpstreamCaRoutes, type UpstreamCaStore } from '../../src/api/routes/agentBridge/upstreamCa.ts'

/** Lo que piden todos los grupos juntos: un solo doble los alimenta. */
type AgentBridgePrivilegedDeps = ServerRouteDeps &
  CertRouteDeps &
  AgentDnsRouteDeps &
  RepairRouteDeps &
  DiagnoseRouteDeps & { upstreamCa: UpstreamCaStore; tproxy: TproxyCapture }
import type { CertInstallResult } from '../../src/cert/install.ts'
import { generateMitmCa } from '../../src/dynamicCert.ts'
import {
  getMappingsForAgent,
  setMappings,
  syncAgentBridgeMappingsToMitmAlias,
} from '../../src/state/agentBridgeMappings.ts'
import { getAgentBridgeState, upsertAgentBridgeState } from '../../src/state/agentBridgeState.ts'
import { getMitmAlias } from '../../src/state/mitmAlias.ts'
import { ensureAgentBridgeSchema } from '../../src/state/schema.ts'

const CERT = '/data/mitm/ca.crt'
let db: Database
let calls: string[]
let cachedPassword: string | null
let certOnDisk: boolean
let installResult: CertInstallResult
let running: boolean
let hostsEntries: Set<string>
let deps: AgentBridgePrivilegedDeps
let handle: (request: Request) => Promise<Response>
let fixtureDir: string
let pemPath: string

beforeAll(async () => {
  fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-mitm-routes-'))
  pemPath = path.join(fixtureDir, 'ca.pem')
  fs.writeFileSync(pemPath, (await generateMitmCa('Route Test CA')).cert)
  fs.writeFileSync(path.join(fixtureDir, 'not-a-cert.txt'), 'hello')
})
afterAll(() => fs.rmSync(fixtureDir, { recursive: true, force: true }))

beforeEach(() => {
  db = new Database(':memory:')
  ensureAgentBridgeSchema(db)
  calls = []
  cachedPassword = null
  certOnDisk = true
  installResult = { installed: true, skipped: false }
  running = false
  hostsEntries = new Set()
  let storedCa: string | null = null
  const record = (entry: string) => calls.push(entry)
  deps = {
    db,
    platform: 'linux',
    sudo: {
      cached: () => cachedPassword,
      remember: password => {
        cachedPassword = password
      },
      required: password => password === '',
    },
    server: {
      start: async (apiKey, password) => {
        record(`start:${apiKey}:${password}`)
        running = true
        return { running: true, pid: 7, certTrusted: true }
      },
      stop: async password => {
        record(`stop:${password}`)
        running = false
        cachedPassword = null
        return { running: false, pid: null }
      },
      status: async agentId => ({
        running,
        pid: running ? 7 : null,
        dnsConfigured: agentId ? hostsEntries.has(agentId) : false,
        certExists: certOnDisk,
        orphanedStateDetected: false,
      }),
    },
    cert: {
      active: () => ({ certPath: CERT, mode: 'use-root-ca' }),
      exists: () => certOnDisk,
      read: () => '-----BEGIN CERTIFICATE-----\nAAAA\n',
      trusted: async () => installResult.installed,
      install: async (password, certPath, mode) => {
        record(`install:${password}:${certPath}:${mode}`)
        return installResult
      },
      uninstall: async (password, certPath) => {
        record(`uninstall:${password}:${certPath}`)
        installResult = { installed: false, skipped: false }
      },
      generate: async force => {
        record(`generate:${force}`)
        return { cert: CERT, key: '/data/mitm/ca.key' }
      },
    },
    dns: {
      add: async (password, agentId) => {
        record(`dns-add:${password}:${agentId}`)
        hostsEntries.add(agentId)
      },
      remove: async (password, agentId) => {
        record(`dns-remove:${password}:${agentId}`)
        hostsEntries.delete(agentId)
      },
      flushWindowsCache: () => {
        record('dns-flush')
      },
      configuredFor: agentId => hostsEntries.has(agentId),
    },
    repair: async password => {
      record(`repair:${password}`)
      return { repaired: ['dns'] }
    },
    mitmPort: () => 8443,
    acceptsConnections: async port => {
      record(`probe:${port}`)
      return true
    },
    upstreamCa: {
      active: () => storedCa,
      store: caPath => {
        storedCa = caPath
        record(`store:${caPath}`)
      },
      configure: caPath => record(`configure:${caPath}`),
    },
    tproxy: {
      status: () => ({ running: false, available: false }),
      start: async (cfg, password) => {
        record(`tproxy-start:${cfg.dport}:${cfg.onPort}:${password}`)
        return { running: true, available: true, onPort: cfg.onPort }
      },
      stop: async () => {
        record('tproxy-stop')
        return { running: false, available: true }
      },
    },
  }
  handle = createApiHandler(
    [
      ...createServerRoutes(deps),
      ...createCertRoutes(deps),
      ...createAgentDnsRoutes(deps),
      ...createRepairRoutes(deps),
      ...createDiagnoseRoutes(deps),
      ...createUpstreamCaRoutes(deps.upstreamCa),
      ...createTproxyRoutes(deps.tproxy),
    ],
    { peerAddress: () => '127.0.0.1' },
  )
})
afterEach(() => db.close())

function call(method: string, route: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { host: '127.0.0.1' }
  const init: RequestInit = { method, headers }
  if (body !== undefined) {
    headers['content-type'] = 'application/json'
    init.body = typeof body === 'string' ? body : JSON.stringify(body)
  }
  return handle(new Request(`http://127.0.0.1${AGENT_BRIDGE_BASE}${route}`, init))
}

async function json(res: Response): Promise<Record<string, any>> {
  return (await res.json()) as Record<string, any>
}

async function expectMissingPassword(res: Response): Promise<void> {
  expect(res.status).toBe(400)
  expect((await json(res)).error.message).toBe('Missing sudoPassword')
}

// ── server ───────────────────────────────────────────────────────────────

test('server start caches the supplied password and passes the api key through', async () => {
  const res = await call('POST', '/server', { action: 'start', sudoPassword: ' pw ', apiKey: 'sk-local' })
  expect(await json(res)).toEqual({ ok: true, running: true, pid: 7, certTrusted: true })
  expect(calls).toEqual(['start:sk-local:pw'])
  expect(cachedPassword).toBe('pw')
})

test('server start without a body password uses the cached one and no api key', async () => {
  cachedPassword = 'cached'
  await call('POST', '/server', { action: 'start' })
  expect(calls).toEqual(['start::cached'])
})

test('server stop uses the resolved password', async () => {
  cachedPassword = 'cached'
  expect((await json(await call('POST', '/server', { action: 'stop' }))).ok).toBe(true)
  expect(calls).toEqual(['stop:cached'])
})

test('server restart stops only a running server and re-caches the password stop clears', async () => {
  running = true
  await call('POST', '/server', { action: 'restart', sudoPassword: 'pw' })
  expect(calls).toEqual(['stop:pw', 'start::pw'])
  expect(cachedPassword).toBe('pw')
  calls = []
  running = false
  await call('POST', '/server', { action: 'restart' })
  expect(calls).toEqual(['start::pw'])
})

test('server trust-cert installs the active cert under its model and reports trust', async () => {
  const res = await call('POST', '/server', { action: 'trust-cert', sudoPassword: 'pw' })
  expect(await json(res)).toEqual({ ok: true, trusted: true })
  expect(calls).toEqual([`install:pw:${CERT}:use-root-ca`])
  expect(cachedPassword).toBe('pw')
})

test('server trust-cert without a password is a 400 and installs nothing', async () => {
  await expectMissingPassword(await call('POST', '/server', { action: 'trust-cert' }))
  expect(calls).toEqual([])
})

test('server regenerate-cert forces a new certificate', async () => {
  expect(await json(await call('POST', '/server', { action: 'regenerate-cert' }))).toEqual({
    ok: true,
    certPath: CERT,
  })
  expect(calls).toEqual(['generate:true'])
})

test('server rejects an unknown action, a malformed body and a non-string password', async () => {
  expect((await call('POST', '/server', { action: 'explode' })).status).toBe(400)
  expect((await call('POST', '/server', '{bad')).status).toBe(400)
  expect((await call('POST', '/server', { action: 'start', sudoPassword: 42 })).status).toBe(400)
  expect(calls).toEqual([])
})

test('a failing start is a sanitized 500', async () => {
  deps.server.start = async () => {
    throw new Error('spawn failed at /home/user/thyrox/src/manager.ts:88')
  }
  const res = await call('POST', '/server', { action: 'start', sudoPassword: 'pw' })
  expect(res.status).toBe(500)
  expect((await json(res)).error.message).not.toContain('/home/user')
})

// ── cert ─────────────────────────────────────────────────────────────────

test('GET /cert reports the active cert, its trust and its path', async () => {
  expect(await json(await call('GET', '/cert'))).toEqual({ exists: true, trusted: true, path: CERT })
  certOnDisk = false
  expect(await json(await call('GET', '/cert'))).toEqual({ exists: false, trusted: false, path: null })
})

test('POST /cert without a password is a 400', async () => {
  await expectMissingPassword(await call('POST', '/cert', {}))
})

test('POST /cert of a missing certificate is a 404', async () => {
  certOnDisk = false
  const res = await call('POST', '/cert', { sudoPassword: 'pw' })
  expect(res.status).toBe(404)
  expect(calls).toEqual([])
})

test('POST /cert canceled by the user is a 409 and forgets nothing', async () => {
  installResult = { installed: false, skipped: false, reason: 'canceled', message: 'User canceled' }
  expect((await call('POST', '/cert', { sudoPassword: 'pw' })).status).toBe(409)
  expect(cachedPassword).toBeNull()
})

test('POST /cert in an environment that cannot install returns the manual guide, not an error', async () => {
  installResult = {
    installed: false,
    skipped: true,
    reason: 'environment',
    message: 'no trust store at /home/user/.x',
    manualGuide: { platform: 'linux', certPath: CERT, downloadUrl: `file://${CERT}`, steps: ['cp'] },
  }
  const res = await call('POST', '/cert', { sudoPassword: 'pw' })
  expect(res.status).toBe(200)
  const body = await json(res)
  expect(body).toMatchObject({ ok: false, trusted: false, skippable: true, reason: 'environment' })
  expect(body.manualGuide.steps).toEqual(['cp'])
  expect(body.message).not.toContain('/home/user')
})

test('POST /cert on Windows does not cache the password', async () => {
  deps.platform = 'win32'
  await call('POST', '/cert', { sudoPassword: 'pw' })
  expect(cachedPassword).toBeNull()
})

test('DELETE /cert uninstalls, and without a certificate it is an idempotent success', async () => {
  expect(await json(await call('DELETE', '/cert', { sudoPassword: 'pw' }))).toEqual({ ok: true, trusted: false })
  expect(calls).toEqual([`uninstall:pw:${CERT}`])
  calls = []
  certOnDisk = false
  expect(await json(await call('DELETE', '/cert', { sudoPassword: 'pw' }))).toEqual({ ok: true, trusted: false })
  expect(calls).toEqual([])
})

test('POST /cert/regenerate forces a new certificate and returns both paths', async () => {
  expect(await json(await call('POST', '/cert/regenerate'))).toEqual({
    ok: true,
    certPath: CERT,
    keyPath: '/data/mitm/ca.key',
  })
  expect(calls).toEqual(['generate:true'])
})

test('GET /cert/download serves the active certificate as a PEM attachment', async () => {
  const res = await call('GET', '/cert/download')
  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toBe('application/x-pem-file')
  expect(res.headers.get('content-disposition')).toMatch(/^attachment; filename=".+-mitm\.crt"$/)
  expect(await res.text()).toStartWith('-----BEGIN CERTIFICATE-----')
})

test('GET /cert/download without a certificate is a 404', async () => {
  certOnDisk = false
  expect((await call('GET', '/cert/download')).status).toBe(404)
})

// ── dns ──────────────────────────────────────────────────────────────────

test('POST /agents/:id/dns enables the agent hosts and records it', async () => {
  expect(await json(await call('POST', '/agents/claude-code/dns', { enabled: true, sudoPassword: 'pw' }))).toEqual({
    ok: true,
    dns_enabled: true,
  })
  expect(calls).toEqual(['dns-add:pw:claude-code'])
  expect(getAgentBridgeState(db, 'claude-code')?.dns_enabled).toBe(true)
  await call('POST', '/agents/claude-code/dns', { enabled: false })
  expect(calls.at(-1)).toBe('dns-remove:pw:claude-code')
  expect(getAgentBridgeState(db, 'claude-code')?.dns_enabled).toBe(false)
})

test('POST /agents/:id/dns of an unknown agent is a 404 echoing the id, before any DNS call', async () => {
  const res = await call('POST', '/agents/windsurf/dns', { enabled: true, sudoPassword: 'pw' })
  expect(res.status).toBe(404)
  expect((await json(res)).error.message).toBe('Unknown agent: windsurf')
  expect(calls).toEqual([])
})

test('POST /agents/:id/dns validates the body and the password before touching hosts', async () => {
  expect((await call('POST', '/agents/zed/dns', { enabled: 'yes' })).status).toBe(400)
  expect((await call('POST', '/agents/zed/dns', '{bad')).status).toBe(400)
  await expectMissingPassword(await call('POST', '/agents/zed/dns', { enabled: true, sudoPassword: '   ' }))
  expect(calls).toEqual([])
})

// ── reset ────────────────────────────────────────────────────────────────

test('POST /agents/:id/reset reverts that agent only', async () => {
  upsertAgentBridgeState(db, { agent_id: 'antigravity', dns_enabled: true, setup_completed: true })
  setMappings(db, 'antigravity', [{ source: 'gemini-pro', target: 'anthropic/claude-sonnet-4' }])
  syncAgentBridgeMappingsToMitmAlias(db, 'antigravity')
  expect(getMitmAlias(db, 'antigravity')).toEqual({ 'gemini-pro': 'anthropic/claude-sonnet-4' })
  upsertAgentBridgeState(db, { agent_id: 'cursor', dns_enabled: true, setup_completed: true })
  setMappings(db, 'cursor', [{ source: 'gpt-4o', target: 'openai/gpt-4o' }])
  hostsEntries.add('antigravity')
  const body = await json(await call('POST', '/agents/antigravity/reset', { sudoPassword: 'pw' }))
  expect(body).toEqual({
    ok: true,
    agent_id: 'antigravity',
    dns_enabled: false,
    mappingsCleared: true,
    verified: true,
    otherAgentsStillActive: true,
    restartRequired: true,
  })
  expect(calls).toEqual(['dns-remove:pw:antigravity', 'dns-flush'])
  expect(getAgentBridgeState(db, 'antigravity')).toMatchObject({ dns_enabled: false, setup_completed: false })
  expect(getMappingsForAgent(db, 'antigravity')).toEqual([])
  expect(getMitmAlias(db, 'antigravity')).toEqual({})
  expect(getAgentBridgeState(db, 'cursor')).toMatchObject({ dns_enabled: true, setup_completed: true })
  expect(getMappingsForAgent(db, 'cursor')).toHaveLength(1)
})

test('POST /agents/:id/reset: the last active agent leaves none active', async () => {
  upsertAgentBridgeState(db, { agent_id: 'antigravity', dns_enabled: true })
  const body = await json(await call('POST', '/agents/antigravity/reset', { sudoPassword: 'pw' }))
  expect(body.otherAgentsStillActive).toBe(false)
})

test('POST /agents/:id/reset reports verified false when the hosts entry survives', async () => {
  deps.dns.remove = async () => {}
  hostsEntries.add('kiro')
  expect((await json(await call('POST', '/agents/kiro/reset', { sudoPassword: 'pw' }))).verified).toBe(false)
})

test('POST /agents/:id/reset rejects an unknown agent, a bad body and no password before any mutation', async () => {
  upsertAgentBridgeState(db, { agent_id: 'zed', dns_enabled: true })
  expect((await call('POST', '/agents/windsurf/reset', { sudoPassword: 'pw' })).status).toBe(404)
  expect((await call('POST', '/agents/zed/reset', '{bad')).status).toBe(400)
  expect((await call('POST', '/agents/zed/reset', { sudoPassword: 5 })).status).toBe(400)
  await expectMissingPassword(await call('POST', '/agents/zed/reset', {}))
  expect(calls).toEqual([])
  expect(getAgentBridgeState(db, 'zed')?.dns_enabled).toBe(true)
})

// ── repair ───────────────────────────────────────────────────────────────

test('POST /repair runs the repair and caches the supplied password', async () => {
  expect(await json(await call('POST', '/repair', { sudoPassword: 'pw' }))).toEqual({ ok: true, repaired: ['dns'] })
  expect(calls).toEqual(['repair:pw'])
  expect(cachedPassword).toBe('pw')
})

test('POST /repair without a password or with a blank one never runs the repair', async () => {
  await expectMissingPassword(await call('POST', '/repair', {}))
  await expectMissingPassword(await call('POST', '/repair', { sudoPassword: '  ' }))
  expect(calls).toEqual([])
})

test('POST /repair with an empty body falls back to the cached password', async () => {
  cachedPassword = 'cached'
  await call('POST', '/repair')
  expect(calls).toEqual(['repair:cached'])
})

// ── diagnose ─────────────────────────────────────────────────────────────

test('GET /diagnose probes the port only while the server runs', async () => {
  const idle = await json(await call('GET', '/diagnose'))
  expect(idle.port).toBe(8443)
  expect(idle.healthy).toBe(false)
  expect(calls).toEqual([])
  running = true
  await call('GET', '/diagnose')
  expect(calls).toEqual(['probe:8443'])
})

test('GET /diagnose without agentId aggregates DNS over the agents that enabled it', async () => {
  upsertAgentBridgeState(db, { agent_id: 'cursor', dns_enabled: true })
  hostsEntries.add('cursor')
  const report = await json(await call('GET', '/diagnose'))
  expect(report.checks.find((c: { name: string }) => c.name === 'dns-configured').ok).toBe(true)
})

test('GET /diagnose?agentId= checks that agent only', async () => {
  hostsEntries.add('claude-code')
  const ok = await json(await call('GET', '/diagnose?agentId=claude-code'))
  expect(ok.checks.find((c: { name: string }) => c.name === 'dns-configured').ok).toBe(true)
  const other = await json(await call('GET', '/diagnose?agentId=zed'))
  expect(other.checks.find((c: { name: string }) => c.name === 'dns-configured').ok).toBe(false)
  expect((await call('GET', '/diagnose?agentId=windsurf')).status).toBe(404)
})

// ── upstream-ca ──────────────────────────────────────────────────────────

test('upstream-ca: POST stores and activates an existing file, GET returns it', async () => {
  expect(await json(await call('GET', '/upstream-ca'))).toEqual({ path: null })
  expect(await json(await call('POST', '/upstream-ca', { path: pemPath }))).toEqual({ ok: true, path: pemPath })
  expect(calls).toEqual([`store:${pemPath}`, `configure:${pemPath}`])
  expect(await json(await call('GET', '/upstream-ca'))).toEqual({ path: pemPath })
})

test('upstream-ca: POST of a missing file is a 400 and stores nothing', async () => {
  const res = await call('POST', '/upstream-ca', { path: path.join(fixtureDir, 'nope.pem') })
  expect(res.status).toBe(400)
  expect((await json(res)).error.message).toStartWith('Upstream CA file not found:')
  expect(calls).toEqual([])
})

test('upstream-ca: a CA that fails to activate is a 400', async () => {
  deps.upstreamCa.configure = () => {
    throw new Error('bad pem')
  }
  expect((await call('POST', '/upstream-ca', { path: pemPath })).status).toBe(400)
})

test('upstream-ca/test validates a PEM without storing or activating it', async () => {
  const res = await call('POST', '/upstream-ca/test', { path: pemPath })
  expect(res.status).toBe(200)
  const body = await json(res)
  expect(body).toMatchObject({ ok: true, path: pemPath })
  expect(body.subject).toContain('Route Test CA')
  expect(typeof body.validTo).toBe('string')
  expect(calls).toEqual([])
})

test('upstream-ca/test rejects a missing file, a non-PEM file and a bad body', async () => {
  expect((await call('POST', '/upstream-ca/test', { path: path.join(fixtureDir, 'nope.pem') })).status).toBe(400)
  const notPem = await call('POST', '/upstream-ca/test', { path: path.join(fixtureDir, 'not-a-cert.txt') })
  expect(notPem.status).toBe(400)
  expect((await json(notPem)).error.message).toContain('not a PEM certificate')
  expect((await call('POST', '/upstream-ca/test', {})).status).toBe(400)
  expect((await call('POST', '/upstream-ca/test', '{bad')).status).toBe(400)
})

// ── tproxy ───────────────────────────────────────────────────────────────

test('GET /tproxy reports the capture status', async () => {
  expect(await json(await call('GET', '/tproxy'))).toEqual({ running: false, available: false })
})

test('POST /tproxy starts with the defaults and the given password', async () => {
  const body = await json(await call('POST', '/tproxy', { sudoPassword: 'pw' }))
  expect(body).toEqual({ ok: true, status: { running: true, available: true, onPort: 8443 } })
  expect(calls).toEqual(['tproxy-start:443:8443:pw'])
})

test('POST /tproxy rejects an out-of-range config as invalid_request', async () => {
  const res = await call('POST', '/tproxy', { dport: 70000 })
  expect(res.status).toBe(400)
  const body = await json(res)
  expect(body.error.type).toBe('invalid_request')
  expect(body.error.message).toBe('Invalid TPROXY capture config')
  expect(calls).toEqual([])
})

test('POST /tproxy without the native addon is a sanitized 500', async () => {
  deps.tproxy.start = async () => {
    throw new Error('TPROXY capture mode requires the native addon (Linux + CAP_NET_ADMIN).')
  }
  const res = await call('POST', '/tproxy', {})
  expect(res.status).toBe(500)
})

test('DELETE /tproxy stops and returns the status', async () => {
  expect(await json(await call('DELETE', '/tproxy'))).toEqual({ ok: true, status: { running: false, available: true } })
})
