/**
 * Porte fiel de `ccnmt: packages/permission/src/shellRuleMatching.ts`
 * (228 líneas, 6 exports, licencia UNLICENSED — reimplementación, no
 * copia). Porte COMPLETO: las seis funciones y el tipo
 * `ShellPermissionRule` están presentes, con el mismo cuerpo carácter por
 * carácter.
 *
 * Utilidades compartidas de emparejamiento de reglas de permiso para
 * herramientas de shell — parseo de reglas (exact/prefix/wildcard),
 * emparejamiento de comandos contra reglas, y generación de sugerencias
 * de permiso. Este es el motor de **decisión** central de este paquete
 * para reglas de shell: cambiar su forma cambia qué comando pasa o no.
 *
 * Divergencia medida: `PermissionUpdate` se importa aquí de
 * `./permissionTypes.js` en vez de `./PermissionUpdateSchema.js` (la
 * fuente). Es el MISMO tipo — `PermissionUpdateSchema.ts` en la fuente lo
 * re-exporta sin cambios desde `./types/permissions.js` → `../permissionTypes.js`
 * (mismo linaje que documenta `types/permissions.ts` de este paquete) — y
 * evita depender del archivo `PermissionUpdateSchema.ts`, cuyo cuerpo
 * (schemas Zod) está bloqueado por la ausencia de `zod` en este paquete.
 *
 * Sin más divergencias.
 */
import type { PermissionUpdate } from './permissionTypes.js'

// Placeholders de tipo sentinela (byte nulo) para el escapado del patrón
// wildcard — a nivel de módulo para que los objetos RegExp se compilen
// una sola vez en vez de por cada comprobación de permiso.
const ESCAPED_STAR_PLACEHOLDER = '\x00ESCAPED_STAR\x00'
const ESCAPED_BACKSLASH_PLACEHOLDER = '\x00ESCAPED_BACKSLASH\x00'
const ESCAPED_STAR_PLACEHOLDER_RE = new RegExp(ESCAPED_STAR_PLACEHOLDER, 'g')
const ESCAPED_BACKSLASH_PLACEHOLDER_RE = new RegExp(
  ESCAPED_BACKSLASH_PLACEHOLDER,
  'g',
)

/**
 * Unión discriminada de regla de permiso parseada.
 */
export type ShellPermissionRule =
  | {
      type: 'exact'
      command: string
    }
  | {
      type: 'prefix'
      prefix: string
    }
  | {
      type: 'wildcard'
      pattern: string
    }

/**
 * Extrae el prefijo de la sintaxis legacy `:*` (p. ej. "npm:*" -> "npm").
 * Se mantiene por compatibilidad hacia atrás.
 */
export function permissionRuleExtractPrefix(
  permissionRule: string,
): string | null {
  const match = permissionRule.match(/^(.+):\*$/)
  return match?.[1] ?? null
}

/**
 * Verdadero si el patrón contiene wildcards sin escapar (que no son
 * sintaxis legacy `:*`). Devuelve true si el patrón contiene `*` que no
 * están escapados con `\` ni forman parte de `:*` al final.
 */
export function hasWildcards(pattern: string): boolean {
  // Si termina en :*, es sintaxis de prefijo legacy, no wildcard.
  if (pattern.endsWith(':*')) {
    return false
  }
  // Busca un `*` sin escapar en cualquier posición. Un asterisco está sin
  // escapar si no está precedido por una barra invertida, o si está
  // precedido por un número par de barras invertidas (barras escapadas).
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '*') {
      let backslashCount = 0
      let j = i - 1
      while (j >= 0 && pattern[j] === '\\') {
        backslashCount++
        j--
      }
      // Con un número par de barras invertidas (incluido 0), el asterisco
      // está sin escapar.
      if (backslashCount % 2 === 0) {
        return true
      }
    }
  }
  return false
}

/**
 * Empareja un comando contra un patrón wildcard. `*` empareja cualquier
 * secuencia de caracteres. `\*` empareja un asterisco literal. `\\`
 * empareja una barra invertida literal.
 *
 * @param pattern - el patrón de regla de permiso con wildcards
 * @param command - el comando a emparejar contra el patrón
 * @returns true si el comando empareja con el patrón
 */
