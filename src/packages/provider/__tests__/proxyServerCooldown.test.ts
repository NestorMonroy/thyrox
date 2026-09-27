/**
 * El enfriamiento por credencial cableado en el reenvío del proxy: un fallo
 * escribe en la credencial lo que `CredentialCooldown` decide, el selector la
 * salta mientras dura, y un acierto la devuelve.
 */
import { expect, test } from 'bun:test'
import { AccessManager, createConfigApiKeyProvider } from '../src/proxy/access.ts'
import { FillFirstSelector, type ProxyCredential } from '../src/proxy/credentialSelectors.ts'
import { CredentialCooldown } from '../src/proxy/resilience/credentialCooldown.ts'
import type { ForwardRequest } from '../src/proxy/server.ts'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const { createProxyHandler } = (await import(
  process.env.PROXY_SERVER_MODULE ?? '../src/proxy/server.ts'
)) as typeof import('../src/proxy/server.ts')

const KEY = 'sk-local-test'
const DAY_MS = 24 * 60 * 60 * 1000

function handler(credentials: ProxyCredential[], cooldown: CredentialCooldown | undefined, forward: (r: ForwardRequest) => Promise<Response>) {
  return createProxyHandler({
    access: new AccessManager([createConfigApiKeyProvider([KEY])!]),
    routing: { upstreams: [{ name: 'a', provider: 'openai' }], models: [{ id: 'mx', upstream_model: { a: 'mx-a' } }], auto_include_builtin_models: false },
    credentials: { a: credentials },
    selector: new FillFirstSelector(),
    forward,
    cooldown,
  })
}

const post = () =>
  new Request('http://127.0.0.1/v1/messages', {
    method: 'POST',
    headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'mx', messages: [] }),
  })

test('un 429 enfría la credencial y la siguiente petición va a otra', async () => {
  const credentials: ProxyCredential[] = [{ id: 'a1' }, { id: 'a2' }]
  const used: string[] = []
  const h = handler(credentials, new CredentialCooldown(), async r => {
    used.push(r.credential.id)
    return r.credential.id === 'a1' ? new Response('Rate limit hit', { status: 429 }) : Response.json({ ok: true })
  })
  await h(post())
  const second = await h(post())
  expect(second.status).toBe(200)
  expect(used).toEqual(['a1', 'a2'])
  expect(credentials[0]!.unavailable).toBe(true)
})

test('el cuerpo de un 4xx llega a la decisión: una baja es definitiva', async () => {
  const credentials: ProxyCredential[] = [{ id: 'a1' }]
  await handler(credentials, new CredentialCooldown(), async () => new Response('account has been deactivated', { status: 401 }))(post())
  expect(credentials[0]!.nextRetryAfter!.getTime() - Date.now()).toBeGreaterThan(300 * DAY_MS)
})

test('un 5xx enfría sin leer el cuerpo', async () => {
  const credentials: ProxyCredential[] = [{ id: 'a1' }]
  const never = new ReadableStream<Uint8Array>({ start() {} })
  const r = await handler(credentials, new CredentialCooldown(), async () => new Response(never, { status: 503 }))(post())
  expect(r.status).toBe(502)
  expect(credentials[0]!.unavailable).toBe(true)
})

test('un acierto devuelve la credencial cuyo enfriamiento venció', async () => {
  const credentials: ProxyCredential[] = [{ id: 'a1', unavailable: true, nextRetryAfter: new Date(Date.now() - 1) }]
  await handler(credentials, new CredentialCooldown(), async () => Response.json({ ok: true }))(post())
  expect(credentials[0]!.unavailable).toBe(false)
  expect(credentials[0]!.nextRetryAfter).toBeUndefined()
})

test('un reenvío que lanza no enfría: no hubo respuesta del upstream que juzgar', async () => {
  const credentials: ProxyCredential[] = [{ id: 'a1' }]
  await handler(credentials, new CredentialCooldown(), async () => { throw new Error('connect ECONNREFUSED') })(post())
  expect(credentials[0]!.unavailable).toBeUndefined()
})

test('sin capa de enfriamiento, un fallo no toca la credencial', async () => {
  const credentials: ProxyCredential[] = [{ id: 'a1' }]
  await handler(credentials, undefined, async () => new Response('Rate limit hit', { status: 429 }))(post())
  expect(credentials[0]!.unavailable).toBeUndefined()
})
