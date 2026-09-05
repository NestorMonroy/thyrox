/**
 * Coste por turno (T-031).
 *
 * El precio lo pone el catálogo de `@kaupamex/agent`, extraído del ejecutable
 * — aquí no se transcribe ninguna cifra. Lo que sí vive aquí es la **traducción
 * de nombres**, que es un seam real: el API llama `cache_read_input_tokens` a
 * lo que el catálogo y el store llaman `cache_read_tokens`. Un campo que no
 * casa no da error, da un cero — y un cero de precio se lee como gratis.
 *
 * Por eso un modelo fuera del catálogo devuelve `null` con su razón, nunca 0:
 * el silencio del instrumento no es una factura de cero.
 */
import { usageCostUsd, usageEquivalentTokens } from '@kaupamex/agent/models'
import type { Usage } from '../types.ts'
import { USAGE_CERO } from '../types.ts'

/**
 * Las **tres** unidades del consumo, que no se sustituyen entre sí:
 *
 * - `usage` (fuera de este tipo, en el turno) — tokens **crudos**: la unidad de
 *   CAPACIDAD, lo que cabe en la ventana. No se pondera, se cuenta.
 * - `equivalentTokens` — la unidad de COSTE COMPARABLE: pondera los cuatro
 *   componentes por los cocientes del tier, así que sobrevive a un cambio de
 *   tarifa. Es la que el store usa (`equiv_cost`).
 * - `usd` — la unidad de FACTURA: depende de una tabla de precios externa que
 *   cambia entre builds del ejecutable.
 *
 * Las dos calculadas van juntas o van las dos en `null`: publicar una y callar
 * la otra invita a leer «cuánto se facturó» como «cuánto consumió».
 */
export type TurnCost = { usd: number | null; equivalentTokens: number | null; reason?: string }

/** Los cuatro componentes con los nombres que el catálogo espera. */
function traducir(u: Usage) {
  return {
    input_tokens: u.input_tokens,
    output_tokens: u.output_tokens,
    cache_creation_tokens: u.cache_creation_input_tokens,
    cache_read_tokens: u.cache_read_input_tokens,
  }
}

export function turnCost(model: string, usage: Usage, cacheTtl: '5m' | '1h' = '1h'): TurnCost {
  try {
    return {
      usd: usageCostUsd(model, traducir(usage), cacheTtl),
      equivalentTokens: usageEquivalentTokens(model, traducir(usage), { cacheTtl }),
    }
  } catch (e) {
    return { usd: null, equivalentTokens: null, reason: (e as Error).message }
  }
}

export type CostReport = {
  turns: number
  usage: Usage
  usd: number | null
  /** El mismo consumo en la unidad que no depende de la tarifa. */
  equivalentTokens: number | null
  /** Qué fracción del gasto se fue en cada componente. Suma 1 cuando hay gasto. */
  share: { input: number; output: number; cache_creation: number; cache_read: number }
}

/** El agregado de una sesión, con el reparto por componente. */
export function costReport(model: string, turns: Usage[], cacheTtl: '5m' | '1h' = '1h'): CostReport {
  const usage: Usage = { ...USAGE_CERO }
  for (const u of turns) {
    usage.input_tokens += u.input_tokens
    usage.output_tokens += u.output_tokens
    usage.cache_creation_input_tokens += u.cache_creation_input_tokens
    usage.cache_read_input_tokens += u.cache_read_input_tokens
  }
  const total = turnCost(model, usage, cacheTtl)
  const parte = (campo: keyof Usage): number => {
    if (total.usd === null || total.usd === 0) return 0
    const solo = turnCost(model, { ...USAGE_CERO, [campo]: usage[campo] }, cacheTtl)
    return solo.usd === null ? 0 : solo.usd / total.usd
  }
  return {
    turns: turns.length,
    usage,
    usd: total.usd,
    equivalentTokens: total.equivalentTokens,
    share: {
      input: parte('input_tokens'),
      output: parte('output_tokens'),
      cache_creation: parte('cache_creation_input_tokens'),
      cache_read: parte('cache_read_input_tokens'),
    },
  }
}
