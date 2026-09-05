import { describe, expect, test } from 'bun:test'
import { CACHE_BREAK_CAUSES, promptCacheKey, sharesPromptCache } from '../src/cost/cacheBreak.ts'
import {
  TASK_REQUIREMENTS,
  candidates,
  chooseCacheTtl,
  dispatchPlan,
  effortSwitchCost,
  recommend,
  switchCost,
  ttlBreakEvenExpiries,
} from '../src/cost/policy.ts'
import { MODELS, isModelId, usageCostUsd, usageEquivalentTokens } from '../src/models.ts'
import type { AgentDefinition } from '../src/types.ts'

// El control positivo es real: el contexto del último turno de la sesión del
// 2026-09-02 (508 503 tokens) y las cifras que `model_catalog.py sesion` publicó.
const CTX = 508_503

describe('switchCost — cambiar de modelo reescribe el contexto', () => {
  test('fable-5-1 → opus-5 con el contexto medido', () => {
    const c = switchCost('claude-fable-5-1', 'claude-opus-5', CTX)
    expect(c.rewriteUsd5m.toFixed(4)).toBe('3.1781')
    expect(c.rewriteUsd1h.toFixed(4)).toBe('5.0850')
    expect(c.readUsdFrom.toFixed(4)).toBe('0.1271')
    expect(Math.round(c.ratio1h)).toBe(40)
  })
  test('el esfuerzo reescribe igual: mismo origen y destino', () => {
    const c = effortSwitchCost('claude-sonnet-5', 1_000_000)
    expect(c.rewriteUsd5m).toBe(2.5)
    expect(c.readUsdFrom).toBe(0.2)
  })
  test('un modelo sin tier rehúsa, no devuelve 0', () => {
    expect(() => switchCost('claude-fable-5-1', 'claude-inexistente', 10)).toThrow(/sin tier/)
  })
})

describe('TTL — la prima de 1 h contra la caducidad de 5 m', () => {
  test('en todos los tiers del catálogo el umbral es 0.6 (1 h = 1.6× 5 m)', () => {
    for (const id of Object.keys(MODELS)) {
      if (!MODELS[id]?.pricing) continue
      expect(ttlBreakEvenExpiries(id).toFixed(2)).toBe('0.60')
    }
  })
  test('turnos seguidos → 5m; un hueco de 12 min → 1h; más de una hora → 5m', () => {
    expect(chooseCacheTtl('claude-fable-5-1', 1).ttl).toBe('5m')
    expect(chooseCacheTtl('claude-fable-5-1', 12).ttl).toBe('1h')
    expect(chooseCacheTtl('claude-fable-5-1', 90).ttl).toBe('5m')
  })
})

describe('recommend — evalúa los 19 registros del catálogo, no una lista a mano', () => {
  test('ningún requisito nombra un modelo: sólo rango y esfuerzo', () => {
    for (const r of Object.values(TASK_REQUIREMENTS)) {
      expect(typeof r.minAdvisorRank).toBe('number')
      expect(Object.keys(r).sort()).toEqual(['effort', 'minAdvisorRank'])
    }
  })
  test('cada modelo del catálogo aparece en ranked o en excluded, con su razón', () => {
    const { ranked, excluded } = candidates('mecanica', { contextTokens: 400_000 })
    const seen = [...ranked.map((c) => c.model), ...excluded.map((e) => e.model)].sort()
    expect(seen).toEqual(Object.keys(MODELS).sort())
    expect(excluded.find((e) => e.model === 'claude-haiku-4-5')?.why).toContain('ventana 200000 < 400000')
    expect(excluded.find((e) => e.model === 'claude-3-5-haiku')?.why).toContain('advisor_rank ausente')
  })
  test('mecánica con 400 k de contexto: el más barato por turno es sonnet-5, con su índice de esfuerzo', () => {
    const r = recommend('mecanica', { contextTokens: 400_000, outputTokens: 100 })
    expect(r.model).toBe('claude-sonnet-5')
    expect(r.effort).toBe('low')
    expect(r.effortIndex).toBe(0.47)
    // 400 000 × 0.2 / 1e6 + 100 × 10 / 1e6
    expect(r.usdPerTurn.toFixed(4)).toBe('0.0810')
    expect(r.ranked[1]?.model).toBe('claude-fable-5-1') // 0.25 de lectura, rango 5
  })
  test('mecánica con 100 k de contexto: entra haiku-4-5 y gana por lectura a 0.1', () => {
    const r = recommend('mecanica', { contextTokens: 100_000 })
    expect(r.model).toBe('claude-haiku-4-5')
    expect(r.ranked[0]!.effortApplies).toBe(false) // no declara effort: el nivel se ignora, y se dice
    expect(r.effortIndex).toBeNull()
  })
  test('frontera: rango 5; el empate fable-5-1 / mythos-5-1 lo rompe el alias', () => {
    const r = recommend('frontera', { contextTokens: 400_000 })
    expect(r.ranked.map((c) => c.model)).toEqual(['claude-fable-5-1', 'claude-mythos-5-1', 'claude-fable-5', 'claude-mythos-5'])
    expect(r.model).toBe('claude-fable-5-1')
    expect(r.ranked[0]!.reachableByAlias).toBe(true)
    expect(r.ranked[1]!.reachableByAlias).toBe(false)
  })
  test('adversarial: rango ≥ 4 — opus 4.7/4.8/5 a 0.5 y fable-5-1 a 0.25 por delante', () => {
    const r = recommend('adversarial', { contextTokens: 400_000 })
    expect(r.model).toBe('claude-fable-5-1')
    expect(r.ranked.every((c) => c.advisorRank >= 4)).toBe(true)
  })
  test('un perfil que ninguna ventana cubre rehúsa, no devuelve el primero', () => {
    expect(() => recommend('analisis', { contextTokens: 2_000_000 })).toThrow(/ningún modelo/)
  })
})

