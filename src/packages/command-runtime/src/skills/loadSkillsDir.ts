import { homedir } from 'os'
import { join } from 'path'
import {
  coerceDescriptionToString,
  type FrontmatterData,
  type FrontmatterShell,
  parseBooleanFrontmatter,
  parseShellFrontmatter,
  splitPathInFrontmatter,
} from '@thyrox/config/frontmatterParser.js'
import { HooksSchema, type HooksSettings } from '@thyrox/config/types'
import { extractDescriptionFromMarkdown } from '@thyrox/config/utils/markdownDescription.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { parseUserSpecifiedModel } from '@thyrox/provider/model.js'
import { parseSlashCommandToolsFromFrontmatter } from '@thyrox/tool-registry/markdownConfigLoader.js'
import { parseArgumentNames } from '../argumentSubstitution.js'
import { clearDynamicSkills } from './dynamicSkills.js'
import { getManagedFilePath } from './managedPath.js'

/**
 * Porte de `ccnmt: packages/command-runtime/src/skills/loadSkillsDir.ts`
 * (1086 líneas). Portado en este archivo: `getSkillsPath`,
 * `estimateSkillFrontmatterTokens`, `parseSkillPaths` (la fuente no lo
 * exporta; aquí sí, para su suite) y `parseSkillFrontmatterFields`, con sus
 * helpers privados (`parseHooksFromFrontmatter`, el porte local de
 * `parseEffortValue`). Su suite: `__tests__/loadSkillsDir.behavior.test.ts`,
 * cada bloque escrito en rojo y probado por anulación.
 *
 * Pendiente en este archivo (se porta en los pases siguientes de la misma
 * tarea): `createSkillCommand`, `loadSkillsFromSkillsDir`, el cargador
 * heredado de `/commands/`, `getSkillDirCommands` y el registro de
 * constructores MCP. La mitad dinámica ya vive en `dynamicSkills.ts`.
 *
 * Dependencias sustituidas (DEC-04):
 *
 * - `SettingSource` — de `@claude-code-how-works/config/constants`. Ya
 *   existe como tipo real en `@thyrox/config`, pero ese paquete no está
 *   enlazado como workspace aquí (ningún paquete de este árbol importa
 *   otro `@thyrox/*` por nombre todavía) — se redeclara localmente con
 *   los mismos cinco valores.
 * - `getClaudeConfigHomeDir` — de `@claude-code-how-works/config/env/utils`.
 *   Porte fiel salvo la memoización: sin `lodash-es/memoize` disponible
 *   (0 dependencias en el `package.json` de este paquete), se sustituye
 *   por una memoización manual keyed por el propio valor de
 *   `CLAUDE_CONFIG_DIR`, igual que hace la fuente con su resolver.
 *
 * - `roughTokenCountEstimation` — de `@claude-code-how-works/agent/tokenEstimation.js`.
 *   Ese símbolo SÍ existe portado en `@thyrox/agent/tokenEstimation.ts`,
 *   pero `command-runtime` no puede importarlo: la dependencia va en el
 *   sentido contrario (`agent` depende de `command-runtime`, no al
 *   revés), así que importarlo aquí crearía un ciclo. Se porta una
 *   segunda vez, fiel a la fuente.
 * - `Command` (el tipo del parámetro de `estimateSkillFrontmatterTokens`)
 *   — de `@claude-code-how-works/agent/command.js`, una unión grande
 *   (`CommandBase & (PromptCommand | LocalCommand | LocalJSXCommand)`).
 *   Se sustituye por `SkillFrontmatter`, el subconjunto estructural que
 *   la función realmente lee (`name`, `description`, `whenToUse`).
 *
 * HALLAZGO CORREGIDO EN ESTE PASE (H-COMMAND-RUNTIME-01): la memoización
 * manual de `getClaudeConfigHomeDir` comparaba `cachedHomeDirKey !== key`
 * contra un `cachedHomeDirKey` inicializado en `undefined`. Con
 * `CLAUDE_CONFIG_DIR` sin declarar (el caso por defecto), `key` TAMBIÉN es
 * `undefined` en la primera llamada, así que la comparación daba `false` —
 * la caché nunca se poblaba y la función devolvía `undefined`, que `join()`
 * rechaza con `TypeError: The "paths[0]" property must be of type string,
 * got undefined`. Invisible en la suite existente: `skillHelpers.test.ts`
 * fija `CLAUDE_CONFIG_DIR` en su `beforeAll` ANTES de la primera llamada,
 * así que `key` nunca es `undefined` ahí — el caso real (entorno sin la
 * variable) no tenía cobertura. Se destapó al abrir la puerta de CLI de la
 * tarea #223 e invocar `skills-path userSettings skills` sobre el entorno
 * real del contenedor. Fix: un centinela (`SIN_CACHE`) que nunca coincide
 * con una clave real, definida o no — en vez de comparar contra el mismo
 * `undefined` que `key` puede traer.
 */

