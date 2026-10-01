/**
 * Retira o escapa caracteres que no se ven —controles, formato, sustitutos
 * sueltos, uso privado, puntos sin asignar e ignorables— y reduce texto de
 * terceros a una línea mostrable. Lo usan los patrones que neutralizan
 * etiquetas, que tienen que leer el texto como lo leerá el modelo, y quien
 * muestra o registra texto ajeno.
 *
 * Porte de `chunk-pbnxt79v.js` entero (`wt`, `cde`, `YH`, `E`, `sf`, `Cy`,
 * `Njr`, `H_`, `wl`, `vUe`, `Tn`, `PJ`, `OJ`, `po`, `EUe`, `QE`, `eBt`,
 * `Egn`, `v6`, `R8e`, `t6n`) de 2.1.283. `Mz` y `fr` viven en
 * `stringUnits.ts` y se reexportan aquí.
 */
import { collapseControls, sliceUnits, stripLoneSurrogates } from './stringUnits.ts'

/** `s`: ignorables y el espacio braille, que no se ve. */
const IGNORABLE_CLASS = '\\p{Default_Ignorable_Code_Point}\\u2800'
/** `cde`: controles, formato, sustitutos, uso privado, no asignados e ignorables. */
export const CONTROL_CHAR_CLASS = `\\p{Cc}\\p{Cf}\\p{Cs}\\p{Co}\\p{Cn}\\u2028\\u2029${IGNORABLE_CLASS}`
/** `o`: los que unen o eligen la forma de un emoji. */
const EMOJI_JOINERS = '\\u200D\\uFE0E\\uFE0F'
const ALL_CONTROLS = new RegExp(`[${CONTROL_CHAR_CLASS}]+`, 'gu')
const CONTROLS_BUT_JOINERS = new RegExp(`(?:(?![${EMOJI_JOINERS}])[${CONTROL_CHAR_CLASS}])+`, 'gu')
const CONTROLS_BUT_JOINERS_AND_NEWLINES = new RegExp(`(?:(?![${EMOJI_JOINERS}\\n])[${CONTROL_CHAR_CLASS}])+`, 'gu')
const LEADING_JOINERS = new RegExp(`(?<!\\S)[${EMOJI_JOINERS}]+`, 'gu')
const SURROGATE = /\p{Cs}/gu
/** `l`: lo que `PJ` escribe como escape. */
const HIDDEN_CHARACTERS = new RegExp(`[\\p{Cf}\\p{Co}\\p{Cn}\\u2028\\u2029\\u007F-\\u009F${IGNORABLE_CLASS}]`, 'gu')
/** `f`. */
const IGNORABLE = /\p{Default_Ignorable_Code_Point}/gu
const MAX_PASSES = 10

export { collapseControls, stripLoneSurrogates }