export function matchWildcardPattern(
  pattern: string,
  command: string,
  caseInsensitive = false,
): boolean {
  // Recorta espacio en blanco al inicio/final del patrón.
  const trimmedPattern = pattern.trim()

  // Procesa el patrón para manejar secuencias de escape: \* y \\.
  let processed = ''
  let i = 0

  while (i < trimmedPattern.length) {
    const char = trimmedPattern[i]

    if (char === '\\' && i + 1 < trimmedPattern.length) {
      const nextChar = trimmedPattern[i + 1]
      if (nextChar === '*') {
        // \* -> placeholder de asterisco literal
        processed += ESCAPED_STAR_PLACEHOLDER
        i += 2
        continue
      } else if (nextChar === '\\') {
        // \\ -> placeholder de barra invertida literal
        processed += ESCAPED_BACKSLASH_PLACEHOLDER
        i += 2
        continue
      }
    }

    processed += char
    i++
  }

  // Escapa caracteres especiales de regex excepto *.
  const escaped = processed.replace(/[.+?^${}()|[\]\\'"]/g, '\\$&')

  // Convierte * sin escapar a .* para el emparejamiento wildcard.
  const withWildcards = escaped.replace(/\*/g, '.*')

  // Convierte los placeholders de vuelta a literales de regex escapados.
  let regexPattern = withWildcards
    .replace(ESCAPED_STAR_PLACEHOLDER_RE, '\\*')
    .replace(ESCAPED_BACKSLASH_PLACEHOLDER_RE, '\\\\')

  // Cuando un patrón termina en ' *' (espacio + wildcard sin escapar) Y ese
  // wildcard final es el ÚNICO wildcard sin escapar, se hace opcional el
  // espacio-y-argumentos finales para que 'git *' empareje tanto 'git add'
  // como el 'git' desnudo. Esto alinea el emparejamiento wildcard con la
  // semántica de regla de prefijo (git:*). Los patrones con varios
  // wildcards como '* run *' se excluyen — hacer opcional el último
  // wildcard emparejaría incorrectamente 'npm run' (sin argumento final).
  const unescapedStarCount = (processed.match(/\*/g) || []).length
  if (regexPattern.endsWith(' .*') && unescapedStarCount === 1) {
    regexPattern = regexPattern.slice(0, -3) + '( .*)?'
  }

  // Crea el regex que empareja la cadena completa. La bandera 's'
  // (dotAll) hace que '.' empareje saltos de línea, para que los
  // wildcards emparejen comandos con saltos de línea embebidos (p. ej.
  // contenido de heredoc tras splitCommand).
  const flags = 's' + (caseInsensitive ? 'i' : '')
  const regex = new RegExp(`^${regexPattern}$`, flags)

  return regex.test(command)
}

/**
 * Parsea un string de regla de permiso en un objeto de regla estructurado.
 */
export function parsePermissionRule(
  permissionRule: string,
): ShellPermissionRule {
  // Primero comprueba la sintaxis legacy de prefijo :* (compatibilidad).
  const prefix = permissionRuleExtractPrefix(permissionRule)
  if (prefix !== null) {
    return {
      type: 'prefix',
      prefix,
    }
  }

  // Comprueba la sintaxis nueva de wildcard (contiene * pero no :* al final).
  if (hasWildcards(permissionRule)) {
    return {
      type: 'wildcard',
      pattern: permissionRule,
    }
  }

  // Si no, es un emparejamiento exacto.
  return {
    type: 'exact',
    command: permissionRule,
  }
}

/**
 * Genera una sugerencia de actualización de permiso para un emparejamiento
 * exacto de comando.
 */
export function suggestionForExactCommand(
  toolName: string,
  command: string,
): PermissionUpdate[] {
  return [
    {
      type: 'addRules',
      rules: [
        {
          toolName,
          ruleContent: command,
        },
      ],
      behavior: 'allow',
      destination: 'localSettings',
    },
  ]
}

/**
 * Genera una sugerencia de actualización de permiso para un
 * emparejamiento de prefijo.
 */
export function suggestionForPrefix(
  toolName: string,
  prefix: string,
): PermissionUpdate[] {
  return [
    {
      type: 'addRules',
      rules: [
        {
          toolName,
          ruleContent: `${prefix}:*`,
        },
      ],
      behavior: 'allow',
      destination: 'localSettings',
    },
  ]
}