export type SettingSource =
  | 'userSettings'
  | 'projectSettings'
  | 'localSettings'
  | 'flagSettings'
  | 'policySettings'

// Memoizado, keyed por el propio valor de CLAUDE_CONFIG_DIR — igual que el
// resolver de `lodash-es/memoize` de la fuente, sin la dependencia.
// `SIN_CACHE` es el estado «todavía no se llamó»: NUNCA coincide con una
// clave real, definida o no — ver H-COMMAND-RUNTIME-01 en la cabecera.
const SIN_CACHE: unique symbol = Symbol('sin-cache-aun')
let cachedHomeDirKey: string | undefined | typeof SIN_CACHE = SIN_CACHE
let cachedHomeDir: string | undefined

function getClaudeConfigHomeDir(): string {
  const key = process.env.CLAUDE_CONFIG_DIR
  if (cachedHomeDirKey !== key) {
    cachedHomeDirKey = key
    cachedHomeDir = (key ?? join(homedir(), '.claude')).normalize('NFC')
  }
  return cachedHomeDir!
}

/**
 * Returns a claude config directory path for a given source.
 */
export function getSkillsPath(
  source: SettingSource | 'plugin',
  dir: 'skills' | 'commands',
): string {
  switch (source) {
    case 'policySettings':
      return join(getManagedFilePath(), '.claude', dir)
    case 'userSettings':
      return join(getClaudeConfigHomeDir(), dir)
    case 'projectSettings':
      return `.claude/${dir}`
    case 'plugin':
      return 'plugin'
    default:
      return ''
  }
}

// CJK Unified Ideographs + extensions + compatibility blocks + punctuation
// Each CJK character is 1 JS string unit but ~1.5 BPE tokens on average,
// making the standard /4 formula underestimate by 4-8x for Chinese/Japanese.
const CJK_REGEX =
  /[\u2e80-\u2eff\u2f00-\u2fdf\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u3100-\u312f\u3200-\u32ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f]/g

function roughTokenCountEstimation(
  content: string,
  bytesPerToken: number = 4,
): number {
  const cjkMatches = content.match(CJK_REGEX)
  if (!cjkMatches || cjkMatches.length === 0) {
    return Math.round(content.length / bytesPerToken)
  }
  const cjkCount = cjkMatches.length
  const nonCjkLength = content.length - cjkCount
  // CJK chars: ~1.5 tokens each; non-CJK: use caller-supplied ratio
  return Math.round(nonCjkLength / bytesPerToken + cjkCount * 1.5)
}

/** El subconjunto estructural de `Command` que la función lee — ver cabecera. */
export type SkillFrontmatter = {
  name: string
  description: string
  whenToUse?: string
}

/**
 * Estimates token count for a skill based on frontmatter only
 * (name, description, whenToUse) since full content is only loaded on invocation.
 */
export function estimateSkillFrontmatterTokens(
  skill: SkillFrontmatter,
): number {
  const frontmatterText = [skill.name, skill.description, skill.whenToUse]
    .filter(Boolean)
    .join(' ')
  return roughTokenCountEstimation(frontmatterText)
}

// Segundo porte de `EFFORT_LEVELS`/`parseEffortValue` (fuente:
// `@claude-code-how-works/agent/effort.js`). Su hogar en este árbol es
// `@thyrox/agent/effort.ts`, que `command-runtime` no puede importar en
// tiempo de ejecución (`agent` depende de `command-runtime`, no al revés);
// el passthrough de `@thyrox/config/plugin/_deps.ts` tampoco sirve: es un
// setter con retorno recortado a tres niveles. Copia fiel, declarada.
const EFFORT_LEVELS = ['none', 'low', 'medium', 'high', 'xhigh', 'max'] as const
type EffortLevel = (typeof EFFORT_LEVELS)[number]
export type EffortValue = EffortLevel | number

function isEffortLevel(value: string): value is EffortLevel {
  return (EFFORT_LEVELS as readonly string[]).includes(value)
}

function parseEffortValue(value: unknown): EffortValue | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value
  }
  const str = String(value).toLowerCase()
  if (isEffortLevel(str)) {
    return str
  }
  const numericValue = parseInt(str, 10)
  if (!Number.isNaN(numericValue) && Number.isInteger(numericValue)) {
    return numericValue
  }
  return undefined
}

/**
 * Parse and validate hooks from frontmatter.
 * Returns undefined if hooks are not defined or invalid.
 */
function parseHooksFromFrontmatter(
  frontmatter: FrontmatterData,
  skillName: string,
): HooksSettings | undefined {
  if (!frontmatter.hooks) {
    return undefined
  }

  // La fuente llama `HooksSchema()` (esquema perezoso); el de
  // `@thyrox/config/types` es un `z.object` directo, misma forma de salida.
  const result = HooksSchema.safeParse(frontmatter.hooks)
  if (!result.success) {
    logForDebugging(
      `Invalid hooks in skill '${skillName}': ${result.error.message}`,
    )
    return undefined
  }

  return result.data
}

