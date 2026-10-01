/**
 * Patrones que encuentran etiquetas de control escritas con letras parecidas
 * a las latinas (`ｓystem-reminder`, `аgent`) y encabezados entre corchetes
 * que imitan los que pone el harness (`[artifact … owned by you]`). Quien los
 * usa inserta una barra tras la apertura, y el modelo deja de leerlos como
 * marca de control.
 *
 * Porte de `Uq`, `lz`, `RYe`, `cu`, `Ofn`, `Hfn`, `mu`, `LLo`, `yJ`, `CYe` y
 * `RUr`, con `fu`, `nu`, `Mfn`, `j`, `Dfn`, `w`, `Y`, `J`, `Tu`, `Q`, `Lu`,
 * `y3n` y `sne` (`chunk-0grnxhq4.js`) de 2.1.283.
 */
import { LATIN_CONFUSABLES } from './confusableTables.ts'
import {
  ASSIGN_GAP_CHARS,
  COLON_CHARS,
  DASHES,
  EQUALS_CHARS,
  HYPHEN_LOOKALIKES,
  INTRA_NAME_FILLER,
  LINE_BREAK_LIKE,
  NAME_CHARS,
  SEPARATOR,
  TAG_CLASSES,
  atomicRun,
  buildTagScrubPattern,
  escapeTagOpenOrClose,
  normalizeTagLookalikes,
  tagPattern,
} from './tagClose.ts'
import { foldConfusables } from './tagFormScrub.ts'
import { escapeFormatCharacters, stripInvisibleFormatting, unicodeEscape } from './unicodeSanitize.ts'

/** `fu`. */
const LATIN_LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
/** `nu`. */
export const ANTML_TAG = 'antml'
/** `Mfn`: el corchete de apertura y sus parecidos. */
export const BRACKET_OPEN_CHARS = '\\[\\uff3b\\ufe47\\u27e6\\u301a\\u2045\\u298b\\u298d\\u298f\\u3010\\u3014\\ufe5d\\u3016\\u3018\\u2772\\u27ec\\ufe17\\ufe39\\ufe3b'
/** `j`: el corchete de cierre y sus parecidos. */
const BRACKET_CLOSE_CHARS = '\\]\\uff3d\\ufe48\\u27e7\\u301b\\u2046\\u298c\\u2990\\u298e\\u3011\\u3015\\ufe5e\\u3017\\u3019\\u2773\\u27ed\\ufe18\\ufe3a\\ufe3c'
/** `Dfn`: espacio horizontal, con los rellenos invisibles. */
export const HORIZONTAL_SPACE_CHARS = `\\t\\v\\f \\u00a0\\u1680\\u2000-\\u200a\\u202f\\u205f\\u3000\\u2800${INTRA_NAME_FILLER}`
/** `w`. */
const WORD_SPACE_CHARS = `\\r\\n${HORIZONTAL_SPACE_CHARS}`
/** `Y`: lo que puede unir dos palabras de un encabezado en lugar de un espacio. */
const WORD_JOINER_CHARS = `\\p{Pc}\\u2017.\\u00b7\\u0387\\u2022\\u2219\\u22c5\\u2024\\u2026\\u2027\\u30fb\\ufe52\\uff65\\uff0e/\\u2044\\u2215\\uff0f\\\\\\u2216\\ufe68\\uff3c|\\u00a6\\uff5c~\\u223c\\uff5e${COLON_CHARS};\\u037e\\ufe54\\uff1b`
/** `J`. */
const JOINER_CHARS = `${DASHES}${WORD_JOINER_CHARS}`
/** `Tu`: letras que no cierran un tramo libre. */
const SPAN_NON_FINAL_CHARS = '\\u30fc\\uff70\\u115f\\u1160\\u3164\\uffa0'
/** `Q`: cuántos unidores caben entre dos palabras. */
const MAX_JOINERS = 4
/** `Lu`: un tramo libre del encabezado, de hasta 120 caracteres, que termina en letra, número o cierre. */
const LEAD_SPAN_PATTERN = `[^${BRACKET_OPEN_CHARS}${BRACKET_CLOSE_CHARS}\\r\\n]{0,119}?(?:(?![${SPAN_NON_FINAL_CHARS}])[\\p{L}\\p{N}]|(?![${BRACKET_CLOSE_CHARS}])["')\\u2019\\u201d\\uff09\\p{Pe}\\p{Pf}])`
const HEX_DIGITS = `0-9\\uff10-\\uff19\\u{1d7ce}-\\u{1d7ff}\\u2070\\u00b9\\u00b2\\u00b3\\u2074-\\u2079\\u2080-\\u2089`
const WORD_END = '(?![0-9A-Za-z_])'

