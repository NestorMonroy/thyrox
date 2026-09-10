/**
 * Porte fiel de `ccnmt: packages/shell/src/bash/shellQuoting.ts`.
 *
 * Porte COMPLETO: los cinco símbolos exportados de la fuente están
 * presentes (`quoteShellCommand`, `hasStdinRedirect`,
 * `shouldAddStdinRedirect`, `rewriteWindowsNullRedirect`, y las dos
 * funciones internas de detección `containsHeredoc`/
 * `containsMultilineString` que consumen).
 *
 * @module
 */
import { quote } from './shellQuote.js'

/**
 * Detecta si un comando contiene un patrón de heredoc. Coincide con
 * patrones como: `<<EOF`, `<<'EOF'`, `<<"EOF"`, `<<-EOF`, `<<-'EOF'`,
 * `<<\EOF`, etc.
 */
function containsHeredoc(command: string): boolean {
  // Primero se comprueban los operadores de desplazamiento de bits y se
  // excluyen, para no confundirlos con un heredoc.
  if (
    /\d\s*<<\s*\d/.test(command) ||
    /\[\[\s*\d+\s*<<\s*\d+\s*\]\]/.test(command) ||
    /\$\(\(.*<<.*\)\)/.test(command)
  ) {
    return false
  }

  const heredocRegex = /<<-?\s*(?:(['"]?)(\w+)\1|\\(\w+))/
  return heredocRegex.test(command)
}

/**
 * Detecta si un comando contiene cadenas multilínea entre comillas.
 */
function containsMultilineString(command: string): boolean {
  const singleQuoteMultiline = /'(?:[^'\\]|\\.)*\n(?:[^'\\]|\\.)*'/
  const doubleQuoteMultiline = /"(?:[^"\\]|\\.)*\n(?:[^"\\]|\\.)*"/

  return (
    singleQuoteMultiline.test(command) || doubleQuoteMultiline.test(command)
  )
}

/**
 * Cita un comando de shell apropiadamente, preservando heredocs y
 * cadenas multilínea.
 *
 * @param command el comando a citar
 * @param addStdinRedirect si se añade `< /dev/null`
 * @returns el comando citado correctamente
 */
export function quoteShellCommand(
  command: string,
  addStdinRedirect: boolean = true,
): string {
  // Si el comando contiene un heredoc o cadenas multilínea, se maneja
  // aparte — la librería shell-quote escapa incorrectamente `!` a `\!`
  // en esos casos.
  if (containsHeredoc(command) || containsMultilineString(command)) {
    // Para heredocs y cadenas multilínea hace falta citar para `eval`
    // pero evitando el escapado agresivo de shell-quote: se usan
    // comillas simples y sólo se escapan las comillas simples del
    // propio comando.
    const escaped = command.replace(/'/g, "'\"'\"'")
    const quoted = `'${escaped}'`

    // No se añade el redirect de stdin a los heredocs — ya proveen su
    // propia entrada.
    if (containsHeredoc(command)) {
      return quoted
    }

    // Para cadenas multilínea sin heredoc, se añade el redirect de
    // stdin si hace falta.
    return addStdinRedirect ? `${quoted} < /dev/null` : quoted
  }

  // Para comandos normales, se usa shell-quote.
  if (addStdinRedirect) {
    return quote([command, '<', '/dev/null'])
  }

  return quote([command])
}

/**
 * Detecta si un comando ya tiene un redirect de stdin. Coincide con
 * patrones como: `< file`, `</path/to/file`, `< /dev/null`, etc. Pero no
 * con `<<EOF` (heredoc), `<<` (desplazamiento de bits), ni `<(` (process
 * substitution).
 */
export function hasStdinRedirect(command: string): boolean {
  // Busca `<` seguido de espacio en blanco y un nombre de archivo/ruta.
  // Lookahead negativo para excluir: `<<`, `<(`. Debe ir precedido de
  // espacio en blanco, separador de comando o inicio de la cadena.
  return /(?:^|[\s;&|])<(?![<(])\s*\S+/.test(command)
}

/**
 * Comprueba si se debe añadir un redirect de stdin a un comando.
 *
 * @param command el comando a comprobar
 * @returns true si el redirect de stdin puede añadirse sin riesgo
 */
export function shouldAddStdinRedirect(command: string): boolean {
  // No se añade redirect de stdin a los heredocs — interferiría con su
  // terminador.
  if (containsHeredoc(command)) {
    return false
  }

  // No se añade si el comando ya tiene uno.
  if (hasStdinRedirect(command)) {
    return false
  }

  // Para el resto de comandos, el redirect de stdin es seguro en
  // general.
  return true
}

/**
 * Reescribe los redirects de estilo Windows CMD `>nul` a `/dev/null`
 * POSIX.
 *
 * El modelo a veces alucina sintaxis de Windows CMD (p. ej. `ls 2>nul`)
 * aunque nuestro shell de bash sea siempre POSIX (Git Bash / WSL en
 * Windows). Cuando Git Bash ve `2>nul`, crea un archivo literal llamado
 * `nul` — un nombre de dispositivo reservado de Windows extremadamente
 * difícil de borrar, que rompe `git add .` y `git clone`.
 *
 * Coincide con: `>nul`, `> NUL`, `2>nul`, `&>nul`, `>>nul` (sin
 * distinguir mayúsculas). NO coincide con: `>null`, `>nullable`,
 * `>nul.txt`, `cat nul.txt`.
 *
 * Limitación: esta expresión regular no parsea el quoting del shell,
 * así que `echo ">nul"` también se reescribe. Es un daño colateral
 * aceptable — es extremadamente raro, y reescribir a `/dev/null` dentro
 * de una cadena es inocuo.
 */
const NUL_REDIRECT_REGEX = /(\d?&?>+\s*)[Nn][Uu][Ll](?=\s|$|[|&;)\n])/g

export function rewriteWindowsNullRedirect(command: string): string {
  return command.replace(NUL_REDIRECT_REGEX, '$1/dev/null')
}
