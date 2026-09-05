import { describe, expect, test } from 'bun:test'
import {
  crossModelReads,
  dispatchReadCredits,
  routeReadCredits,
  type ReadCredit,
} from '../src/cost/crossModelRead.ts'
import { dispatchPlan } from '../src/cost/policy.ts'
import { routesForOtherModel } from '../src/cost/cacheRoutes.ts'
import type { AgentDefinition } from '../src/types.ts'
import { CATALOG, MODELS } from '../src/models.ts'

const def = (name: string, model?: string): AgentDefinition =>
  ({ name, description: 'x', prompt: 'p', ...(model ? { model } : {}) }) as AgentDefinition

describe('crossModelReads — el discriminador de la lectura cruzada', () => {
  test('un crédito con reader === writer no es cruzado; con reader !== writer sí', () => {
    const credits: ReadCredit[] = [
      { reader: 'claude-opus-5', writer: 'claude-opus-5', tokens: 100, label: 'ok' },
      { reader: 'claude-opus-5', writer: 'claude-sonnet-5', tokens: 100, label: 'cruzado' },
    ]
    const v = crossModelReads(credits)
    expect(v.length).toBe(1)
    expect(v[0]!.label).toBe('cruzado')
  })
})

describe('routeReadCredits — ninguna vía acredita una lectura cruzada', () => {
  // La superficie real: toda lectura de una vía se cobra al modelo que ESCRIBIÓ
  // esa caché. from ≠ to, así que si alguna vía cobrara una lectura del contexto
  // del origen a precio del destino, reader ≠ writer y saldría cruzada.
  test('sobre todos los pares del catálogo, 0 lecturas cruzadas', () => {
    const priced = CATALOG.models.filter((m) => m.pricing).map((m) => m.id)
    let pares = 0
    for (const from of priced) {
      for (const to of priced) {
        if (from === to) continue
        pares++
        const routes = routesForOtherModel({ from, to, contextTokens: 50_000, turnsOnTarget: 3, outputTokens: 500, subagentFloorTokens: 126_029 })
        expect(crossModelReads(routeReadCredits(routes)), `${from}->${to}`).toEqual([])
      }
    }
    expect(pares).toBeGreaterThan(0)
  })
})

describe('dispatchReadCredits — un grupo homogéneo no cruza; uno mixto sí', () => {
  test('el plan real agrupa por clave: cada agente relee la caché de SU modelo', () => {
    const agents = [def('a', 'claude-opus-5'), def('b', 'claude-opus-5'), def('c', 'claude-sonnet-5')]
    const plan = dispatchPlan(agents, 126_029)
    const credits = dispatchReadCredits(agents, plan, 126_029)
    expect(crossModelReads(credits)).toEqual([])
  })

  test('control: un grupo que mezcla modelos produce una lectura cruzada', () => {
    // Un plan MAL construido: dos modelos distintos en el mismo grupo (como si
    // dispatchPlan hubiera agrupado ignorando el modelo). El agente de sonnet
    // quedaría acreditado releyendo la caché de opus — imposible en la superficie
    // real. dispatchReadCredits lo mide contra promptCacheKey y lo marca.
    const agents = [def('a', 'claude-opus-5'), def('b', 'claude-sonnet-5')]
    const badPlan = {
      unitModel: 'claude-opus-5',
      groups: [{ key: 'claude-opus-5 · default · 5m', agents: ['a', 'b'], savingEquiv: 1, savingUsd: 1, }],
      totalSavingEquiv: 1, totalSavingUsd: 1, unpriced: [],
    }
    const v = crossModelReads(dispatchReadCredits(agents, badPlan as any, 126_029))
    expect(v.length).toBe(1)
    expect(v[0]!.reader).toBe('claude-sonnet-5')
    expect(v[0]!.writer).toBe('claude-opus-5')
  })
})
