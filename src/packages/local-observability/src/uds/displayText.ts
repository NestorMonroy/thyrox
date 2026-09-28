/**
 * Texto de terceros listo para mostrarse en una línea, y argumentos listos para
 * un comando de shell. Porte de `an`, `lde`, `YC`, `y`, `p`, `XUt`, `b`, `N`
 * (`chunk-tp36n59y.js`) y `qr` (`chunk-0qxzxz5e.js`) de 2.1.283; `Mz`, `re`
 * y `Tn` vienen de `stringUnits.ts` y `unicodeSanitize.ts`.
 */
import { sliceUnits, stripLoneSurrogates } from './stringUnits.ts'
import { controlsToSpace } from './unicodeSanitize.ts'

const ANSI_SEQUENCE = /\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]|\x1b[\]PX^_][^\x1b\x07]*(?:\x07|\x1b\\)/g
const ANSI_STRIP_PASSES = 4
const STRAY_COMBINING_MARKS = /(?<![^\s\p{P}])\p{M}+/gu
const BACKTICK_LOOKALIKES = /[`｀ˋ`‵]/g
const DEFAULT_MAX_CHARS = 160

/** `y`: corta sin dejar a medias una secuencia de escape que el corte parta. */
function sliceBeforeEscape(text: string, max: number): string {
  const head = sliceUnits(text, max * 8)
  if (head.length === text.length) return head
  const partial = /\x1b(?:[\]PX^_][^\x1b\x07]*\x1b?|\[[\x30-\x3f]*[\x20-\x2f]*)$/.exec(head)
  if (partial === null) return head
  const rest = text.slice(partial.index)
  const complete = rest[1] === '['
    ? /^\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]/.test(rest)
    : /^\x1b[\]PX^_][^\x1b\x07]*(?:\x07|\x1b\\)/.test(rest)
  return complete ? head.slice(0, partial.index) : head
}

/** `XUt`: retira las secuencias ANSI, en pasadas acotadas. */
function stripAnsi(text: string): string {
  let current = text
  for (let pass = 0; pass < ANSI_STRIP_PASSES; pass++) {
    const next = current.replace(ANSI_SEQUENCE, '')
    if (next === current) break
    current = next
  }
  return current
}

/** `lde`: trunca con elipsis. */
function truncate(text: string, max: number): string {
  return text.length > max ? `${sliceUnits(text, max)}…` : text
}

/** `an`: una línea mostrable, sin escapes ni controles, en NFC y acotada. */
export function sanitizeForDisplay(text: string, max = DEFAULT_MAX_CHARS): string {
  const flat = controlsToSpace(stripAnsi(stripLoneSurrogates(sliceBeforeEscape(text, max)))).replace(/ {2,}/g, ' ').trim()
  return truncate(flat.normalize('NFC').replace(BACKTICK_LOOKALIKES, "'").replace(STRAY_COMBINING_MARKS, ''), max)
}

/** `qr`: cada argumento, citado sólo si hace falta. */
export function shellQuote(args: readonly unknown[]): string {
  return args.map(arg => {
    const text = String(arg)
    if (text === '') return "''"
    if (/^[A-Za-z0-9_./:=@+,-]+$/.test(text)) return text
    return `'${text.replaceAll("'", `'"'"'`)}'`
  }).join(' ')
}
