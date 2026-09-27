/**
 * Lectura de campos del cuerpo de una petición por ruta con puntos, con la
 * semántica que CLIProxyAPI obtiene de gjson (`Get(path).String()`): un
 * texto sale tal cual, un número o un booleano como texto, un objeto o una
 * lista como su JSON, y lo ausente o `null` como cadena vacía.
 *
 * Divergencia declarada: gjson devuelve el JSON crudo tal como venía
 * escrito; aquí se reserializa, así que los espacios de un objeto anidado
 * pueden diferir. No afecta a ningún id de sesión, que son textos.
 */
export type JsonValue = unknown
export type JsonObject = Record<string, unknown>

/** El cuerpo como objeto, desde texto o ya decodificado; `undefined` si no es JSON. */
export function parsePayload(payload: string | JsonObject | undefined): JsonValue {
  if (payload === undefined) return undefined
  if (typeof payload !== 'string') return payload
  if (payload.length === 0) return undefined
  try {
    return JSON.parse(payload)
  } catch {
    return undefined
  }
}

export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** `Get(path)`: el valor en la ruta, o `undefined`. */
export function getPath(root: JsonValue, path: string): JsonValue {
  let current: JsonValue = root
  for (const key of path.split('.')) {
    if (!isObject(current)) return undefined
    current = current[key]
  }
  return current
}

/** `.String()` de gjson. */
export function asText(value: JsonValue): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

export function textAt(root: JsonValue, path: string): string {
  return asText(getPath(root, path))
}
