/**
 * Los límites adaptativos cableados en el reenvío del proxy: cada petición a
 * una credencial protegida pasa por su limitador, y lo que el upstream
 * responde —cabeceras y cuerpo de un 4xx— le enseña su ritmo.
 */
import { expect, test } from 'bun:test'
import { AccessManager, createConfigApiKeyProvider } from '../src/proxy/access.ts'
import { FillFirstSelector } from '../src/proxy/credentialSelectors.ts'
import { RateLimitManager } from '../src/proxy/resilience/rateLimitManager.ts'
import type { ForwardRequest } from '../src/proxy/server.ts'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const { createProxyHandler } = (await import(
  process.env.PROXY_SERVER_MODULE ?? '../src/proxy/server.ts'
)) as typeof import('../src/proxy/server.ts')

const KEY = 'sk-local-test'
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

function handler(rateLimit: RateLimitManager | undefined, forward: (r: ForwardRequest) => Promise<Response>) {
  return createProxyHandler({
    access: new AccessManager([createConfigApiKeyProvider([KEY])!]),
    routing: { upstreams: [{ name: 'a', provider: 'openai' }], models: [{ id: 'mx', upstream_model: { a: 'mx-a' } }], auto_include_builtin_models: false },
    credentials: { a: [{ id: 'a1' }] },
    selector: new FillFirstSelector(),
    forward,
    rateLimit,
  })
}

const post = () =>
  new Request('http://127.0.0.1/v1/messages', {
    method: 'POST',
    headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'mx', messages: [] }),
  })

test('una credencial protegida reenvía de a una cuando la cola lo pide', async () => {
  const manager = new RateLimitManager({ concurrentRequests: 1 })
  manager.enable('a1')
  let inFlight = 0
  let peak = 0
  const h = handler(manager, async () => {
    inFlight += 1
    peak = Math.max(peak, inFlight)
    await wait(30)
    inFlight -= 1
    return Response.json({ ok: true })
  })
  await Promise.all([h(post()), h(post()), h(post())])
  expect(peak).toBe(1)
})

test('las cabeceras de la respuesta enseñan el ritmo al limitador', async () => {
  const manager = new RateLimitManager()
  manager.enable('a1')
  await handler(manager, async () => Response.json({ ok: true }, {
    headers: { 'x-ratelimit-limit-requests': '100', 'x-ratelimit-remaining-requests': '5', 'x-ratelimit-reset-requests': '30s' },
  }))(post())
  expect(manager.settingsOf('openai', 'a1')).toMatchObject({ reservoir: 5, reservoirRefreshAmount: 100 })
})

test('el tope que un 429 escribe en su cuerpo se aprende, y el cliente recibe el cuerpo entero', async () => {
  const manager = new RateLimitManager()
  manager.enable('a1')
  const body = JSON.stringify({ error: { message: 'Maximum 5 requests within 1 minutes', type: 'rate_limit_error' } })
  const r = await handler(manager, async () => new Response(body, { status: 429 }))(post())
  expect(r.status).toBe(429)
  expect(await r.text()).toBe(body)
  expect(manager.learnedLimits()['openai:a1']).toMatchObject({ capRequests: 5, capWindowMs: 60_000 })
})

test('un 5xx no se lee: su cuerpo puede no terminar nunca', async () => {
  const manager = new RateLimitManager()
  manager.enable('a1')
  const never = new ReadableStream<Uint8Array>({ start() {} })
  const r = await handler(manager, async () => new Response(never, { status: 503 }))(post())
  expect(r.status).toBe(502)
})

test('sin gestor, el reenvío no se limita', async () => {
  let inFlight = 0
  let peak = 0
  const h = handler(undefined, async () => {
    inFlight += 1
    peak = Math.max(peak, inFlight)
    await wait(20)
    inFlight -= 1
    return Response.json({ ok: true })
  })
  await Promise.all([h(post()), h(post())])
  expect(peak).toBe(2)
})
