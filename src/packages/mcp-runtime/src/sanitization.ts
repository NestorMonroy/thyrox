/**
 * Saneado Unicode de lo que entra por MCP: normalización NFKC y retirada de
 * formato, uso privado, puntos sin asignar y sustitutos sueltos hasta un
 * punto fijo, para que un servidor no pueda esconder instrucciones en
 * caracteres invisibles para el usuario (etiquetas Unicode, controles de
 * dirección). La implementación es `Njr`/`H_` de `chunk-pbnxt79v.js`, en
 * `@thyrox/local-observability`.
 */
import {
  sanitizeUnicodeDeep,
  sanitizeUnicodeToFixedPoint,
} from '@thyrox/local-observability/uds/unicodeSanitize.js'

export function partiallySanitizeUnicode(prompt: string): string {
  return sanitizeUnicodeToFixedPoint(prompt)
}

export function recursivelySanitizeUnicode(value: string): string
export function recursivelySanitizeUnicode<T>(value: T[]): T[]
export function recursivelySanitizeUnicode<T extends object>(value: T): T
export function recursivelySanitizeUnicode<T>(value: T): T
export function recursivelySanitizeUnicode(value: unknown): unknown {
  return sanitizeUnicodeDeep(value)
}
