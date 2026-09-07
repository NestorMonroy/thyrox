/**
 * Puerto de `ccnmt: packages/config/frontmatterParser.ts` (370 líneas
 * fuente). Resuelve `@thyrox/config/frontmatterParser`, que DOS forward
 * shims ya citaban con `require()` diferido sin que el archivo existiera:
 * `agent/frontmatterParser.ts` ("DIVERGENCIA DE ALCANCE, declarada… Portar
 * ese módulo es tarea de quien porte config") y `memory:
 * src/internal/pendingCrossPackageDeps.ts` (que trae su propio recorte
 * interno independiente, no afectado por este archivo). Parser de
 * frontmatter YAML para `.md` (skills, commands, agents, CLAUDE.md).
 *
 * Divergencias declaradas, ambas de nombre — el comportamiento es fiel:
 *
 * - `HooksSettings` no existe como tipo propio en
 *   `@thyrox/config/settings/types.ts` (la fuente lo trae de
 *   `./schemas/hooks.js`, no portado). Se deriva de `Settings['hooks']`
 *   (el campo ya tipado por `SettingsSchema`), mismo shape observable.
 * - El resto — `FRONTMATTER_REGEX`, `parseFrontmatter`,
 *   `splitPathInFrontmatter`, `expandBraces`,
 *   `parsePositiveIntFromFrontmatter`, `coerceDescriptionToString`,
 *   `parseBooleanFrontmatter`, `parseShellFrontmatter`,
 *   `quoteProblematicValues` — verbatim, 9 de 9 símbolos de valor + los 3
 *   tipos (`FrontmatterData`, `ParsedMarkdown`, `FrontmatterShell`).
 */
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import type { Settings } from './settings/types.ts'
import { parseYaml } from './yaml.ts'

export type FrontmatterData = {
  // YAML puede devolver null para claves sin valor ("key:" sin nada detrás)
  'allowed-tools'?: string | string[] | null
  description?: string | null
  // Tipo de memoria: 'user', 'feedback', 'project', o 'reference'
  type?: string | null
  'argument-hint'?: string | null
  when_to_use?: string | null
  version?: string | null
  // Sólo aplica a slash commands
  'hide-from-slash-command-tool'?: string | null
  // Alias o nombre de modelo; 'inherit' para heredar el del padre
  model?: string | null
  // Lista de nombres de skill separados por coma (sólo agentes)
  skills?: string | null
  'user-invocable'?: string | null
  // Hooks a registrar cuando este skill se invoca
  hooks?: Settings['hooks'] | null
  // Nivel de esfuerzo (low/medium/high/max o entero)
  effort?: string | null
  // 'inline' (default) o 'fork'
  context?: 'inline' | 'fork' | null
  // Tipo de agente al forkear — sólo aplica con context: 'fork'
  agent?: string | null
  // Patrones de ruta; string separado por coma o lista YAML de strings
  paths?: string | string[] | null
  // Shell para bloques !`cmd`/```!: 'bash' (default) o 'powershell'
  shell?: string | null
  [key: string]: unknown
}

export type ParsedMarkdown = {
  frontmatter: FrontmatterData
  content: string
}

// Caracteres que exigen comillas en un valor YAML (sin comillas):
// { } indicadores de flow mapping · * anchor/alias · [ ] flow sequence ·
// ': ' (dos puntos + espacio) indicador de clave — rompe con "Nested
// mappings are not allowed in compact mappings" a mitad de valor (se
// matchea el patrón, no ':' pelado, para no tocar horas "12:34" ni
// URLs "https://") · # comentario · & anchor · ! tag · | > block scalar
// (sólo al inicio) · % directiva (sólo al inicio) · @ ` reservados.
const YAML_SPECIAL_CHARS = /[{}[\]*&#!|>%@`]|: /

/**
 * Pre-procesa el texto de frontmatter poniendo entre comillas los valores
 * con caracteres YAML especiales — permite que globs como `**\/*.{ts,tsx}`
 * se parseen sin romper.
 */
function quoteProblematicValues(frontmatterText: string): string {
  const lines = frontmatterText.split('\n')
  const result: string[] = []

  for (const line of lines) {
    const match = line.match(/^([a-zA-Z_-]+):\s+(.+)$/)
    if (match) {
      const [, key, value] = match
      if (!key || !value) {
        result.push(line)
        continue
      }

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        result.push(line)
        continue
      }

      if (YAML_SPECIAL_CHARS.test(value)) {
        const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
        result.push(`${key}: "${escaped}"`)
        continue
      }
    }

    result.push(line)
  }

  return result.join('\n')
}

export const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)---\s*\n?/

/**
 * Parsea contenido markdown para extraer el frontmatter y el resto.
 */
