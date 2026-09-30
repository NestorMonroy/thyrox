/**
 * Coste estimado de una petición interceptada, para la vista de detalle del
 * inspector. USD por millón de tokens, aproximado.
 *
 * Un modelo de Anthropic se tasa con el catálogo de `@thyrox/agent`, que sale
 * del ejecutable y sabe resolver un identificador con fecha
 * (`canonicalModelName`). La tabla de la referencia queda para lo que ese
 * catálogo no declara: los modelos de otros proveedores y `claude-3-opus`.
 * Su búsqueda es por subcadena sin distinguir mayúsculas, y el orden importa:
 * `gpt-4o-mini` va antes que `gpt-4o`.
 *
 * Porte de `omniroute: src/mitm/inspector/pricing.ts` (MIT).
 */
import { MODELS, canonicalModelName } from '@thyrox/agent/models'

export interface ModelPricing {
  inputPerMTok: number
  outputPerMTok: number
}

export const PRICING_TABLE: Record<string, ModelPricing> = {
  'gpt-4o-mini': { inputPerMTok: 0.15, outputPerMTok: 0.6 },
  'gpt-4o': { inputPerMTok: 2.5, outputPerMTok: 10.0 },
  'claude-3-opus': { inputPerMTok: 15.0, outputPerMTok: 75.0 },
  'gemini-2.0-flash': { inputPerMTok: 0.1, outputPerMTok: 0.4 },
  'gemini-1.5-flash': { inputPerMTok: 0.075, outputPerMTok: 0.3 },
  'gemini-1.5-pro': { inputPerMTok: 1.25, outputPerMTok: 5.0 },
  'deepseek-reasoner': { inputPerMTok: 0.55, outputPerMTok: 2.19 },
  'deepseek-chat': { inputPerMTok: 0.27, outputPerMTok: 1.1 },
}

function catalogPricing(model: string): ModelPricing | null {
  const pricing = MODELS[canonicalModelName(model)]?.pricing
  return pricing ? { inputPerMTok: pricing.input, outputPerMTok: pricing.output } : null
}

/** Precio del modelo: primero el catálogo, después la tabla. `null` sin coincidencia. */
export function lookupPricing(model: string | null): ModelPricing | null {
  if (!model) return null
  const fromCatalog = catalogPricing(model)
  if (fromCatalog) return fromCatalog
  const lower = model.toLowerCase()
  for (const [key, price] of Object.entries(PRICING_TABLE)) {
    if (lower.includes(key)) return price
  }
  return null
}

/**
 * Coste en USD de los tokens de entrada y salida. `null` si faltan los dos
 * conteos o el modelo no tiene precio.
 */
export function estimateCost(
  model: string | null,
  tokensIn: number | null,
  tokensOut: number | null,
): number | null {
  if (tokensIn == null && tokensOut == null) return null
  const price = lookupPricing(model)
  if (!price) return null
  const inCost = ((tokensIn ?? 0) / 1_000_000) * price.inputPerMTok
  const outCost = ((tokensOut ?? 0) / 1_000_000) * price.outputPerMTok
  return Number((inCost + outCost).toFixed(6))
}
