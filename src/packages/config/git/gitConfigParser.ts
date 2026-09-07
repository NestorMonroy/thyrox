/**
 * Puerto de `ccnmt: packages/config/git/gitConfigParser.ts` (283 líneas
 * fuente). No es uno de los 15 del alcance — es la dependencia de hoja que
 * `gitFilesystem.ts` necesita: sólo importa `readFile` de `fs/promises` y
 * `join` de `path` (ambos built-ins de Node), así que se porta en el sitio
 * en vez de bloquearse.
 *
 * Parser ligero de archivos `.git/config`. Verificado contra `config.c` de
 * git:
 *   - Nombres de sección: sin distinguir mayúsculas, alfanumérico + guion.
 *   - Nombres de subsección (entre comillas): distinguen mayúsculas, escapes
 *     de backslash (`\\` y `\"`).
 *   - Nombres de clave: sin distinguir mayúsculas, alfanumérico + guion.
 *   - Valores: comillas opcionales, comentarios en línea (`#` o `;`), escapes
 *     de backslash.
 */

import { readFile } from 'fs/promises'
import { join } from 'path'

/**
 * Parsea un único valor de `.git/config`.
 * Encuentra la primera clave que coincide bajo la sección/subsección dada.
 */
export async function parseGitConfigValue(
  gitDir: string,
  section: string,
  subsection: string | null,
  key: string,
): Promise<string | null> {
  try {
    const config = await readFile(join(gitDir, 'config'), 'utf-8')
    return parseConfigString(config, section, subsection, key)
  } catch {
    return null
  }
}

/**
 * Parsea un valor de config desde una cadena en memoria.
 * Exportada para testing.
 */
export function parseConfigString(
  config: string,
  section: string,
  subsection: string | null,
  key: string,
): string | null {
  const lines = config.split('\n')
  const sectionLower = section.toLowerCase()
  const keyLower = key.toLowerCase()

  let inSection = false
  for (const line of lines) {
    const trimmed = line.trim()

    // Salta líneas vacías y líneas de comentario puro.
    if (trimmed.length === 0 || trimmed[0] === '#' || trimmed[0] === ';') {
      continue
    }

    // Cabecera de sección.
    if (trimmed[0] === '[') {
      inSection = matchesSectionHeader(trimmed, sectionLower, subsection)
      continue
    }

    if (!inSection) {
      continue
    }

    // Línea clave-valor: encuentra el nombre de la clave.
    const parsed = parseKeyValue(trimmed)
    if (parsed && parsed.key.toLowerCase() === keyLower) {
      return parsed.value
    }
  }

  return null
}

/**
 * Parsea una línea `clave = valor`. Devuelve `null` si la línea no contiene
 * una clave válida.
 */
function parseKeyValue(line: string): { key: string; value: string } | null {
  // Lee la clave: alfanumérico + guion, empezando por alfa.
  let i = 0
  while (i < line.length && isKeyChar(line[i]!)) {
    i++
  }
  if (i === 0) {
    return null
  }
  const key = line.slice(0, i)

  // Salta espacio en blanco.
  while (i < line.length && (line[i] === ' ' || line[i] === '\t')) {
    i++
  }

  // Debe tener '='.
  if (i >= line.length || line[i] !== '=') {
    // Clave booleana sin valor — no relevante para nuestro uso.
    return null
  }
  i++ // salta '='

  // Salta espacio en blanco tras '='.
  while (i < line.length && (line[i] === ' ' || line[i] === '\t')) {
    i++
  }

  const value = parseValue(line, i)
  return { key, value }
}

/**
 * Parsea un valor de config empezando en la posición i.
 * Maneja cadenas entre comillas, secuencias de escape y comentarios en línea.
 */
