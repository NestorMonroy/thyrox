/**
 * El upstream `claude-cli` del proxy local, de extremo a extremo por
 * `startProxyServer` y con un doble de `claude -p` (`./fakeCliUpstream.ts`):
 * C5a (petición sin tools → texto), C5b (el puente devuelve el `tool_use`),
 * C5c (el `tool_result` reanuda la misma conversación; un mensaje nuevo
 * reanuda por `--resume`) y C5d (SSE).
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ALLOW_LOOPBACK_ENV } from '../netGuards.ts'
import { startProxyServer, type ProxyStartConfig, type RunningProxy } from '../startServer.ts'
import { createCliUpstreamForwarder, unexpectedToolUseMessage } from '../claudeCli/forwarder.ts'
import type { ForwardRequest } from '../server.ts'

const KEY = 'sk-local'
const FAKE = join(import.meta.dir, 'fakeCliUpstream.ts')

type Invocation = { phase: string; pid?: number; argv?: string[]; stdin?: string; inheritedBaseUrl?: boolean; names?: string[]; result?: unknown }

const cleanups: (() => Promise<void> | void)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

function logDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'claude-cli-'))
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

/** Si el proceso existe: la señal 0 no lo toca y falla con ESRCH cuando ya no está. */
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function invocations(dir: string): Invocation[] {
  const path = join(dir, 'invocations.jsonl')
  if (!existsSync(path)) return []
  return readFileSync(path, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line) as Invocation)
}

function proxyWith(dir: string, overrides: Partial<ProxyStartConfig> = {}, pendingResultTtlMs?: number): RunningProxy {
  const proxy = startProxyServer({
    host: '127.0.0.1',
    port: 0,
    accessKeys: [KEY],
    routing: {
      upstreams: [{ name: 'cli', provider: 'anthropic' }],
      models: [{ id: 'local-model', upstream_model: { cli: 'real-model' } }],
      auto_include_builtin_models: false,
    },
    endpoints: {},
    credentials: {},
    selector: 'round-robin',
    version: '0.1.0',
    env: { [ALLOW_LOOPBACK_ENV]: '1' },
    claudeCli: {
      upstreams: [{
        name: 'cli',
        command: { executable: process.execPath, prefixArgs: [FAKE] },
        env: { FAKE_CLAUDE_LOG: dir, ANTHROPIC_BASE_URL: 'http://127.0.0.1:1/el-propio-proxy' },
        pendingResultTtlMs,
      }],
    },
    ...overrides,
  })
  cleanups.push(() => proxy.stop())
  return proxy
}

