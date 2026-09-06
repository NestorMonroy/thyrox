/**
 * Cita segura de argumentos para una shell POSIX.
 *
 * PORTE PARCIAL — Y CON UNA DESVIACIÓN DELIBERADA. La fuente
 * (`claude-code-nestor-monroy-tools: packages/shell/src/bash/shellQuote.ts`,
 * 307 líneas) también declara `tryParseShellCommand`, `tryQuoteShellArgs`,
 * `hasMalformedTokens` y el tipo `ParseEntry` — todos ellos envoltorios de
 * la librería npm `shell-quote` (parse/quote), que ninguno de los cinco
 * tests portados de esta tarea ejercita.
 *
 * `shellPrefix.test.ts` SÍ ejercita `quote()`, y `quote()` en la fuente
 * delega en `shellQuoteQuote` de la librería npm `shell-quote`. Esa
 * dependencia NO está declarada en `package.json` del paquete fuente
 * (sólo declara `execa`, `lodash-es`, `tree-kill`) — es una dependencia
 * TRANSITIVA que la medición previa a esta tarea no cubrió, porque sólo
 * grepeó esos tres paquetes. Verificado: `shell-quote` no existe en
 * ningún `node_modules` ni `package.json` de este monorepo.
 *
 * Por directiva de la tarea, NO se instala la dependencia. En su lugar,
 * `quote()` se REIMPLEMENTA nativamente aquí — el algoritmo de escapado de
 * `shell-quote` es un procedimiento pequeño, público y bien documentado
 * (no se copia código de la fuente: `shellQuote.ts` de ccnmt no lo
 * contiene, sólo reexporta el paquete). Se restringe al caso que
 * `formatShellPrefixCommand` necesita — un arreglo de strings — y se
 * validó contra los 26 casos de `shellPrefix.test.ts` antes de darlo por
 * bueno (empty string, espacios, comilla simple anidada, metacaracteres).
 *
 * @module
 */

/** Caracteres que, en una shell POSIX, un argumento SIN comillas necesita
 * escapar aun sin espacios ni comillas de por medio (metacaracteres de
 * shell y puntuación con significado especial). El guion NO está en esta
 * lista — `-c`, `-bash`, `my-shell` salen sin escapar. */
const UNQUOTED_ESCAPE_PATTERN = /([A-Za-z]:)?([#!"$&'()*,:;<=>?@[\\\]^`{|}~])/g

export function quote(args: ReadonlyArray<unknown>): string {
  return args
    .map(raw => {
      const s = String(raw)
      if (s === '') {
        // La cadena vacía no tiene forma sin comillas que sobreviva al
        // troceado de la shell — se cita como '' explícitamente.
        return "''"
      }
      const hasSingleQuote = /'/.test(s)
      const hasDoubleQuoteOrSpace = /["\s]/.test(s)
      if (hasDoubleQuoteOrSpace && !hasSingleQuote) {
        // Espacios o comillas dobles, sin comilla simple: se envuelve en
        // comillas simples (todo literal dentro) y sólo se escapan la
        // propia comilla simple y la barra invertida.
        return "'" + s.replace(/(['\\])/g, '\\$1') + "'"
      }
      if (/["'\s]/.test(s)) {
        // Lleva comilla simple (y probablemente espacios): las comillas
        // simples no se pueden anidar dentro de sí mismas, así que se
        // envuelve en comillas dobles y se escapan los caracteres que SÍ
        // son especiales ahí dentro (comilla doble, barra invertida, `$`,
        // backtick, `!` del historial interactivo).
        return '"' + s.replace(/(["\\$`!])/g, '\\$1') + '"'
      }
      // Sin espacios ni comillas: se escapan sólo los metacaracteres de
      // shell que aparezcan sueltos en el texto.
      return s.replace(UNQUOTED_ESCAPE_PATTERN, '$1\\$2')
    })
    .join(' ')
}
