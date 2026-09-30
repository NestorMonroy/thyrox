/**
 * Mazo y ordenadores de destinos — contrato de OmniRoute `a58000c7`:
 * `src/shared/utils/secureRandom.ts`, `src/shared/utils/shuffleDeck.ts`,
 * `open-sse/services/combo/targetSorters.ts`.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import {
  fisherYatesShuffle,
  getNextFromDeck,
  getNextFromDeckSync,
  planNextFromDeckSync,
  resetAllDecks,
  secureRandomInt,
  setSecureRandomFloatSource,
} from '../src/proxy/shuffleDeck.js'
import {
  orderTargetsByPowerOfTwoChoices,
  orderTargetsForWeightedFallback,
  selectWeightedTarget,
  sortTargetsByCost,
  sortTargetsByUsage,
  type OrderableTarget,
} from '../src/proxy/targetSorters.js'

const seq = (...values: number[]) => {
  let i = 0
  return () => values[i++ % values.length]!
}

afterEach(() => {
  setSecureRandomFloatSource(null)
  resetAllDecks()
})

describe('secureRandomInt', () => {
  test('0 para n ≤ 1 o no finito', () => {
    expect(secureRandomInt(1)).toBe(0)
    expect(secureRandomInt(0)).toBe(0)
    expect(secureRandomInt(Number.NaN)).toBe(0)
  })
  test('con fuente de prueba escala y recorta a n-1', () => {
    setSecureRandomFloatSource(() => 0.9999999)
    expect(secureRandomInt(3)).toBe(2)
  })
})

describe('fisherYatesShuffle', () => {
  test('no muta y recorre de atrás hacia adelante', () => {
    setSecureRandomFloatSource(() => 0)
    const input = ['a', 'b', 'c']
    // i=2 j=0 → c b a ; i=1 j=0 → b c a
    expect(fisherYatesShuffle(input)).toEqual(['b', 'c', 'a'])
    expect(input).toEqual(['a', 'b', 'c'])
  })
})

describe('getNextFromDeckSync', () => {
  test('vacío y un solo elemento', () => {
    expect(getNextFromDeckSync('n', [])).toBe('')
    expect(getNextFromDeckSync('n', ['x'])).toBe('x')
  })
  test('cada id una vez por ciclo; el último no abre el siguiente', () => {
    // ciclo 1: 0,0 → [b,c,a]; ciclo 2: 0.9999,0.9999 → [a,b,c], cuya cabeza
    // repite el último (a) y fuerza el intercambio con 1+int(2)=1 → [b,a,c].
    setSecureRandomFloatSource(seq(0, 0, 0.9999, 0.9999, 0))
    const ids = ['a', 'b', 'c']
    const first = [0, 1, 2].map(() => getNextFromDeckSync('d', ids))
    expect(first).toEqual(['b', 'c', 'a'])
    expect(getNextFromDeckSync('d', ids)).toBe('b')
  })
  test('cambiar el conjunto reinicia el mazo', () => {
    setSecureRandomFloatSource(() => 0)
    getNextFromDeckSync('d', ['a', 'b'])
    expect(['a', 'b', 'c']).toContain(getNextFromDeckSync('d', ['a', 'b', 'c']))
  })
  test('los espacios de nombres son independientes', () => {
    setSecureRandomFloatSource(() => 0)
    expect(getNextFromDeckSync('x', ['a', 'b'])).toBe(getNextFromDeckSync('y', ['a', 'b']))
  })
})

describe('getNextFromDeck (con exclusión por espacio)', () => {
  test('peticiones concurrentes no repiten dentro del ciclo', async () => {
    const ids = ['a', 'b', 'c', 'd']
    const picks = await Promise.all(ids.map(() => getNextFromDeck('c', ids)))
    expect(new Set(picks).size).toBe(4)
  })
})

describe('planNextFromDeckSync', () => {
  test('no avanza hasta commit', () => {
    setSecureRandomFloatSource(() => 0)
    const ids = ['a', 'b', 'c']
    const first = getNextFromDeckSync('p', ids)
    const plan = planNextFromDeckSync('p', ids)
    expect(planNextFromDeckSync('p', ids).selectedId).toBe(plan.selectedId)
    plan.commit()
    const next = planNextFromDeckSync('p', ids).selectedId
    expect([first, plan.selectedId]).not.toContain(next)
  })
})

const t = (executionKey: string, extra: Partial<OrderableTarget> = {}): OrderableTarget => ({
  executionKey,
  modelStr: executionKey,
  provider: 'p',
  weight: 0,
  ...extra,
})

describe('selectWeightedTarget', () => {
  test('vacío da null; pesos cero eligen al azar uniforme', () => {
    expect(selectWeightedTarget([])).toBeNull()
    setSecureRandomFloatSource(() => 0.6)
    expect(selectWeightedTarget([t('a'), t('b')])?.executionKey).toBe('b')
  })
  test('resta pesos hasta quedar ≤ 0', () => {
    setSecureRandomFloatSource(() => 0.5)
    const picked = selectWeightedTarget([t('a', { weight: 1 }), t('b', { weight: 3 })])
    expect(picked?.executionKey).toBe('b')
  })
})

describe('orderTargetsForWeightedFallback', () => {
  const list = [t('a', { weight: 1 }), t('b', { weight: 5 }), t('c', { weight: 3 })]
  test('el elegido primero y el resto por peso descendente', () => {
    expect(orderTargetsForWeightedFallback(list, 'a').map(x => x.executionKey)).toEqual(['a', 'b', 'c'])
  })
  test('preserveExistingOrder conserva el orden del resto', () => {
    expect(orderTargetsForWeightedFallback(list, 'c', true).map(x => x.executionKey)).toEqual(['c', 'a', 'b'])
  })
  test('clave inexistente: sólo el resto ordenado', () => {
    expect(orderTargetsForWeightedFallback(list, 'z').map(x => x.executionKey)).toEqual(['b', 'c', 'a'])
  })
})

describe('sortTargetsByUsage', () => {
  test('sin métricas conserva el orden', () => {
    const list = [t('a'), t('b')]
    expect(sortTargetsByUsage(list, null)).toBe(list)
  })
  test('ordena por peticiones de cada executionKey; el desconocido cuenta 0', () => {
    const metrics = { byTarget: { a: { requests: 5 }, b: { requests: 2 } } }
    expect(sortTargetsByUsage([t('a'), t('b'), t('c')], metrics).map(x => x.executionKey)).toEqual(['c', 'b', 'a'])
  })
})

describe('orderTargetsByPowerOfTwoChoices', () => {
  test('con uno o ninguno devuelve la lista', () => {
    const one = [t('a')]
    expect(orderTargetsByPowerOfTwoChoices(one, null)).toBe(one)
  })
  test('de dos sorteados gana el de mejor puntuación y va primero', () => {
    setSecureRandomFloatSource(seq(0, 0))
    const metrics = { byModel: { a: { successRate: 50, avgLatencyMs: 1000 }, b: { successRate: 100, avgLatencyMs: 10 } } }
    expect(orderTargetsByPowerOfTwoChoices([t('a'), t('b'), t('c')], metrics).map(x => x.executionKey)).toEqual([
      'b', 'a', 'c',
    ])
  })
  test('un disyuntor OPEN nunca gana', () => {
    setSecureRandomFloatSource(seq(0, 0))
    const breaker = (provider: string) => (provider === 'q' ? 'OPEN' : undefined)
    const list = [t('a'), t('b', { provider: 'q' })]
    const metrics = { byModel: { b: { successRate: 100, avgLatencyMs: 10 } } }
    expect(orderTargetsByPowerOfTwoChoices(list, metrics, breaker)[0]!.executionKey).toBe('a')
  })
  test('empate: gana el primero sorteado', () => {
    setSecureRandomFloatSource(seq(0, 0))
    expect(orderTargetsByPowerOfTwoChoices([t('a'), t('b')], null)[0]!.executionKey).toBe('a')
  })
})

describe('sortTargetsByCost', () => {
  test('más barato primero; sin precio al final; modelos repetidos consumen su cola', async () => {
    const prices: Record<string, number | undefined> = { 'p/x': 3, 'p/y': 1 }
    const list = [t('k1', { modelStr: 'p/x' }), t('k2', { modelStr: 'p/z' }), t('k3', { modelStr: 'p/y' })]
    const out = await sortTargetsByCost(list, async m => prices[m])
    expect(out.map(x => x.executionKey)).toEqual(['k3', 'k1', 'k2'])
  })
  test('si la consulta de precios falla entera conserva el orden', async () => {
    const list = [t('a'), t('b')]
    const out = await sortTargetsByCost(list, () => {
      throw new Error('sin catálogo')
    })
    expect(out.map(x => x.executionKey)).toEqual(['a', 'b'])
  })
})