/** `y3n`: el encabezado lleva un identificador hexadecimal con guiones. */
export const LEAD_HEX_ID: unique symbol = Symbol('LEAD_HEX_ID')
/** `sne`: el encabezado lleva un tramo libre (un título, un nombre). */
export const LEAD_SPAN: unique symbol = Symbol('LEAD_SPAN')
export type LeadToken = string | typeof LEAD_HEX_ID | typeof LEAD_SPAN

/** Lo que `lz` ofrece a la cola de un patrón. */
export type TailParts = { name: string; close: string; colon: string }

/** `Uq`: la letra y sus parecidos, para una clase de caracteres. */
export function confusableLetterClass(letter: string): string {
  if (!/^[a-z]$/.test(letter)) throw Error('latinLetterConfusableClass: expected one ASCII lowercase letter')
  return LATIN_CONFUSABLES.get(letter) ?? letter
}

/** `lz`: la apertura de una de `tags`, con letras parecidas y rellenos; `tail` decide qué sigue al nombre. */
export function confusableTagScrubPattern(tags: readonly string[], tail?: (parts: TailParts) => string): RegExp {
  return buildTagScrubPattern({
    tags,
    closeOnly: false,
    fillerClass: `${TAG_CLASSES.filler}${[...LATIN_LOWERCASE].map(confusableLetterClass).join('')}`,
    spell: character => {
      if (/^[a-z]$/.test(character)) return `[${confusableLetterClass(character)}]`
      if (character === '-' || character === '_') return SEPARATOR
      if (/^[0-9]$/.test(character)) return character
      throw Error('confusableTagScrubPattern: tag names are lowercase [a-z0-9_-]')
    },
    tail: tail?.({ name: NAME_CHARS, close: TAG_CLASSES.close, colon: COLON_CHARS }),
  })
}

/** `RYe`: lo encontrado, seguido de la barra de escape. */
export function escapedOpener(match: string): string {
  return `${match}\\`
}

export type SourceAssignmentParts = {
  name: string
  close: string
  span?: (length: number) => string
  assign?: (attribute: string) => string
}

/** `cu`: tras el nombre, un atributo `source` asignado antes del cierre de la etiqueta. */
export function sourceAssignmentTail({
  name,
  close,
  span = length => `[^${close}]{0,${length}}`,
  assign = attribute => `${attribute}(?=(?<assignGap>[${ASSIGN_GAP_CHARS}]*))\\k<assignGap>[${EQUALS_CHARS}${HYPHEN_LOOKALIKES}]`,
}: SourceAssignmentParts): string {
  return `(?:(?![${name}])|(?<=[${LINE_BREAK_LIKE}][${INTRA_NAME_FILLER}]*))${span(120)}(?<![\\w-])${assign('source')}`
}

/** `Ofn`. */
export function channelSourceScrubPattern(): RegExp {
  return confusableTagScrubPattern(['channel'], sourceAssignmentTail)
}

/** `Hfn`: el prefijo de espacio de nombres seguido de dos puntos. */
export function antmlColonScrubPattern(): RegExp {
  return confusableTagScrubPattern([ANTML_TAG], ({ colon }) => `[${colon}]`)
}

