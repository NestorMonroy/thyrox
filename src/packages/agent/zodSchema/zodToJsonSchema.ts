/**
 * Porte de `ccnmt: packages/agent/zodSchema/zodToJsonSchema.ts`.
 * Convierte schemas de Zod v4 a JSON Schema usando el `toJSONSchema`
 * nativo del paquete.
 */

import { toJSONSchema, type ZodTypeAny } from 'zod/v4'

export type JsonSchema7Type = Record<string, unknown>

// toolToAPISchema() corre esto para cada herramienta en cada request de
// API (~60-250 veces/turno). Los schemas de herramienta se envuelven con
// lazySchema(), que garantiza la misma referencia ZodTypeAny por sesión,
// así que se puede cachear por identidad.
const cache = new WeakMap<ZodTypeAny, JsonSchema7Type>()

/**
 * Convierte un schema de Zod v4 a formato JSON Schema.
 */
export function zodToJsonSchema(schema: ZodTypeAny): JsonSchema7Type {
  const hit = cache.get(schema)
  if (hit) return hit
  const result = toJSONSchema(schema) as JsonSchema7Type
  cache.set(schema, result)
  return result
}
