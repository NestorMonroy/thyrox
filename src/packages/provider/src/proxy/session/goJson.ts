/**
 * Serialización JSON con las reglas de `encoding/json` de Go, para que un
 * hash calculado aquí coincida con el de CLIProxyAPI sobre la misma
 * entrada: las claves de un mapa van ordenadas, `<`, `>`, `&`, U+2028 y
 * U+2029 se escapan, y un campo `omitempty` vacío no se escribe.
 *
 * Ciega a: la forma exacta de un número que Go escribe distinto que
 * JavaScript (exponentes grandes); las entradas de este proxy no los usan
 * para identificar una sesión.
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

function goString(value: string): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, character => ESCAPES[character]!)
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
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(goMarshal).join(',')}]`
  if (typeof value === 'object') {
    const struct = (value as { __goStruct?: GoField[] }).__goStruct
    if (struct) {
      const parts = struct.filter(f => !(f.omitEmpty && isEmpty(f.value))).map(f => `${goString(f.name)}:${goMarshal(f.value)}`)
      return `{${parts.join(',')}}`
    }
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${goString(k)}:${goMarshal(v)}`).join(',')}}`
  }
  return 'null'
}
