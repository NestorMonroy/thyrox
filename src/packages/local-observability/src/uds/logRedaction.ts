/**
 * Lo que el buzón deja en el log cuando cita una línea que le llegó de otro
 * proceso: nada si menciona un token, y en otro caso el texto con las rachas
 * hexadecimales largas sustituidas por un resumen y cortado por longitud.
 *
 * Porte de `TB`, `Bf`, `se`, `Oe` y `pn` (`chunk-qcy58j4w.js`,
 * `chunk-xn8f4n02.js`) y de `Kr` (`chunk-vq0drrah.js`) de 2.1.283.
 */
import { createHash } from 'node:crypto'

/** `Oe`: una racha hex de 32 o más caracteres, que puede ser un secreto. */
const HEX_RUN = /[0-9a-f]{32,}/gi
const TOKEN_MENTION = /token/i
const FRAGMENT_MAX = 200
const TEXT_MAX = 120

/** `Kr`: los primeros `max` puntos de código de `text`. */
export function truncateCodePoints(text: string, max: number): string {
  if (text.length <= max) return text
  const kept: string[] = []
  for (const codePoint of text) {
    if (kept.length >= max) break
    kept.push(codePoint)
  }
  return kept.join('')
}

/** `se`/`pn`: cada racha hex larga, por `<hex:>` y los 12 primeros hex de su sha256. */
export function maskHexRuns(text: string): string {
  return text.replace(HEX_RUN, run => `<hex:${createHash('sha256').update(run).digest('hex').slice(0, 12)}>`)
}

/** `TB`: un fragmento de línea ajena, apto para el log. */
export function redactLogFragment(fragment: string): string {
  if (TOKEN_MENTION.test(fragment)) return '(redacted: fragment may carry an auth token)'
  return truncateCodePoints(maskHexRuns(fragment), FRAGMENT_MAX)
}

/** `Bf`: un texto ajeno corto (un tipo, una dirección), apto para el log. */
export function withholdTokenText(text: string, max: number = TEXT_MAX): string {
  if (TOKEN_MENTION.test(text)) return '(withheld)'
  return truncateCodePoints(maskHexRuns(text), max)
}
