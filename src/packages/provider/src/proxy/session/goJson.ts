/**
 * Serialización JSON con las reglas de `encoding/json` de Go, para que un
 * hash calculado aquí coincida con el de CLIProxyAPI sobre la misma
 * entrada: las claves de un mapa van ordenadas por sus bytes UTF-8, `<`,
 * `>`, `&`, U+2028 y U+2029 se escapan, un sustituto suelto se escribe como
 * U+FFFD, `-0` conserva el signo y un campo `omitempty` vacío no se
 * escribe. Un `float64` se escribe como `JSON.stringify`: los dos eligen
 * los dígitos mínimos y pasan a exponente fuera de [1e-6, 1e21).
 */

/** Un campo de estructura: nombre JSON, valor y si se omite cuando está vacío. */
export type GoField = { name: string; value: unknown; omitEmpty?: boolean }

const ESCAPES: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
}

const LONE_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g

function goString(value: string): string {
  return JSON.stringify(value.replace(LONE_SURROGATE, '\ufffd')).replace(/[<>&\u2028\u2029]/g, character => ESCAPES[character]!)
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null || value === '' || value === false || value === 0) return true
  if (Array.isArray(value)) return value.length === 0
  return false
}

/** Una estructura: sus campos en el orden declarado. */
export function goStruct(fields: GoField[]): { __goStruct: GoField[] } {
  return { __goStruct: fields }
}

export function goMarshal(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') return goString(value)
  if (typeof value === 'number') return Object.is(value, -0) ? '-0' : JSON.stringify(value)
  if (typeof value === 'boolean') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(goMarshal).join(',')}]`
  if (typeof value === 'object') {
    const struct = (value as { __goStruct?: GoField[] }).__goStruct
    if (struct) {
      const parts = struct.filter(f => !(f.omitEmpty && isEmpty(f.value))).map(f => `${goString(f.name)}:${goMarshal(f.value)}`)
      return `{${parts.join(',')}}`
    }
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => Buffer.compare(Buffer.from(a), Buffer.from(b)))
    return `{${entries.map(([k, v]) => `${goString(k)}:${goMarshal(v)}`).join(',')}}`
  }
  return 'null'
}
