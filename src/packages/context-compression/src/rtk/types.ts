/**
 * Contratos de RTK -- porte nativo del esquema de filtro de OmniRoute
 * (`open-sse/services/compression/engines/rtk/filterSchema.ts`, MIT),
 * recortado al subconjunto que este pase porta completo. NO se portan (aqui
 * no hay campo para ellos, a proposito): compatibilidad TOML
 * (`rtkTomlHeadLines`/`rtkTomlTailLines`/`rtkTomlMaxLines`,
 * `sourceFormat`), `replace` (sustitucion por regex) ni `matchOutput`
 * (mensaje de resumen que corta-circuita el filtro entero) -- ver el
 * docstring de `package.json` para el resto de lo deferido.
 */

/** Un filtro RTK: como reconocerlo y como recortar su salida. */
export interface RtkFilter {
  id: string
  label: string
  category: string
  /** Cuando dos detectores empatan en confianza, gana el de mayor prioridad. */
  priority: number
  match: {
    /** Contra el COMANDO detectado (p. ej. `git status`), no contra la salida. */
    commands: RegExp[]
    /** Contra la SALIDA cruda, cuando el comando no se pudo extraer o no basta. */
    patterns: RegExp[]
  }
  /** Lineas que sobreviven siempre, si al menos una linea matchea alguno. */
  includePatterns: RegExp[]
  /** Lineas que se descartan (a menos que las salve `includePatterns`). */
  dropPatterns: RegExp[]
  /** Lineas que matchean se deduplican entre si (se queda la primera). */
  collapsePatterns: RegExp[]
  /** Ademas de `collapsePatterns`, deduplica lineas EXACTAS consecutivas. */
  deduplicate: boolean
  /** Tope duro de lineas tras el filtrado, antes del truncado inteligente. */
  maxLines: number
  /** Lineas que `smartTruncate` conserva siempre al principio. */
  headLines: number
  /** Lineas que `smartTruncate` conserva siempre al final. */
  tailLines: number
  /** Lineas de en medio que matchean esto se conservan aunque exceda el tope. */
  errorPatterns: RegExp[]
  /** Que devolver si el filtrado deja el texto vacio (por defecto, vacio). */
  onEmpty?: string
  /** Muestra de verificacion embebida -- control positivo, no fabricado. */
  tests: Array<{ name: string; command?: string; input: string; expected: string }>
}

export interface LineFilterResult {
  text: string
  linesRemoved: number
  rulesApplied: string[]
}

export interface CommandDetectionResult {
  /** El id del tipo detectado (p. ej. `'git-status'`), o `null` si ninguno matcheo. */
  type: string | null
  command: string | null
  confidence: number
}
