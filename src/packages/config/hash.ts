/**
 * Puerto de `ccnmt: packages/config/hash.ts` (46 líneas fuente).
 * Reimplementación fiel VERBATIM — sólo built-ins de Node/Bun.
 */

/**
 * Hash djb2 de una cadena — hash no-criptográfico rápido, devuelve un
 * entero de 32 bits con signo. Determinista entre runtimes (a diferencia de
 * `Bun.hash`, que usa wyhash). Se usa como fallback cuando `Bun.hash` no
 * está disponible, o cuando hace falta una salida estable en disco (p. ej.
 * nombres de directorio de caché que deben sobrevivir a una actualización
 * del runtime).
 */
export function djb2Hash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return hash
}

/**
 * Hash de contenido arbitrario para detección de cambios. `Bun.hash` es
 * ~100x más rápido que sha256 y suficientemente resistente a colisiones
 * para detección de diffs (no es seguro criptográficamente).
 */
export function hashContent(content: string): string {
  if (typeof Bun !== 'undefined') {
    return Bun.hash(content).toString()
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('node:crypto') as typeof import('node:crypto')
  return crypto.createHash('sha256').update(content).digest('hex')
}

/**
 * Hash de dos cadenas sin asignar una cadena concatenada temporal. La ruta
 * Bun encadena semillas de wyhash (`hash(a)` alimenta como semilla a
 * `hash(b)`); la ruta Node usa SHA-256 incremental. El encadenado de
 * semillas desambigua naturalmente ("ts","code") de ("tsc","ode"), así que
 * bajo Bun no hace falta separador.
 */
export function hashPair(a: string, b: string): string {
  if (typeof Bun !== 'undefined') {
    return Bun.hash(b, Bun.hash(a)).toString()
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('node:crypto') as typeof import('node:crypto')
  return crypto
    .createHash('sha256')
    .update(a)
    .update('\0')
    .update(b)
    .digest('hex')
}
