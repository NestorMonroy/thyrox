/**
 * Los combos cableados en el reenvío: la entrada de modelo declara su
 * estrategia, el servidor ordena con ella los upstreams que sirven el modelo,
 * y el desenlace de cada petición alimenta la siguiente.
 */
import { expect, test } from 'bun:test'
import { AccessManager, createConfigApiKeyProvider } from '../src/proxy/access.ts'
import { ComboRouter } from '../src/proxy/combo/comboRouter.ts'
import { FillFirstSelector } from '../src/proxy/credentialSelectors.ts'
import type { ForwardRequest } from '../src/proxy/server.ts'
import type { GatewayModelEntry } from '../src/proxy/upstreamRouting.ts'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const { createProxyHandler } = (await import(
  process.env.PROXY_SERVER_MODULE ?? '../src/proxy/server.ts'
)) as typeof import('../src/proxy/server.ts')

const KEY = 'sk-local-test'

function handler(entry: Partial<GatewayModelEntry>, combos: ComboRouter | undefined, fail: string[] = []) {
  const used: string[] = []
  const h = createProxyHandler({
    access: new AccessManager([createConfigApiKeyProvider([KEY])!]),
    routing: {
      upstreams: [{ name: 'a', provider: 'openai' }, { name: 'b', provider: 'openai' }, { name: 'z', provider: 'openai' }],
      models: [{ id: 'mx', upstream_model: { a: 'mx-a', b: 'mx-b' }, ...entry }],
      auto_include_builtin_models: false,
    },
    credentials: { a: [{ id: 'a1' }], b: [{ id: 'b1' }], z: [{ id: 'z1' }] },
    selector: new FillFirstSelector(),
    forward: async (r: ForwardRequest) => {
      used.push(r.upstream.name)
      return new Response('{}', { status: fail.includes(r.upstream.name) ? 503 : 200 })
    },
    combos,
  })
  const send = () => h(new Request('http://127.0.0.1/v1/messages', {
    method: 'POST',
    headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'mx', messages: [] }),
  }))
  return { send, used }
}

test('round-robin reparte las peticiones entre los upstreams del modelo', async () => {
  const { send, used } = handler({ strategy: 'round-robin' }, new ComboRouter())
  await send()
  await send()
  await send()
  expect(used).toEqual(['a', 'b', 'a'])
})

test('lkgp empieza por el último upstream que respondió bien', async () => {
  const combos = new ComboRouter()
  const first = handler({ strategy: 'lkgp' }, combos, ['a'])
  await first.send()
  expect(first.used).toEqual(['a', 'b'])
  const second = handler({ strategy: 'lkgp' }, combos)
  await second.send()
  expect(second.used).toEqual(['b'])
})

test('el desenlace llega a las métricas del combo, con sus conmutaciones', async () => {
  const combos = new ComboRouter()
  await handler({ strategy: 'priority' }, combos, ['a']).send()
  expect(combos.metrics.get('mx')).toMatchObject({ totalRequests: 1, totalSuccesses: 1, totalFallbacks: 1, strategy: 'priority' })
  expect(combos.metrics.get('mx')!.byTarget.b).toMatchObject({ requests: 1, model: 'mx-b' })
})

test('si todos fallan, cuenta como fallo del último probado', async () => {
  const combos = new ComboRouter()
  await handler({ strategy: 'priority' }, combos, ['a', 'b']).send()
  expect(combos.metrics.get('mx')).toMatchObject({ totalRequests: 1, totalFailures: 1 })
  expect(combos.metrics.get('mx')!.byTarget.b).toMatchObject({ failures: 1 })
})

test('weighted usa los pesos declarados por upstream', async () => {
  const { send, used } = handler({ strategy: 'weighted', weights: { a: 0, b: 1 } }, new ComboRouter())
  await send()
  expect(used[0]).toBe('b')
})

test('sin router de combos la estrategia se ignora y rige el orden declarado', async () => {
  const { send, used } = handler({ strategy: 'round-robin' }, undefined)
  await send()
  await send()
  expect(used).toEqual(['a', 'a'])
})

test('una estrategia desconocida rige como el orden declarado y no cuenta como combo', async () => {
  const combos = new ComboRouter()
  const { send, used } = handler({ strategy: 'auto' }, combos)
  await send()
  await send()
  expect(used).toEqual(['a', 'a'])
  expect(combos.metrics.get('mx')).toBeNull()
})
