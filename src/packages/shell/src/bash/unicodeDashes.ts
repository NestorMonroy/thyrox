/**
 * Normalizador de guiones Unicode a guion ASCII.
 *
 * Porte fiel de `ccnmt: packages/shell/src/bash/unicodeDashes.ts`. Cierra
 * una clase de bypass de permisos donde el modelo emite un en-dash /
 * em-dash / barra horizontal (U+2013, U+2014, U+2015) en un nombre de
 * flag — `rm —rf` se ve idéntico a `rm --rf` en una terminal, pero el
 * clasificador de permisos ve un argv distinto. Un shell real NO trata
 * esos caracteres como guion (son literales), así que si pasan el
 * clasificador el comando o no hace nada o falla — el riesgo del bypass
 * está en que el clasificador clasifique mal, no en que el shell ejecute
 * mal. Normalizando todo campo de texto/nombre/argv ANTES de que llegue
 * al clasificador se garantiza que clasificador y shell coinciden en qué
 * comando es.
 *
 * Aplicar en:
 * - `SimpleCommand.text` / `.argv[]` (`ast.ts`, `ast-alias.ts`)
 * - entradas de `extractRules` / el parser de reglas de permisos
 * - cualquier cadena que llegue al clasificador extraída del texto crudo
 *
 * NO aplicar a la cadena que se ejecuta REALMENTE en el shell — el
 * usuario puede haber escrito un em-dash a propósito (p. ej. en un
 * comentario que se hace echo) y debe preservarse para la fidelidad del
 * stdout.
 *
 * Porte COMPLETO: los dos símbolos exportados de la fuente están
 * presentes.
 *
 * @module
 */

const UNICODE_DASH_RE = /[–—―]/g

export function sanitizeUnicodeDashes(text: string): string {
  return text.replace(UNICODE_DASH_RE, '-')
}

/**
 * Conveniencia para arreglos de argv. Devuelve un arreglo nuevo.
 */
export function sanitizeUnicodeDashesArgv(argv: readonly string[]): string[] {
  return argv.map(sanitizeUnicodeDashes)
}
