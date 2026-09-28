/**
 * Retira o escapa caracteres que no se ven: sustitutos sueltos, formato,
 * uso privado y puntos sin asignar. Sirve a los patrones que neutralizan
 * etiquetas, que tienen que leer el texto tal como lo leerá el modelo.
 *
 * Porte de `sf`, `E`, `R8e` y `t6n` (`chunk-pbnxt79v.js`) y de `Mz`
 * (`chunk-vq0drrah.js`) de 2.1.283.
 */

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g
const MAX_PASSES = 10

/** `Mz`. */
export function stripLoneSurrogates(text: string): string {
  if (text.isWellFormed()) return text
  return text.replace(LONE_SURROGATE, '')
}

/** `E`: formato, uso privado y sin asignar, con los rangos conocidos repetidos por si la clase de propiedad falla. */
export function stripFormatCharacters(text: string): string {
  return text
    .replace(/[\p{Cf}\p{Co}\p{Cn}]/gu, '')
    .replace(/[​-‏]/g, '')
    .replace(/[‪-‮]/g, '')
    .replace(/[⁦-⁩]/g, '')
    .replace(/[﻿]/g, '')
    .replace(/[-]/g, '')
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

/** `t6n`: cada unidad UTF-16 como `\uXXXX`. */
export function unicodeEscape(text: string): string {
  return text
    .split('')
    .map(unit => `\\u${unit.charCodeAt(0).toString(16).padStart(4, '0')}`)
    .join('')
}

/** `R8e`. */
export function escapeFormatCharacters(text: string): string {
  return text.replace(/[\u007F-\u009F\u2028\u2029\p{Cf}]/gu, unicodeEscape)
}