function send(proxy: RunningProxy, body: unknown, path = '/v1/messages'): Promise<Response> {
  return fetch(`${proxy.url}${path}`, {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Una petición ya enrutada, como la que `createProxyHandler` entrega al reenviador. */
function directRequest(body: Record<string, unknown>): ForwardRequest {
  return {
    upstream: { name: 'cli', provider: 'anthropic' }, upstreamModel: 'real-model', credential: { id: 'claude-cli:cli' },
    path: '/v1/messages', search: '', body, headers: new Headers(), signal: new AbortController().signal, requestId: 'req-1',
  }
}

const LS_TOOL = { name: 'ls', description: 'lista', input_schema: { type: 'object', properties: { path: { type: 'string' } } } }

describe('C5a: una petición sin tools vuelve como texto', () => {
  test('responde el mensaje del asistente con el modelo del cable, end_turn y el uso; el hijo recibe la línea medida', async () => {
    const dir = logDir()
    const proxy = proxyWith(dir)
    const response = await send(proxy, { model: 'local-model', max_tokens: 8, system: 'eres breve', messages: [{ role: 'user', content: 'hola' }] })
    expect(response.status).toBe(200)
    const body = await response.json() as Record<string, unknown>
    expect(body).toMatchObject({ type: 'message', role: 'assistant', model: 'real-model', stop_reason: 'end_turn', id: 'msg_fake', usage: { input_tokens: 11, output_tokens: 7 } })
    expect(body.content).toEqual([{ type: 'text', text: 'eco: hola' }])
    const [start] = invocations(dir)
    expect(start?.phase).toBe('start')
    const argv = start?.argv ?? []
    expect(argv.slice(0, 2)).toEqual(['-p', '--verbose'])
    expect(argv[argv.indexOf('--session-id') + 1]).toMatch(/^[0-9a-f-]{36}$/)
    expect(argv[argv.indexOf('--model') + 1]).toBe('real-model')
    expect(argv[argv.indexOf('--system-prompt') + 1]).toBe('eres breve')
    expect(argv[argv.indexOf('--tools') + 1]).toBe('')
    expect(argv).not.toContain('--mcp-config')
    expect(JSON.parse(start?.stdin?.trim() ?? '{}')).toEqual({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'hola' }] } })
    expect(start?.inheritedBaseUrl).toBe(false)
  })

  test('un hijo que muere sin result es un 502 con su stderr, y el proxy pasa al siguiente upstream', async () => {
    const dir = logDir()
    const served: string[] = []
    const http = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: async request => { served.push(await request.text()); return Response.json({ type: 'message', content: [] }) } })
    cleanups.push(() => http.stop(true))
    const proxy = proxyWith(dir, {
      routing: {
        upstreams: [{ name: 'cli', provider: 'anthropic' }, { name: 'up', provider: 'anthropic' }],
        models: [{ id: 'local-model', upstream_model: { cli: 'real-model', up: 'real-model' } }],
        auto_include_builtin_models: false,
      },
      endpoints: { up: { baseUrl: `http://127.0.0.1:${http.port}` } },
      credentials: { up: [{ id: 'k1', attributes: { api_key: 'sk-up' } }] },
    })
    const response = await send(proxy, { model: 'local-model', messages: [{ role: 'user', content: 'FALLA' }] })
    expect(response.status).toBe(200)
    expect(served).toHaveLength(1)
    const alone = proxyWith(dir)
    const failed = await send(alone, { model: 'local-model', messages: [{ role: 'user', content: 'FALLA' }] })
    expect(failed.status).toBe(502)
  })

  test('llamado directo, el reenviador nombra la causa del hijo que murió: su stderr', async () => {
    const dir = logDir()
    const forwarder = createCliUpstreamForwarder({
      next: async () => new Response('no'),
      upstreams: { cli: { name: 'cli', command: { executable: process.execPath, prefixArgs: [FAKE] }, env: { FAKE_CLAUDE_LOG: dir } } },
      bridgeUrlOf: token => `http://127.0.0.1:1/claude-cli/bridge/${token}`,
    })
    cleanups.push(() => forwarder.stop())
    const response = await forwarder.forward(directRequest({ model: 'real-model', messages: [{ role: 'user', content: 'FALLA' }] }))
    expect(response.status).toBe(502)
    const message = ((await response.json()) as { error: { message: string } }).error.message
    expect(message).toContain('salió con código 1')
    expect(message).toContain('falla simulada')
  })

  test('count_tokens no lo sirve claude -p: 501', async () => {
    const proxy = proxyWith(logDir())
    const response = await send(proxy, { model: 'local-model', messages: [{ role: 'user', content: 'hola' }] }, '/v1/messages/count_tokens')
    expect(response.status).toBe(501)
  })
})

