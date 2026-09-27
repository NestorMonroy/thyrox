/**
 * El orden de los destinos de un combo por su estrategia, y lo que cada
 * desenlace deja para la petición siguiente — el `applyStrategyOrdering` de
 * OmniRoute (`open-sse/services/combo/applyStrategyOrdering.ts`) con el
 * round-robin de `roundRobinCombo.ts`/`rrState.ts`, sobre los ordenadores de
 * `../src/proxy/targetSorters.ts`.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { ComboMetrics } from '../src/proxy/combo/comboMetrics.ts'
import { resetAllDecks, setSecureRandomFloatSource } from '../src/proxy/shuffleDeck.ts'
// Ruta sustituible para los controles de anulación en paralelo (`src/verify/annul_parallel.sh`).
const { ComboRouter, COMBO_STRATEGIES, isComboStrategy } = (await import(
  process.env.COMBO_ROUTER_MODULE ?? '../src/proxy/combo/comboRouter.ts'
)) as typeof import('../src/proxy/combo/comboRouter.ts')

afterEach(() => {
  setSecureRandomFloatSource(null)
  resetAllDecks()
})

const target = (key: string, extra: Partial<{ modelStr: string; provider: string; weight: number }> = {}) =>
  ({ executionKey: key, modelStr: extra.modelStr ?? `m-${key}`, provider: extra.provider ?? 'openai', weight: extra.weight ?? 0 })
const ABC = [target('a'), target('b'), target('c')]
const keys = (targets: { executionKey: string }[]) => targets.map(t => t.executionKey)

test('las estrategias conocidas, y ninguna más', () => {
  expect([...COMBO_STRATEGIES].sort()).toEqual(
    ['context-optimized', 'cost-optimized', 'fill-first', 'least-used', 'lkgp', 'p2c', 'priority', 'random', 'round-robin', 'strict-random', 'weighted'])
  expect(isComboStrategy('priority')).toBe(true)
  expect(isComboStrategy('quota-share')).toBe(false)
})

describe('orden', () => {
  test('priority y fill-first conservan el orden declarado', async () => {
    const router = new ComboRouter()
    expect(keys(await router.order('priority', 'c', ABC))).toEqual(['a', 'b', 'c'])
    expect(keys(await router.order('fill-first', 'c', ABC))).toEqual(['a', 'b', 'c'])
  })

  test('weighted pone primero al sorteado por peso y el resto por peso descendente', async () => {
    setSecureRandomFloatSource(() => 0.99)
    const targets = [target('a', { weight: 1 }), target('b', { weight: 5 }), target('c', { weight: 4 })]
    expect(keys(await new ComboRouter().order('weighted', 'c', targets))).toEqual(['c', 'b', 'a'])
  })

  test('random baraja todos los destinos', async () => {
    setSecureRandomFloatSource(() => 0)
    const order = keys(await new ComboRouter().order('random', 'c', ABC))
    // Con la fuente fija en 0, Fisher-Yates intercambia siempre con la primera posición.
    expect(order).toEqual(['b', 'c', 'a'])
  })

  test('strict-random reparte con una baraja: cada destino una vez por vuelta', async () => {
    const router = new ComboRouter()
    const firsts = new Set<string>()
    for (let i = 0; i < 3; i++) firsts.add((await router.order('strict-random', 'c', ABC))[0]!.executionKey)
    expect([...firsts].sort()).toEqual(['a', 'b', 'c'])
  })

  test('least-used pone primero al destino con menos peticiones del combo', async () => {
    const metrics = new ComboMetrics()
    const router = new ComboRouter({ metrics })
    for (const key of ['a', 'a', 'b']) metrics.record('c', `m-${key}`, { success: true, latencyMs: 1, target: { executionKey: key } })
    expect(keys(await router.order('least-used', 'c', ABC))).toEqual(['c', 'b', 'a'])
  })

  test('p2c elige entre dos por éxito y latencia del modelo', async () => {
    const metrics = new ComboMetrics()
    for (let i = 0; i < 4; i++) metrics.record('c', 'm-b', { success: true, latencyMs: 50 })
    for (let i = 0; i < 4; i++) metrics.record('c', 'm-a', { success: false, latencyMs: 5000 })
    const draws = [0, 0.99]
    setSecureRandomFloatSource(() => draws.shift() ?? 0)
    expect(keys(await new ComboRouter({ metrics }).order('p2c', 'c', [target('a'), target('b')]))).toEqual(['b', 'a'])
  })

  test('cost-optimized ordena por el precio de entrada inyectado; sin precio, al final', async () => {
    const price: Record<string, number> = { 'm-a': 3, 'm-c': 1 }
    const router = new ComboRouter({ inputPriceOf: model => price[model] })
    expect(keys(await router.order('cost-optimized', 'c', ABC))).toEqual(['c', 'a', 'b'])
  })

  test('context-optimized pone primero la ventana mayor; sin ventana conocida, el orden declarado', async () => {
    const windows: Record<string, number> = { 'm-a': 8000, 'm-b': 200_000 }
    const router = new ComboRouter({ contextWindowOf: (_p, model) => windows[model] })
    expect(keys(await router.order('context-optimized', 'c', ABC))).toEqual(['b', 'a', 'c'])
    expect(keys(await new ComboRouter().order('context-optimized', 'c', ABC))).toEqual(['a', 'b', 'c'])
  })

  test('lkgp adelanta al último destino que respondió bien', async () => {
    const router = new ComboRouter()
    expect(keys(await router.order('lkgp', 'c', ABC))).toEqual(['a', 'b', 'c'])
    router.recordOutcome('lkgp', 'c', ABC, ABC[2]!, { success: true, latencyMs: 1 })
    expect(keys(await router.order('lkgp', 'c', ABC))).toEqual(['c', 'a', 'b'])
    router.recordOutcome('lkgp', 'c', ABC, ABC[1]!, { success: false, latencyMs: 1 })
    expect(keys(await router.order('lkgp', 'c', ABC))).toEqual(['c', 'a', 'b'])
  })
})

describe('round-robin', () => {
  test('cada petición empieza en el destino siguiente', async () => {
    const router = new ComboRouter()
    const starts: string[] = []
    for (let i = 0; i < 4; i++) starts.push((await router.order('round-robin', 'c', ABC))[0]!.executionKey)
    expect(starts).toEqual(['a', 'b', 'c', 'a'])
  })

  test('la rotación sigue al destino que de verdad sirvió, no al programado', async () => {
    const router = new ComboRouter()
    await router.order('round-robin', 'c', ABC)
    router.recordOutcome('round-robin', 'c', ABC, ABC[2]!, { success: true, latencyMs: 1 })
    expect((await router.order('round-robin', 'c', ABC))[0]!.executionKey).toBe('a')
  })

  test('con lote pegajoso, un destino sirve N aciertos seguidos antes de rotar', async () => {
    const router = new ComboRouter({ stickyRoundRobinLimit: 2 })
    const served: string[] = []
    for (let i = 0; i < 5; i++) {
      const first = (await router.order('round-robin', 'c', ABC))[0]!
      served.push(first.executionKey)
      router.recordOutcome('round-robin', 'c', ABC, first, { success: true, latencyMs: 1 })
    }
    expect(served).toEqual(['a', 'a', 'b', 'b', 'c'])
  })

  test('con lote pegajoso, si sirvió otro destino que el programado, el lote sigue a ése', async () => {
    const router = new ComboRouter({ stickyRoundRobinLimit: 2 })
    await router.order('round-robin', 'c', ABC)
    router.recordOutcome('round-robin', 'c', ABC, ABC[1]!, { success: true, latencyMs: 1 })
    expect((await router.order('round-robin', 'c', ABC))[0]!.executionKey).toBe('b')
  })

  test('cada combo lleva su propia rotación', async () => {
    const router = new ComboRouter()
    await router.order('round-robin', 'x', ABC)
    expect((await router.order('round-robin', 'y', ABC))[0]!.executionKey).toBe('a')
  })
})

test('recordOutcome alimenta las métricas del combo con el destino que sirvió', () => {
  const metrics = new ComboMetrics()
  new ComboRouter({ metrics }).recordOutcome('least-used', 'c', ABC, ABC[1]!, { success: true, latencyMs: 40, fallbackCount: 1 })
  expect(metrics.get('c')).toMatchObject({ totalRequests: 1, totalFallbacks: 1, strategy: 'least-used' })
  expect(metrics.get('c')!.byTarget.b).toMatchObject({ requests: 1, model: 'm-b', provider: 'openai' })
})