const base = (name: string, extra: Partial<AgentDefinition> = {}): AgentDefinition => ({
  name,
  description: 'x',
  prompt: 'x',
  model: 'claude-sonnet-5',
  effort: 'high',
  tools: ['Read', 'Grep'],
  ...extra,
})

describe('sharesPromptCache — la clave de caché por facetas', () => {
  test('la lista de causas es la de la referencia', () => {
    expect(CACHE_BREAK_CAUSES).toContain('effortChanged')
    expect(CACHE_BREAK_CAUSES).toContain('cacheControlChanged')
  })
  test('mismo agente y facetas → completo', () => {
    expect(sharesPromptCache(base('a'), base('a')).grado).toBe('completo')
  })
  test('otro nombre, mismas facetas → sólo el prefijo de herramientas', () => {
    const s = sharesPromptCache(base('a'), base('b', { tools: ['Grep', 'Read'] }))
    expect(s.grado).toBe('prefijo-de-herramientas')
    expect(s.diverge).toEqual(['systemPrompt'])
  })
  test('cambiar el esfuerzo o el TTL rompe la clave antes que el prompt', () => {
    expect(sharesPromptCache(base('a'), base('a', { effort: 'low' })).diverge).toEqual(['effort'])
    expect(sharesPromptCache(base('a'), base('a', { experimental: { cacheTtl: '1h' } })).diverge).toEqual(['cacheTtl'])
  })
  test('inherit se queda como inherit: no se inventa un modelo', () => {
    expect(promptCacheKey(base('a', { model: 'inherit' })).model).toBe('inherit')
  })
})

