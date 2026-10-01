/**
 * Conversión entre la fila de `provider_connections` (snake_case, booleanos
 * 0/1, columnas `_json`) y el registro camelCase que ve quien llama, y la
 * validación de los dos mapas por conexión que se guardan como JSON.
 *
 * Porte de `omniroute: src/lib/db/providers/columns.ts` y
 * `src/lib/db/caseMapping.ts` (MIT).
 */
export type JsonRecord = Record<string, unknown>

const BOOLEAN_CAMEL_COLUMNS = new Set(['isActive', 'rateLimitProtection', 'proxyEnabled', 'perKeyProxyEnabled', 'quotaVisible'])
const JSON_SUFFIX = 'Json'

function toCamelCase(name: string): string {
  return name.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

function parseJsonOr(text: string, fallback: unknown): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

/** Un nombre `_json` sale sin sufijo y ya decodificado; su NULL, como `null`. */
export function rowToCamel(row: JsonRecord): JsonRecord {
  const result: JsonRecord = {}
  for (const [column, value] of Object.entries(row)) {
    const key = toCamelCase(column)
    if (BOOLEAN_CAMEL_COLUMNS.has(key)) result[key] = value === 1 || value === true
    else if (key === 'providerSpecificData' && typeof value === 'string') result[key] = parseJsonOr(value, value)
    else if (key.endsWith(JSON_SUFFIX)) {
      const baseKey = key.slice(0, -JSON_SUFFIX.length)
      result[baseKey] = typeof value === 'string' ? parseJsonOr(value, null) : (value ?? null)
    } else result[key] = value
  }
  return result
}

export function cleanNulls(record: JsonRecord): JsonRecord {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== null && value !== undefined))
}

/**
 * La forma que devuelve el store: sin nulos, salvo `maxConcurrent` si la
 * fuente lo trae y los dos mapas por conexión, que salen siempre (su `null`
 * dice «sin límites propios», que no es lo mismo que «no se leyó»).
 */
export function presentConnection(source: JsonRecord): JsonRecord {
  const record = cleanNulls(source)
  if (Object.hasOwn(source, 'maxConcurrent')) {
    const value = source.maxConcurrent
    record.maxConcurrent = typeof value === 'number' || value === null ? value : record.maxConcurrent
  }
  record.quotaWindowThresholds = source.quotaWindowThresholds ?? null
  record.rateLimitOverrides = source.rateLimitOverrides ?? null
  return record
}

export function normalizeBooleanColumn(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === '1' || normalized === 'true') return true
    if (normalized === '0' || normalized === 'false') return false
  }
  return fallback
}

export interface SanitizeResult {
  sanitized: Record<string, number> | null
  rejected: string[]
}

type EntryCheck = (key: string, value: unknown) => boolean

function sanitizeNumberMap(value: unknown, accepts: EntryCheck): SanitizeResult {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return { sanitized: null, rejected: [] }
  }
  const rejected: string[] = []
  const map: Record<string, number> = {}
  for (const [key, entry] of Object.entries(value as JsonRecord)) {
    if (accepts(key, entry)) map[key] = entry as number
    else rejected.push(key)
  }
  return { sanitized: Object.keys(map).length === 0 ? null : map, rejected }
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

const RATE_LIMIT_OVERRIDE_KEYS = new Set(['rpm', 'rpd', 'tpm', 'tpd', 'minTime', 'maxConcurrent', 'maxWaitMs'])
const MAX_THRESHOLD_KEY_LENGTH = 64
const MAX_THRESHOLD_PERCENT = 100

/** Límites propios de la conexión: sólo las claves conocidas, con enteros no negativos. */
export function sanitizeRateLimitOverrides(value: unknown): SanitizeResult {
  return sanitizeNumberMap(value, (key, entry) => RATE_LIMIT_OVERRIDE_KEYS.has(key) && isNonNegativeInteger(entry))
}

/** Umbrales por ventana de cuota: porcentajes enteros de 0 a 100. */
export function sanitizeQuotaWindowThresholds(value: unknown): SanitizeResult {
  return sanitizeNumberMap(
    value,
    (key, entry) => key.length <= MAX_THRESHOLD_KEY_LENGTH && isNonNegativeInteger(entry) && entry <= MAX_THRESHOLD_PERCENT,
  )
}

/** Un mapa ya validado, como TEXT; cualquier otra cosa se guarda como NULL. */
export function serializeJsonField(value: unknown): string | null {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) return null
  return JSON.stringify(value)
}

export function toRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' ? (value as JsonRecord) : {}
}

export function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}
