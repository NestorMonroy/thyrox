/**
 * PROPIO de thyrox -- no es un porte. Decide si una `ConnectionRecord`
 * (`./connections.ts`) debe comprimir el `content` de sus tool_result vía
 * `@thyrox/context-compression` (`ContextOptions.compressToolResults` en
 * `@thyrox/agent/loop`).
 *
 * Por qué no viene de OmniRoute, aunque use su mismo patrón: en OmniRoute
 * la compresión es config GLOBAL de motor (`src/lib/db/compression.ts`,
 * `src/shared/validation/compressionConfigSchemas.ts`), no una opción por
 * conexión -- medido con `grep` antes de escribir este archivo, cero hits
 * de `compressToolResults` en ninguna tabla ni esquema por-conexión de esa
 * fuente. Lo que SÍ se reutiliza es el PATRÓN que `claudeExtraUsage.ts`
 * estableció: leer un booleano de `providerSpecificData`, con el mismo
 * criterio de tipo-o-se-descarta que esa familia de lecturas ya usa.
 */

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

/**
 * `providerSpecificData.compressToolResults === true` exactamente -- nunca
 * un valor truthy cualquiera (`1`, `"yes"`). Por defecto `false`, igual que
 * `ContextOptions.compressToolResults`: activar la compresión por conexión
 * no cambia el comportamiento de una conexión existente sin que alguien lo
 * pida.
 */
export function isCompressToolResultsEnabledForConnection(providerSpecificData: unknown): boolean {
  return asRecord(providerSpecificData).compressToolResults === true
}

/**
 * Limpieza de la clave antes de persistir: sobrevive sólo si es un booleano
 * real, igual que `blockExtraUsage` en `claudeExtraUsageNormalization.ts`.
 * El resto del registro pasa intacto -- esta función no sabe de ninguna
 * otra clave que `providerSpecificData` pueda llevar.
 */
export function normalizeCompressToolResultsField(value: unknown): JsonRecord | undefined {
  const record = asRecord(value)
  if (Object.keys(record).length === 0) return undefined

  const normalized: JsonRecord = { ...record }

  if ('compressToolResults' in normalized && typeof normalized.compressToolResults !== 'boolean') {
    delete normalized.compressToolResults
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined
}