function parseValue(line: string, start: number): string {
  // El resultado se construye junto a un arreglo paralelo `protectedFlags`
  // para que el recorte de espacio final SÓLO quite espacio en blanco NO
  // entrecomillado. Sin este rastreo paralelo, un valor como `"Alice   "`
  // perdía sus espacios finales en silencio porque al final de línea
  // `inQuote` ya es `false` (la comilla ya cerró) — lo que aplicaba el
  // recorte a *todo*, incluidos los caracteres que estaban entre comillas.
  const chars: string[] = []
  const protectedFlags: boolean[] = []
  let inQuote = false
  let i = start

  function append(ch: string, fromQuote: boolean): void {
    chars.push(ch)
    protectedFlags.push(fromQuote)
  }

  while (i < line.length) {
    const ch = line[i]!

    // Comentarios en línea fuera de comillas terminan el valor.
    if (!inQuote && (ch === '#' || ch === ';')) {
      break
    }

    if (ch === '"') {
      inQuote = !inQuote
      i++
      continue
    }

    if (ch === '\\' && i + 1 < line.length) {
      const next = line[i + 1]!
      if (inQuote) {
        // Dentro de comillas: reconoce secuencias de escape.
        switch (next) {
          case 'n':
            append('\n', true)
            break
          case 't':
            append('\t', true)
            break
          case 'b':
            append('\b', true)
            break
          case '"':
            append('"', true)
            break
          case '\\':
            append('\\', true)
            break
          default:
            // Git descarta el backslash en silencio para escapes desconocidos.
            append(next, true)
            break
        }
        i += 2
        continue
      }
      // Fuera de comillas: backslash a fin de línea = continuación (no se
      // maneja multilínea porque se parte por `\n`, pero se maneja `\\` y
      // otros).
      if (next === '\\') {
        append('\\', false)
        i += 2
        continue
      }
      // Fallthrough — trata el backslash literal fuera de comillas.
    }

    append(ch, inQuote)
    i++
  }

  // Recorta sólo el espacio en blanco final NO entrecomillado. El espacio en
  // blanco entrecomillado se preserva — coincide con el comportamiento de
  // `git config --get`.
  let end = chars.length
  while (
    end > 0 &&
    !protectedFlags[end - 1] &&
    (chars[end - 1] === ' ' || chars[end - 1] === '\t')
  ) {
    end--
  }
  return chars.slice(0, end).join('')
}

/**
 * Comprueba si una línea de config como `[remote "origin"]` coincide con la
 * sección/subsección dada. La sección no distingue mayúsculas; la
 * subsección sí.
 */
function matchesSectionHeader(
  line: string,
  sectionLower: string,
  subsection: string | null,
): boolean {
  // La línea empieza con '['.
  let i = 1

  // Lee el nombre de sección.
  while (
    i < line.length &&
    line[i] !== ']' &&
    line[i] !== ' ' &&
    line[i] !== '\t' &&
    line[i] !== '"'
  ) {
    i++
  }
  const foundSection = line.slice(1, i).toLowerCase()

  if (foundSection !== sectionLower) {
    return false
  }

  if (subsection === null) {
    // Sección simple: debe terminar con ']'.
    return i < line.length && line[i] === ']'
  }

  // Salta espacio antes de la comilla de subsección.
  while (i < line.length && (line[i] === ' ' || line[i] === '\t')) {
    i++
  }

  // Debe tener comilla de apertura.
  if (i >= line.length || line[i] !== '"') {
    return false
  }
  i++ // salta la comilla de apertura

  // Lee la subsección — distingue mayúsculas, maneja escapes `\\` y `\"`.
  let foundSubsection = ''
  while (i < line.length && line[i] !== '"') {
    if (line[i] === '\\' && i + 1 < line.length) {
      const next = line[i + 1]!
      if (next === '\\' || next === '"') {
        foundSubsection += next
        i += 2
        continue
      }
      // Git descarta el backslash para otros escapes en subsecciones.
      foundSubsection += next
      i += 2
      continue
    }
    foundSubsection += line[i]
    i++
  }

  // Debe tener comilla de cierre seguida de ']'.
  if (i >= line.length || line[i] !== '"') {
    return false
  }
  i++ // salta la comilla de cierre

  if (i >= line.length || line[i] !== ']') {
    return false
  }

  return foundSubsection === subsection
}

function isKeyChar(ch: string): boolean {
  return (
    (ch >= 'a' && ch <= 'z') ||
    (ch >= 'A' && ch <= 'Z') ||
    (ch >= '0' && ch <= '9') ||
    ch === '-'
  )
}