/** `mu`: el hueco entre dos palabras, con hasta cuatro unidores; la captura `group` lo consume entero. */
function wordGap(group: number): string {
  const spaces = `[${WORD_SPACE_CHARS}]*`
  let joiners = ''
  for (let index = 0; index < MAX_JOINERS; index++) joiners = `(?:[${JOINER_CHARS}]${spaces}${joiners})?`
  return `(?=(${spaces}${joiners}))(?:\\${group})`
}

/** `LLo`: la apertura de un corchete que empieza uno de los encabezados de `leads`. */
export function bracketedLeadScrubPattern(leads: ReadonlyArray<readonly LeadToken[]>): RegExp {
  let group = 0
  const gap = () => wordGap(++group)
  const lineFiller = () => atomicRun(`\\r\\n${INTRA_NAME_FILLER}`, ++group)
  const wordSeparator = () => `(?=[${WORD_SPACE_CHARS}${JOINER_CHARS}])` + gap()
  const spanSeparator = () => `(?=[${WORD_JOINER_CHARS}]{0,${MAX_JOINERS}}[${WORD_SPACE_CHARS}${DASHES}])` + gap()
  const hexDigit = `${HEX_DIGITS}${[...'abcdef'].map(confusableLetterClass).join('')}`
  const word = (text: string) => {
    if (!/^[a-z]+$/.test(text)) throw Error('bracketedLeadScrubPattern: words are lowercase ASCII')
    return [...text].map((letter, index) => (index === 0 ? '' : lineFiller()) + `[${confusableLetterClass(letter)}]`).join('')
  }
  const hexRun = (length: number) =>
    Array.from({ length }, (_unused, index) => (index === 0 ? '' : lineFiller()) + `[${hexDigit}]`).join('') + lineFiller() + `[${DASHES}]`
  const hexId = () => hexRun(8) + gap() + hexRun(4) + gap() + hexRun(4)
  const leadGap = gap()
  const alternatives = leads.map(tokens => {
    const body = tokens
      .map((token, index) => {
        const separator = index === 0 ? '' : typeof token !== 'string' ? gap() : tokens[index - 1] === LEAD_SPAN ? spanSeparator() : wordSeparator()
        const content = token === LEAD_HEX_ID ? hexId() : token === LEAD_SPAN ? LEAD_SPAN_PATTERN : word(token) + (tokens[index + 1] === LEAD_SPAN ? WORD_END : '')
        return separator + content
      })
      .join('')
    return tokens.at(-1) === LEAD_HEX_ID ? body : `${body}${WORD_END}`
  })
  return new RegExp(`[${BRACKET_OPEN_CHARS}](?!\\\\)(?=${leadGap}(?:${alternatives.join('|')}))`, 'giu')
}

/** `CYe`. */
export function invisiblePattern(): RegExp {
  return TAG_CLASSES.invisiblePattern
}

/** `RUr`: formato e invisibles escritos como `\uXXXX`. */
export function escapeInvisibleCharacters(text: string): string {
  return escapeFormatCharacters(text).replace(invisiblePattern(), unicodeEscape)
}

/**
 * `yJ`: escapa la etiqueta `tag` en `text` tras retirar formato e invisibles y
 * normalizar los parecidos de `<`; si el texto trae letras parecidas, escapa
 * también cada apertura que, plegada, sería la etiqueta.
 */
export function neutralizeTag(tag: string, text: string): string {
  const escaped = escapeTagOpenOrClose(tag, normalizeTagLookalikes(stripInvisibleFormatting(text).replace(invisiblePattern(), '')))
  if (foldConfusables(escaped) === escaped) return escaped
  const pattern = tagPattern(tag, false)
  return escaped
    .split('<')
    .map((piece, index) => {
      if (index === 0 || piece.startsWith('\\')) return piece
      const folded = foldConfusables(piece)
      return folded !== piece && `< ${folded}`.search(pattern) === 0 ? `\\${piece}` : piece
    })
    .join('<')
}
