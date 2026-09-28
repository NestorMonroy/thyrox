/**
 * Operaciones sobre unidades UTF-16 que no dejan un carácter a medias: cortar
 * sin partir un par sustituto, retirar los sustitutos sueltos y colapsar los
 * controles de una línea.
 *
 * Porte de `re`, `f`, `Mz` y `fr` (`chunk-vq0drrah.js`) de 2.1.283.
 */

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g
/** `QJ`: controles C0 y C1 salvo los de espacio. */
const NON_SPACE_CONTROLS = /[\x00-\x08\x0E-\x1F\x7F-\x9F]/g

/** `re`: corta en `max` unidades sin partir un par sustituto. */
export function sliceUnits(text: string, max: number): string {
  if (max <= 0) return ''
  if (text.length <= max) return text
  const head = text.slice(0, max)
  const last = head.charCodeAt(max - 1)
  const whole = last >= 0xd800 && last <= 0xdbff ? head.slice(0, -1) : head
  return Buffer.from(whole, 'utf16le').toString('utf16le')
}

/** `Mz`: retira los sustitutos sueltos, que no forman un carácter. */
export function stripLoneSurrogates(text: string): string {
  if (text.isWellFormed()) return text
  return text.replace(LONE_SURROGATE, '')
}

/** `fr`: sin controles que no sean espacio, con los espacios colapsados. */
export function collapseControls(text: string): string {
  return text.replace(NON_SPACE_CONTROLS, '').replace(/\s+/g, ' ').trim()
}
