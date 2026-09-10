/**
 * Puerto de `ccnmt: packages/config/settings/schemaOutput.ts` (11 líneas
 * fuente). Adaptado en un punto, declarado abajo.
 *
 * DIVERGENCIA declarada: la fuente llama `SettingsSchema()` porque allí
 * `SettingsSchema` es un `lazySchema()` (una función que devuelve el
 * esquema). En `@thyrox/config/settings/types.ts` (ya portado por un agente
 * anterior) `SettingsSchema` es directamente el objeto Zod resuelto — se
 * usa sin los paréntesis de llamada. Mismo comportamiento observable.
 */
import { toJSONSchema } from 'zod/v4'
import { SettingsSchema } from './types.ts'

export function generateSettingsJSONSchema(): string {
  const jsonSchema = toJSONSchema(SettingsSchema, { unrepresentable: 'any' })
  // config ya no pasa por src/utils/slowOperations. El envoltorio
  // slowLogging alrededor de JSON.stringify es observabilidad que
  // pertenece a local-observability; para un volcado de esquema de una
  // sola vez no aporta nada.
  return JSON.stringify(jsonSchema, null, 2)
}