/** `EUe`. */
export const MARKDOWN_LABEL_MAX_UNITS = 255
/** `eBt`. */
export const MARKDOWN_TEXT_MAX_UNITS = 2048
/** `Egn`: los caracteres con sentido en Markdown en línea. */
export const MARKDOWN_SENSITIVE_CHARS = /[`\[\]<>]/g

/** `wt`. */
export function stripAnsiEscapes(text: string): string {
  return Bun.stripANSI(text)
}

export type ReplaceControlsOptions = { keepNewlines?: boolean; keepEmojiJoiners?: boolean }

/**
 * `YH`: sin ANSI, y cada tramo de controles sustituido por `replacement`. Con
 * `keepEmojiJoiners` (o `keepNewlines`) los que unen un emoji se conservan,
 * salvo al principio de una palabra.
 */
export function replaceControls(text: string, replacement: string, options?: ReplaceControlsOptions): string {
  const keepJoiners = options?.keepNewlines === true || options?.keepEmojiJoiners === true
  const pattern = options?.keepNewlines ? CONTROLS_BUT_JOINERS_AND_NEWLINES : keepJoiners ? CONTROLS_BUT_JOINERS : ALL_CONTROLS
  const replaced = stripAnsiEscapes(text.replace(SURROGATE, '\u200b')).replace(pattern, replacement)
  return keepJoiners ? replaced.replace(LEADING_JOINERS, '') : replaced
}

/** `E`: formato, uso privado y sin asignar, con los rangos conocidos repetidos por si la clase de propiedad falla. */
export function stripFormatCharacters(text: string): string {
  return text
    .replace(/[\p{Cf}\p{Co}\p{Cn}]/gu, '')
    .replace(/[\u200B-\u200F]/g, '')
    .replace(/[\u202A-\u202E]/g, '')
    .replace(/[\u2066-\u2069]/g, '')
    .replace(/[\uFEFF]/g, '')
    .replace(/[\uE000-\uF8FF]/g, '')
}

/** `sf`: sin sustitutos sueltos y sin formato, repitiendo hasta que el texto no cambie. */
export function stripInvisibleFormatting(text: string): string {
  let current = stripLoneSurrogates(text)
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const next = stripFormatCharacters(current)
    if (next === current) return current
    current = next
  }
  return current
}

/** `Cy`: sin formato ni ignorables, con los espacios colapsados. */
export function stripIgnorables(text: string): string {
  return collapseControls(stripInvisibleFormatting(text).replace(IGNORABLE, ''))
}

/** `Njr`: NFKC y `sf` hasta un punto fijo; si no lo alcanza en diez pasadas, lanza. */
export function sanitizeUnicodeToFixedPoint(text: string): string {
  let current = text
  let previous = ''
  let passes = 0
  while (current !== previous && passes < MAX_PASSES) {
    previous = current
    current = stripInvisibleFormatting(current.normalize('NFKC'))
    passes++
  }
  if (passes >= MAX_PASSES) throw Error(`Unicode sanitization reached maximum iterations (${MAX_PASSES}) for input: ${text.slice(0, 100)}`)
  return current
}

/** `H_`: `Njr` sobre cada cadena, clave y valor de una estructura. */
export function sanitizeUnicodeDeep(value: string): string
export function sanitizeUnicodeDeep<T>(value: T): T
export function sanitizeUnicodeDeep(value: unknown): unknown {
  if (typeof value === 'string') return sanitizeUnicodeToFixedPoint(value)
  if (Array.isArray(value)) return value.map(sanitizeUnicodeDeep)
  if (value !== null && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) sanitized[sanitizeUnicodeToFixedPoint(key)] = sanitizeUnicodeDeep(item)
    return sanitized
  }
  return value
}

/** `t6n`: cada unidad UTF-16 como `\uXXXX`. */
export function unicodeEscape(text: string): string {
  return text
    .split('')
    .map(unit => `\\u${unit.charCodeAt(0).toString(16).padStart(4, '0')}`)
    .join('')
}

/** `vUe`: lo que no es ASCII imprimible, escrito como `\uXXXX`. */
export function escapeNonPrintableAscii(text: string): string {
  return text.replace(/[^\x20-\x7e]/g, unicodeEscape)
}

/** `wl`: como `vUe`, y un `\u` que ya viniera en el texto deja de leerse como escape. */
export function escapeForAsciiLog(text: string): string {
  return escapeNonPrintableAscii(text.replace(/\\(?=u[0-9a-fA-F]{4})/g, '\\u005c'))
}

/** `Tn`: los controles y separadores de línea pasan a espacio. */
export function controlsToSpace(text: string): string {
  return text.replace(/[\p{Cc}\p{Cf}\u2028\u2029]+/gu, ' ')
}

/** `PJ`: formato, C1, separadores de línea e ignorables escritos como `\uXXXX`. */
export function escapeHiddenCharacters(text: string): string {
  return text.replace(HIDDEN_CHARACTERS, character => unicodeEscape(character))
}

/** `R8e`. */
export function escapeFormatCharacters(text: string): string {
  return text.replace(/[\u007F-\u009F\u2028\u2029\p{Cf}]/gu, unicodeEscape)
}

/** `OJ`: sin ANSI ni sustitutos sueltos, y cada tramo de controles como un espacio. */
export function flattenControls(text: string): string {
  return stripLoneSurrogates(stripAnsiEscapes(text)).replace(ALL_CONTROLS, ' ')
}

export type SingleLineOptions = { drop?: RegExp; maxCodeUnits?: number }

/** `po`: una sola línea, con lo que `drop` retire, en `maxCodeUnits` unidades como mucho. */
export function toSingleLine(text: string, options?: SingleLineOptions): string {
  let line = flattenControls(text)
  if (options?.drop) line = line.replace(options.drop, '')
  line = line.replace(/\s+/g, ' ').trim()
  if (options?.maxCodeUnits !== undefined) line = sliceUnits(line, options.maxCodeUnits).trim()
  return line
}

/** Separa lo que Markdown leería como enlace, imagen o referencia. */
function breakLinkSyntax(text: string): string {
  return text.replace(/\]\(/g, '] (').replace(/!\[/g, '! [').replace(/\]\[/g, '] [').replace(/\]:/g, '] :')
}

/** `QE`: una etiqueta sin comillas invertidas ni ángulos, que Markdown no puede leer como enlace. */
export function sanitizeMarkdownLabel(text: string): string {
  return sliceUnits(breakLinkSyntax(toSingleLine(text, { drop: /[`<>]/g })), MARKDOWN_LABEL_MAX_UNITS).trim()
}

/** `v6`: como `QE`, conservando los ángulos pero separando cada `<` de lo que sigue. */
export function sanitizeMarkdownText(text: string): string {
  const flat = breakLinkSyntax(toSingleLine(text)).replace(/</g, '< ').replace(/\s+/g, ' ').trim()
  return sliceUnits(flat, MARKDOWN_TEXT_MAX_UNITS).trim()
}