/**
 * Parse paths frontmatter from a skill, using the same format as CLAUDE.md rules.
 * Returns undefined if no paths are specified or if all patterns are match-all.
 */
export function parseSkillPaths(frontmatter: FrontmatterData): string[] | undefined {
  if (!frontmatter.paths) {
    return undefined
  }

  const patterns = splitPathInFrontmatter(frontmatter.paths)
    .map(pattern => {
      // Remove /** suffix - ignore library treats 'path' as matching both
      // the path itself and everything inside it
      return pattern.endsWith('/**') ? pattern.slice(0, -3) : pattern
    })
    .filter((p: string) => p.length > 0)

  // If all patterns are ** (match-all), treat as no paths (undefined)
  if (patterns.length === 0 || patterns.every((p: string) => p === '**')) {
    return undefined
  }

  return patterns
}

// La fuente escribe `frontmatter.arguments as string | string[] | undefined`;
// bajo `strict` el índice devuelve `unknown`, así que se estrecha midiendo.
function asStringOrStringList(value: unknown): string | string[] | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
    return value
  }
  return undefined
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/**
 * Parses all skill frontmatter fields that are shared between file-based and
 * MCP skill loading. Caller supplies the resolved skill name and the
 * source/loadedFrom/baseDir/paths fields separately.
 */
export function parseSkillFrontmatterFields(
  frontmatter: FrontmatterData,
  markdownContent: string,
  resolvedName: string,
  descriptionFallbackLabel: 'Skill' | 'Custom command' = 'Skill',
): {
  displayName: string | undefined
  description: string
  hasUserSpecifiedDescription: boolean
  allowedTools: string[]
  argumentHint: string | undefined
  argumentNames: string[]
  whenToUse: string | undefined
  version: string | undefined
  model: ReturnType<typeof parseUserSpecifiedModel> | undefined
  disableModelInvocation: boolean
  userInvocable: boolean
  hooks: HooksSettings | undefined
  executionContext: 'fork' | undefined
  agent: string | undefined
  effort: EffortValue | undefined
  shell: FrontmatterShell | undefined
} {
  const validatedDescription = coerceDescriptionToString(
    frontmatter.description,
    resolvedName,
  )
  const description =
    validatedDescription ??
    extractDescriptionFromMarkdown(markdownContent, descriptionFallbackLabel)

  const userInvocable =
    frontmatter['user-invocable'] === undefined
      ? true
      : parseBooleanFrontmatter(frontmatter['user-invocable'])

  const model =
    frontmatter.model === 'inherit'
      ? undefined
      : frontmatter.model
        ? parseUserSpecifiedModel(frontmatter.model)
        : undefined

  const effortRaw = frontmatter['effort']
  const effort =
    effortRaw !== undefined ? parseEffortValue(effortRaw) : undefined
  if (effortRaw !== undefined && effort === undefined) {
    logForDebugging(
      `Skill ${resolvedName} has invalid effort '${effortRaw}'. Valid options: ${EFFORT_LEVELS.join(', ')} or an integer`,
    )
  }

  return {
    displayName:
      frontmatter.name != null ? String(frontmatter.name) : undefined,
    description,
    hasUserSpecifiedDescription: validatedDescription !== null,
    allowedTools: parseSlashCommandToolsFromFrontmatter(
      frontmatter['allowed-tools'],
    ),
    argumentHint:
      frontmatter['argument-hint'] != null
        ? String(frontmatter['argument-hint'])
        : undefined,
    argumentNames: parseArgumentNames(asStringOrStringList(frontmatter.arguments)),
    whenToUse: asOptionalString(frontmatter.when_to_use),
    version: asOptionalString(frontmatter.version),
    model,
    disableModelInvocation: parseBooleanFrontmatter(
      frontmatter['disable-model-invocation'],
    ),
    userInvocable,
    hooks: parseHooksFromFrontmatter(frontmatter, resolvedName),
    executionContext: frontmatter.context === 'fork' ? 'fork' : undefined,
    agent: asOptionalString(frontmatter.agent),
    effort,
    shell: parseShellFrontmatter(frontmatter.shell, resolvedName),
  }
}

// Skills dinámicas (porte de 2.1.275): viven en `dynamicSkills.ts` y se
// exportan desde aquí porque es la ruta que importan los consumidores.
export {
  activateConditionalSkillsForPaths,
  addSkillDirectories,
  discoverSkillDirsForPaths,
  dynamicSkillKey,
  getConditionalSkills,
  getDynamicSkills,
  onDynamicSkillsLoaded,
  registerConditionalSkill,
  setSkillDirectoryLoader,
  type DynamicPromptSkill,
  type LoadedSkill,
  type SkillDirectoryLoader,
} from './dynamicSkills.js'

/** Vacía el estado de skills dinámicas y condicionales. */
export function clearSkillCaches(): void {
  clearDynamicSkills()
}
