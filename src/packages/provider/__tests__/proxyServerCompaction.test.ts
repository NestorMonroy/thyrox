/**
 * La compresión previa del contexto cableada en el reenvío: cada upstream
 * recibe el cuerpo comprimido para la ventana de SU modelo, y el conteo de
 * tokens nunca se comprime, porque mide el cuerpo tal como es.
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
const turns = (n: number) => Array.from({ length: n }, (_, i) => [
  { role: 'user', content: `pregunta ${i}: ${'x'.repeat(400)}` },
  { role: 'assistant', content: `respuesta ${i}: ${'y'.repeat(400)}` },
]).flat()

function handler(contextCompaction: ProxyServerConfig['contextCompaction'], seen: ForwardRequest[], statuses: number[] = []) {
  return createProxyHandler({
    access: new AccessManager([createConfigApiKeyProvider([KEY])!]),
    routing: {
      upstreams: [{ name: 'small', provider: 'openai' }, { name: 'big', provider: 'openai' }],
      models: [{ id: 'mx', upstream_model: { small: 'mx-small', big: 'mx-big' } }],
      auto_include_builtin_models: false,
    },
    credentials: { small: [{ id: 's1' }], big: [{ id: 'b1' }] },
    selector: new FillFirstSelector(),
    forward: async r => {
      seen.push(r)
      return new Response('{}', { status: statuses.shift() ?? 200 })
    },
    contextCompaction,
  })
}

const post = (path: string, messages: unknown[]) =>
  new Request(`http://127.0.0.1${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'mx', messages }),
  })

const windows = { contextWindowOf: (_provider: string, model: string) => (model === 'mx-small' ? 4000 : 1_000_000) }

test('cada upstream recibe el cuerpo comprimido para la ventana de su modelo', async () => {
  const seen: ForwardRequest[] = []
  await handler(windows, seen, [503, 200])(post('/v1/messages', turns(60)))
  const [small, big] = seen.map(r => (r.body.messages as unknown[]).length)
  expect(small).toBeLessThan(120)
  expect(big).toBe(120)
  expect(seen[0]!.body.system).toBeDefined()
  expect(seen[1]!.body.system).toBeUndefined()
})

test('count_tokens mide el cuerpo sin comprimir', async () => {
  const seen: ForwardRequest[] = []
  await handler(windows, seen)(post('/v1/messages/count_tokens', turns(60)))
  expect((seen[0]!.body.messages as unknown[]).length).toBe(120)
})

test('sin configuración de compresión el cuerpo llega intacto', async () => {
  const seen: ForwardRequest[] = []
  await handler(undefined, seen)(post('/v1/messages', turns(60)))
  expect((seen[0]!.body.messages as unknown[]).length).toBe(120)
})