describe('dispatchPlan — juntos los que comparten clave', () => {
  test('agrupa por modelo·esfuerzo·TTL y valora el ahorro sobre el tramo compartido', () => {
    const plan = dispatchPlan(
      [base('a'), base('b'), base('c', { model: 'claude-opus-5' }), base('d', { model: 'inherit' })],
      126_029,
    )
    expect(plan.unpriced).toEqual(['d'])
    expect(plan.groups.map((g) => g.agents)).toEqual([['a', 'b'], ['c']])
    // (2−1) × 126 029 × (2.5 − 0.2) / 1e6
    expect(plan.groups[0]!.savingUsd.toFixed(4)).toBe('0.2899')
    expect(plan.groups[1]!.savingUsd).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Las tres unidades en las rutas de coste (#29)
// ---------------------------------------------------------------------------

/**
 * `policy.ts` calculaba sus rutas **sólo en USD**, que es la unidad de FACTURA:
 * depende de una tabla externa que cambia entre builds. La unidad primaria es
 * el **token equivalente** —coste comparable— y el USD se deriva de ella.
 *
 * Lo que estos casos fijan no es el número sino el **veredicto**: leer una ruta
 * en equivalentes o en USD tiene que dar el mismo orden y el mismo cociente. Si
 * difirieran, una de las dos unidades estaría ponderando algo que la otra no.
 *
 * Y hay una diferencia real con `compactionCost`, que se declara en vez de
 * esconderse: allí hay UN modelo y el equivalente cancela la tarifa; aquí se
 * comparan DOS o más, y la diferencia de precio entre ellos es justo lo que se
 * mide — no puede cancelarse. Lo que el equivalente aporta entonces es una
 * **vara declarada**, no independencia de la tarifa.
 */
describe('las tres unidades — el equivalente es primario, el USD se deriva', () => {
  test('switchCost publica los equivalentes y declara en qué vara se leen', () => {
    const c = switchCost('claude-fable-5-1', 'claude-opus-5', CTX)
    expect(c.unitModel).toBe('claude-fable-5-1')   // el origen, salvo que se pida otra
    // El equivalente del origen: contexto × (cache_read / input) del origen.
    expect(c.readEquivFrom).toBeCloseTo((CTX * 0.25) / 10, 6)
    // El del destino, en la MISMA vara: contexto × cache_write / input(vara).
    expect(c.rewriteEquiv5m).toBeCloseTo((CTX * 6.25) / 10, 6)
    expect(c.rewriteEquiv1h).toBeCloseTo((CTX * 10) / 10, 6)
  })

  test('CONTROL de invariancia — el ratio es el mismo en las dos unidades', () => {
    for (const [from, to] of [
      ['claude-fable-5-1', 'claude-opus-5'],
      ['claude-sonnet-5', 'claude-fable-5-1'],
      ['claude-haiku-4-5', 'claude-haiku-4-5'],
    ] as const) {
      const c = switchCost(from, to, CTX)
      expect(c.ratio5m).toBeCloseTo(c.rewriteUsd5m / c.readUsdFrom, 9)
      expect(c.ratio1h).toBeCloseTo(c.rewriteUsd1h / c.readUsdFrom, 9)
      expect(c.ratio5m).toBeCloseTo(c.rewriteEquiv5m / c.readEquivFrom, 9)
    }
  })

  test('cambiar la vara mueve los números y NO mueve el veredicto', () => {
    const a = switchCost('claude-fable-5-1', 'claude-opus-5', CTX)
    const b = switchCost('claude-fable-5-1', 'claude-opus-5', CTX, 'claude-haiku-4-5')
    expect(b.unitModel).toBe('claude-haiku-4-5')
    expect(b.readEquivFrom).not.toBeCloseTo(a.readEquivFrom, 0)
    expect(b.ratio5m).toBeCloseTo(a.ratio5m, 9)
    expect(b.rewriteUsd5m).toBeCloseTo(a.rewriteUsd5m, 9)   // el USD no depende de la vara
  })

  test('candidates: una sola vara para todos, y declarada', () => {
    const { unitModel, ranked } = candidates('mecanica', { contextTokens: 400_000 })
    expect(ranked.length).toBeGreaterThan(1)
    // La vara se DERIVA del catálogo (el token de entrada más barato entre los
    // que cumplen), no se escribe a mano.
    const masBarato = ranked
      .map((c) => [c.model, MODELS[c.model]!.pricing!.input] as const)
      .sort((x, y) => x[1] - y[1] || x[0].localeCompare(y[0]))[0]![0]
    expect(unitModel).toBe(masBarato)
  })

  test('CONTROL de invariancia — el orden en equivalentes es el del USD', () => {
    for (const kind of ['mecanica', 'analisis', 'adversarial', 'frontera'] as const) {
      const { ranked } = candidates(kind, { contextTokens: 400_000, outputTokens: 500 })
      const porEquiv = [...ranked].sort((a, b) => a.equivPerTurn - b.equivPerTurn).map((c) => c.model)
      const porUsd = [...ranked].sort((a, b) => a.usdPerTurn - b.usdPerTurn).map((c) => c.model)
      expect(porEquiv).toEqual(porUsd)
      expect(ranked.map((c) => c.model)).toEqual(porEquiv)
    }
  })

  test('CONTROL que discrimina — con la vara de CADA modelo el orden se INVIERTE', () => {
    // Sub-patrón D: el control de arriba tiene que poder fallar. Si cada
    // candidato se pesara con su propio tier —que es lo que hace
    // `usageEquivalentTokens` sin vara— el veredicto cambiaría, porque
    // `claude-fable-5-1` lee caché a 0.025 de su entrada y `claude-sonnet-5` a
    // 0.1. La vara única no es cosmética: sin ella el ranking miente.
    const lectura = { cache_read_tokens: 400_000 }
    const usdFable = usageCostUsd('claude-fable-5-1', lectura, '5m')
    const usdSonnet = usageCostUsd('claude-sonnet-5', lectura, '5m')
    const propioFable = usageEquivalentTokens('claude-fable-5-1', lectura, { cacheTtl: '5m' })
    const propioSonnet = usageEquivalentTokens('claude-sonnet-5', lectura, { cacheTtl: '5m' })
    expect(usdSonnet).toBeLessThan(usdFable)          // en la factura gana sonnet
    expect(propioFable).toBeLessThan(propioSonnet)    // con varas distintas gana fable
    // Con la vara única el orden vuelve a ser el del USD.
    const vara = { unit: 'claude-sonnet-5', cacheTtl: '5m' as const }
    expect(usageEquivalentTokens('claude-sonnet-5', lectura, vara))
      .toBeLessThan(usageEquivalentTokens('claude-fable-5-1', lectura, vara))
  })

  test('dispatchPlan: el ahorro se acumula en equivalentes y el USD se deriva', () => {
    const plan = dispatchPlan(
      [base('a'), base('b'), base('c', { model: 'claude-opus-5' })],
      126_029,
    )
    expect(plan.unitModel).toBe('claude-sonnet-5')   // el input más barato del plan
    const escalar = MODELS[plan.unitModel]!.pricing!.input / 1e6
    for (const g of plan.groups) {
      expect(g.savingUsd).toBeCloseTo(g.savingEquiv * escalar, 9)
    }
    expect(plan.totalSavingEquiv).toBeCloseTo(
      plan.groups.reduce((s, g) => s + g.savingEquiv, 0), 6)
    expect(plan.totalSavingUsd).toBeCloseTo(plan.totalSavingEquiv * escalar, 9)
  })
})