describe('C5b y C5c: el puente devuelve el tool_use y el tool_result reanuda la conversación', () => {
  test('la primera petición se detiene en tool_use; la segunda entrega el resultado al mismo proceso; la tercera reanuda por --resume', async () => {
    const dir = logDir()
    const proxy = proxyWith(dir)
    const first = await send(proxy, { model: 'local-model', tools: [LS_TOOL], messages: [{ role: 'user', content: 'TOOL' }] })
    expect(first.status).toBe(200)
    const firstBody = await first.json() as { content: Record<string, unknown>[]; stop_reason: string }
    expect(firstBody.stop_reason).toBe('tool_use')
    expect(firstBody.content).toEqual([{ type: 'text', text: 'voy a listar' }, { type: 'tool_use', id: 'toolu_fake_1', name: 'ls', input: { path: '.' } }])
    expect(invocations(dir).map(i => i.phase)).toEqual(['start', 'tools_listed'])
    expect(invocations(dir)[1]?.names).toEqual(['ls'])

    const history = [
      { role: 'user', content: 'TOOL' },
      { role: 'assistant', content: firstBody.content },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_fake_1', content: 'a.txt' }] },
    ]
    const second = await send(proxy, { model: 'local-model', tools: [LS_TOOL], messages: history })
    expect(second.status).toBe(200)
    const secondBody = await second.json() as { content: unknown; stop_reason: string }
    expect(secondBody.stop_reason).toBe('end_turn')
    expect(secondBody.content).toEqual([{ type: 'text', text: 'resultado: a.txt' }])
    const phases = invocations(dir)
    expect(phases.map(i => i.phase)).toEqual(['start', 'tools_listed', 'tool_result_received'])
    expect(phases[2]?.result).toEqual({ content: [{ type: 'text', text: 'a.txt' }], isError: false })

    const third = await send(proxy, { model: 'local-model', tools: [LS_TOOL], messages: [...history, { role: 'assistant', content: secondBody.content }, { role: 'user', content: 'sigue' }] })
    expect(third.status).toBe(200)
    expect(((await third.json()) as { content: unknown }).content).toEqual([{ type: 'text', text: 'reanudado: sigue' }])
    const starts = invocations(dir).filter(i => i.phase === 'start')
    expect(starts).toHaveLength(2)
    const sessionId = starts[0]?.argv?.[starts[0].argv.indexOf('--session-id') + 1]
    expect(starts[1]?.argv?.[starts[1].argv.indexOf('--resume') + 1]).toBe(sessionId)
    expect(starts[1]?.argv).not.toContain('--session-id')
    expect(JSON.parse(starts[1]?.stdin?.trim() ?? '{}')).toEqual({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'sigue' }] } })
  })

  test('un tool_result de una conversación que el proxy no tiene es un 400 que lo dice', async () => {
    const proxy = proxyWith(logDir())
    const response = await send(proxy, {
      model: 'local-model', tools: [LS_TOOL],
      messages: [{ role: 'user', content: 'x' }, { role: 'assistant', content: [{ type: 'tool_use', id: 'toolu_ajeno', name: 'ls', input: {} }] }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_ajeno', content: 'y' }] }],
    })
    expect(response.status).toBe(400)
    expect(((await response.json()) as { error: { message: string } }).error.message).toContain('toolu_ajeno')
  })

  test('un tool_result que el turno vivo no espera es un 400 que nombra lo que sí espera, sin entregar nada a claude', async () => {
    const dir = logDir()
    const proxy = proxyWith(dir)
    const first = await send(proxy, { model: 'local-model', tools: [LS_TOOL], messages: [{ role: 'user', content: 'TOOL' }] })
    const firstBody = await first.json() as { content: Record<string, unknown>[] }
    const prefix = [{ role: 'user', content: 'TOOL' }, { role: 'assistant', content: firstBody.content }]
    const mixed = await send(proxy, {
      model: 'local-model', tools: [LS_TOOL],
      messages: [...prefix, { role: 'user', content: [
        { type: 'tool_result', tool_use_id: 'toolu_fake_1', content: 'a.txt' },
        { type: 'tool_result', tool_use_id: 'toolu_intruso', content: 'b.txt' },
      ] }],
    })
    expect(mixed.status).toBe(400)
    const message = ((await mixed.json()) as { error: { message: string } }).error.message
    expect(message).toContain('toolu_intruso')
    expect(message).toContain('espera: toolu_fake_1')
    expect(invocations(dir).some(i => i.phase === 'tool_result_received')).toBe(false)

    const retried = await send(proxy, {
      model: 'local-model', tools: [LS_TOOL],
      messages: [...prefix, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_fake_1', content: 'a.txt' }] }],
    })
    expect(retried.status).toBe(200)
    expect(((await retried.json()) as { content: unknown }).content).toEqual([{ type: 'text', text: 'resultado: a.txt' }])
  })

  test('el mensaje del tool_use inesperado dice cuando el turno no espera ninguno', () => {
    expect(unexpectedToolUseMessage('toolu_x', [])).toBe('ninguna llamada suspendida espera el tool_use toolu_x; el turno vivo no espera ninguno')
    expect(unexpectedToolUseMessage('toolu_x', ['toolu_a', 'toolu_b'])).toBe('ninguna llamada suspendida espera el tool_use toolu_x; el turno vivo espera: toolu_a, toolu_b')
  })

  test('si el cliente no vuelve antes del plazo, el proceso suspendido termina y el tool_result tardío es 400', async () => {
    const dir = logDir()
    const proxy = proxyWith(dir, {}, 150)
    const first = await send(proxy, { model: 'local-model', tools: [LS_TOOL], messages: [{ role: 'user', content: 'TOOL' }] })
    expect(first.status).toBe(200)
    const pid = invocations(dir)[0]?.pid as number
    expect(isAlive(pid)).toBe(true)
    const deadline = Date.now() + 3_000
    while (Date.now() < deadline && isAlive(pid)) await Bun.sleep(20)
    expect(isAlive(pid)).toBe(false)
    expect(invocations(dir).some(i => i.phase === 'tool_result_received')).toBe(false)
    const late = await send(proxy, {
      model: 'local-model', tools: [LS_TOOL],
      messages: [{ role: 'user', content: 'TOOL' }, { role: 'assistant', content: [{ type: 'tool_use', id: 'toolu_fake_1', name: 'ls', input: { path: '.' } }] }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_fake_1', content: 'tarde' }] }],
    })
    expect(late.status).toBe(400)
  })
})

describe('C5d: stream', () => {
  test('con stream: true la respuesta es SSE con la forma del API de Mensajes y el stop_reason del turno', async () => {
    const proxy = proxyWith(logDir())
    const response = await send(proxy, { model: 'local-model', stream: true, messages: [{ role: 'user', content: 'hola' }] })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/event-stream')
    const text = await response.text()
    const events = text.split('\n\n').filter(Boolean).map(chunk => chunk.split('\n').find(l => l.startsWith('event: '))?.slice(7))
    expect(events).toEqual(['message_start', 'content_block_start', 'content_block_delta', 'content_block_stop', 'message_delta', 'message_stop'])
    expect(text).toContain('"text":"eco: hola"')
    expect(text).toContain('"stop_reason":"end_turn"')
  })
})