export function parseFrontmatter(
  markdown: string,
  sourcePath?: string,
): ParsedMarkdown {
  const match = markdown.match(FRONTMATTER_REGEX)

  if (!match) {
    return {
      frontmatter: {},
      content: markdown,
    }
  }

  const frontmatterText = match[1] || ''
  const content = markdown.slice(match[0].length)

  let frontmatter: FrontmatterData = {}
  try {
    const parsed = parseYaml(frontmatterText) as FrontmatterData | null
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      frontmatter = parsed
    }
  } catch {
    try {
      const quotedText = quoteProblematicValues(frontmatterText)
      const parsed = parseYaml(quotedText) as FrontmatterData | null
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        frontmatter = parsed
      }
    } catch (retryError) {
      const location = sourcePath ? ` in ${sourcePath}` : ''
      logForDebugging(
        `Failed to parse YAML frontmatter${location}: ${retryError instanceof Error ? retryError.message : retryError}`,
        { level: 'warn' },
      )
    }
  }

  return {
    frontmatter,
    content,
  }
}

/**
 * Divide un string separado por comas y expande patrones de llave. Las
 * comas dentro de llaves no cuentan como separador. Acepta también una
 * lista YAML (array de strings).
 * @example splitPathInFrontmatter("a, src/*.{ts,tsx}") // ["a", "src/*.ts", "src/*.tsx"]
 */
export function splitPathInFrontmatter(input: string | string[]): string[] {
  if (Array.isArray(input)) {
    return input.flatMap(splitPathInFrontmatter)
  }
  if (typeof input !== 'string') {
    return []
  }
  const parts: string[] = []
  let current = ''
  let braceDepth = 0

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if (char === '{') {
      braceDepth++
      current += char
    } else if (char === '}') {
      braceDepth--
      current += char
    } else if (char === ',' && braceDepth === 0) {
      const trimmed = current.trim()
      if (trimmed) {
        parts.push(trimmed)
      }
      current = ''
    } else {
      current += char
    }
  }

  const trimmed = current.trim()
  if (trimmed) {
    parts.push(trimmed)
  }

  return parts
    .filter(p => p.length > 0)
    .flatMap(pattern => expandBraces(pattern))
}

/**
 * Expande patrones de llave en un glob.
 * @example expandBraces("{a,b}/{c,d}") // ["a/c", "a/d", "b/c", "b/d"]
 */
function expandBraces(pattern: string): string[] {
  const braceMatch = pattern.match(/^([^{]*)\{([^}]+)\}(.*)$/)

  if (!braceMatch) {
    return [pattern]
  }

  const prefix = braceMatch[1] || ''
  const alternatives = braceMatch[2] || ''
  const suffix = braceMatch[3] || ''

  const parts = alternatives.split(',').map(alt => alt.trim())

  const expanded: string[] = []
  for (const part of parts) {
    const combined = prefix + part + suffix
    const furtherExpanded = expandBraces(combined)
    expanded.push(...furtherExpanded)
  }

  return expanded
}

/**
 * Parsea un entero positivo desde un valor de frontmatter (número o string).
 */
export function parsePositiveIntFromFrontmatter(
  value: unknown,
): number | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  const parsed = typeof value === 'number' ? value : parseInt(String(value), 10)

  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed
  }

  return undefined
}

/**
 * Valida y coacciona un valor de `description` de frontmatter. Strings se
 * devuelven trimmed; números/booleanos se coaccionan con `String()`;
 * arrays/objetos son inválidos (se loguean y se omiten); null/undefined/
 * vacío devuelven `null`.
 */
export function coerceDescriptionToString(
  value: unknown,
  componentName?: string,
  pluginName?: string,
): string | null {
  if (value == null) {
    return null
  }
  if (typeof value === 'string') {
    return value.trim() || null
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  const source = pluginName
    ? `${pluginName}:${componentName}`
    : (componentName ?? 'unknown')
  logForDebugging(`Description invalid for ${source} - omitting`, {
    level: 'warn',
  })
  return null
}

/**
 * Parsea un valor booleano de frontmatter. Sólo `true` literal o `"true"`.
 */
export function parseBooleanFrontmatter(value: unknown): boolean {
  return value === true || value === 'true'
}

/** Valores de shell aceptados en el frontmatter `shell:` de bloques `!`. */
export type FrontmatterShell = 'bash' | 'powershell'

const FRONTMATTER_SHELLS: readonly FrontmatterShell[] = ['bash', 'powershell']

/**
 * Parsea y valida el campo `shell:` del frontmatter. `undefined` para
 * ausente/null/vacío (el caller cae a bash) o para un valor no reconocido
 * (con warning) — nunca falla la carga del skill.
 */
export function parseShellFrontmatter(
  value: unknown,
  source: string,
): FrontmatterShell | undefined {
  if (value == null) {
    return undefined
  }
  const normalized = String(value).trim().toLowerCase()
  if (normalized === '') {
    return undefined
  }
  if ((FRONTMATTER_SHELLS as readonly string[]).includes(normalized)) {
    return normalized as FrontmatterShell
  }
  logForDebugging(
    `Frontmatter 'shell: ${value}' in ${source} is not recognized. Valid values: ${FRONTMATTER_SHELLS.join(', ')}. Falling back to bash.`,
    { level: 'warn' },
  )
  return undefined
}
