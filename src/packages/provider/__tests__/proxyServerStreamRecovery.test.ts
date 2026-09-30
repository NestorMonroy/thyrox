/**
 * La recuperación de stream cableada en el reenvío del proxy: un SSE del
 * upstream que se corta antes de que el cliente reciba un byte se reabre
 * contra el mismo upstream y la misma credencial. Es opcional y está apagada
 * por defecto, igual que en OmniRoute.
 */
import { expect, test } from 'bun:test'
import { AccessManager, createConfigApiKeyProvider } from '../src/proxy/access.ts'
import { FillFirstSelector } from '../src/proxy/credentialSelectors.ts'
import type { ForwardRequest, ProxyServerConfig } from '../src/proxy/server.ts'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const { createProxyHandler } = (await import(
  process.env.PROXY_SERVER_MODULE ?? '../src/proxy/server.ts'
)) as typeof import('../src/proxy/server.ts')

const KEY = 'sk-local-test'
const enc = new TextEncoder()
const START = 'event: message_start\ndata: {"type":"message_start"}\n\n'
const TEXT = 'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"hola"}}\n\n'
const STOP = 'event: message_stop\ndata: {"type":"message_stop"}\n\n'

/** Un SSE que emite `chunks` y luego cierra, o falla con un reinicio de conexión. */
function sse(chunks: string[], end: 'close' | 'reset'): Response {
  let i = 0
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) return controller.enqueue(enc.encode(chunks[i++]!))
      if (end === 'close') return controller.close()
      controller.error(Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }))
    },
  })
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

function handler(responses: Array<() => Response>, seen: ForwardRequest[], extra: Partial<ProxyServerConfig> = {}) {
  return createProxyHandler({
    access: new AccessManager([createConfigApiKeyProvider([KEY])!]),
    routing: { upstreams: [{ name: 'a', provider: 'anthropic' }, { name: 'b', provider: 'anthropic' }], models: [{ id: 'mx', upstream_model: { a: 'mx-a', b: 'mx-b' } }], auto_include_builtin_models: false },
    credentials: { a: [{ id: 'a1' }], b: [{ id: 'b1' }] },
    selector: new FillFirstSelector(),
    forward: async request => {
      seen.push(request)
      return responses[seen.length - 1]!()
    },
    ...extra,
  })
}

const post = () =>
  new Request('http://127.0.0.1/v1/messages', {
    method: 'POST',
    headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'mx', stream: true, messages: [{ role: 'user', content: 'hola' }] }),
  })

test('activada, un corte antes del primer byte reabre el mismo upstream con la misma credencial', async () => {
  const seen: ForwardRequest[] = []
  const r = await handler([() => sse([START], 'reset'), () => sse([START, TEXT, STOP], 'close')], seen, {
    streamRecovery: { enabled: true },
  })(post())
  expect(r.status).toBe(200)
  expect(await r.text()).toBe(START + TEXT + STOP)
  expect(seen.map(s => [s.upstream.name, s.credential.id])).toEqual([['a', 'a1'], ['a', 'a1']])
})

test('apagada por defecto: el corte llega al cliente y no se reabre', async () => {
  const seen: ForwardRequest[] = []
  const r = await handler([() => sse([START], 'reset'), () => sse([START, TEXT, STOP], 'close')], seen)(post())
  await expect(r.text()).rejects.toThrow()
  expect(seen).toHaveLength(1)
})

test('una respuesta que no es SSE no se envuelve', async () => {
  const seen: ForwardRequest[] = []
  const r = await handler([() => Response.json({ ok: true })], seen, { streamRecovery: { enabled: true } })(post())
  expect(await r.json()).toEqual({ ok: true })
  expect(seen).toHaveLength(1)
})

test('una reapertura que no devuelve 2xx suelta lo retenido y cierra', async () => {
  const seen: ForwardRequest[] = []
  const r = await handler([() => sse([START], 'reset'), () => new Response('boom', { status: 529 })], seen, {
    streamRecovery: { enabled: true, maxEarlyRetries: 1 },
  })(post())
  expect(await r.text()).toBe(START)
  expect(seen).toHaveLength(2)
})

test('un stream corto con message_stop no se reabre', async () => {
  const seen: ForwardRequest[] = []
  const r = await handler([() => sse([START, STOP], 'close')], seen, { streamRecovery: { enabled: true } })(post())
  expect(await r.text()).toBe(START + STOP)
  expect(seen).toHaveLength(1)
})
