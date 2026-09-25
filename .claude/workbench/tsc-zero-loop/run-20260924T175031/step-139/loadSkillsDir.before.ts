import { realpath } from 'fs/promises'
import { homedir } from 'os'
import { basename, dirname, join, sep as pathSep } from 'path'
import { isSettingSourceEnabled } from '@thyrox/config/constants'
import { isBareMode, isEnvTruthy } from '@thyrox/config/env/utils'
import {
  coerceDescriptionToString,
  type FrontmatterData,
  type FrontmatterShell,
  parseBooleanFrontmatter,
  parseFrontmatter,
  parseShellFrontmatter,
  splitPathInFrontmatter,
} from '@thyrox/config/frontmatterParser.js'
import { isRestrictedToPluginOnly } from '@thyrox/config/pluginOnlyPolicy'
import { HooksSchema, type HooksSettings } from '@thyrox/config/types'
import { extractDescriptionFromMarkdown } from '@thyrox/config/utils/markdownDescription.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { isENOENT, isFsInaccessible } from '@thyrox/local-observability/errorHelpers.js'
import { logError } from '@thyrox/local-observability/logging'
import { parseUserSpecifiedModel } from '@thyrox/provider/model.js'
import { getFsImplementation } from '@thyrox/storage/fsOperations'
import {
  getProjectDirsUpToHome,
  loadMarkdownFilesForSubdir,
  type MarkdownFile,
  parseSlashCommandToolsFromFrontmatter,
} from '@thyrox/tool-registry/markdownConfigLoader.js'
import {
  getAdditionalDirectoriesForClaudeMd,
  getSessionId,
} from '@thyrox/app-host/bootstrap/state.js'
import type { Command, PromptCommand } from '@thyrox/agent/command.js'
import { parseArgumentNames, substituteArguments } from '../argumentSubstitution.js'
import { executeShellCommandsInPrompt } from '../promptShellExecution.js'
import {
  clearDynamicSkills,
  type DynamicPromptSkill,
  getConditionalSkills,
  isConditionalSkillActivated,
  type LoadedSkill,
  registerConditionalSkill,
  setSkillDirectoryLoader,
} from './dynamicSkills.js'
import { registerMCPSkillBuilders } from './mcpSkillBuilders.js'
import { getManagedFilePath } from './managedPath.js'

/**
 * Porte de `ccnmt: packages/command-runtime/src/skills/loadSkillsDir.ts`
 * (1086 líneas). Portado en este archivo, en el orden de la fuente:
 * `LoadedFrom`, `getSkillsPath`, `estimateSkillFrontmatterTokens`,
 * `parseHooksFromFrontmatter`, `parseSkillPaths`, `parseSkillFrontmatterFields`,
 * `createSkillCommand`, `loadSkillsFromSkillsDir`, el cargador heredado de
 * `/commands/` (`transformSkillFiles`, los nombres con namespace,
 * `loadSkillsFromCommandsDir`), `getSkillDirCommands` con su deduplicación
 * por `realpath`, `clearSkillCaches`, `getConditionalSkillCount`, los alias
 * de compatibilidad y el registro `registerMCPSkillBuilders`. La mitad
 * dinámica (`discoverSkillDirsForPaths`, `addSkillDirectories`,
 * `activateConditionalSkillsForPaths`, `getDynamicSkills`,
 * `onDynamicSkillsLoaded`, `clearDynamicSkills`) vive en `dynamicSkills.ts`
 * y se reexporta desde aquí; este archivo le inyecta su cargador de
 * directorio (`setSkillDirectoryLoader`) al cargar el módulo.
 *
 * Suites: `__tests__/loadSkillsDir.behavior.test.ts` (parser y constructor)
 * y `__tests__/loadSkillsDir.loader.test.ts` (directorio temporal real).
 * Cada bloque se escribió en rojo, y cada símbolo tiene su control de
 * anulación: retirado el default de `user-invocable` cae 1 de 8; forzado
 * `isHidden` a `false` cae 1 de 14; retirada la sustitución de
 * `${CLAUDE_SKILL_DIR}` cae otra 1 de 14; retirado el paso de `paths` en el
 * cargador caen exactamente las 2 de 3 que dependen de él.
 *
 * DIVERGENCIAS DECLARADAS:
 * - `parseSkillPaths` y `loadSkillsFromSkillsDir` se exportan (la fuente no)
 *   para medirlos directamente.
 * - `buildSkillPromptText` extrae de `getPromptForCommand` el ensamblado del
 *   prompt (prefijo del directorio base, argumentos, `${CLAUDE_SKILL_DIR}`,
 *   `${CLAUDE_SESSION_ID}`); la ejecución de shell y la guarda MCP quedan en
 *   el método. Forma distinta, misma conducta, medible sin `ToolUseContext`.
 * - La memoización de `getSkillDirCommands` es un `Map` por `cwd` (la fuente
 *   usa `lodash-es/memoize`, que este paquete no declara). Igual que aquélla
 *   guarda la promesa, y `clearSkillCaches` la vacía.
 * - El estado de skills condicionales vive en `dynamicSkills.ts`; la fuente
 *   lo lleva aquí. Se consulta por `registerConditionalSkill` /
 *   `isConditionalSkillActivated`, y `getConditionalSkillCount` lo deriva.
 * - `getDynamicSkills` devuelve el `DynamicPromptSkill` de `dynamicSkills.ts`,
 *   no `Command`: la firma que el consumidor (`commandRegistryRuntime.ts`)
 *   espera sigue sin cerrarse desde este archivo.
 * - `HooksSchema` de `@thyrox/config/types` es un `z.object` directo; la
 *   fuente llama un esquema perezoso `HooksSchema()`.
 * - Bajo `strict`, los `as` de la fuente sobre el índice del frontmatter se
 *   sustituyen por dos helpers de estrechamiento (`asStringOrStringList`,
 *   `asOptionalString`); `skillFiles[0]!` pasa a una lectura comprobada.
 * - `isPathGitignored` (`../gitignore.js`) no se importa: sólo lo usa la
 *   mitad dinámica, que ya resuelve el `git check-ignore` por su cuenta.
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
  let dir = cachedHomeDir
  if (cachedHomeDirKey !== key || dir === undefined) {
    dir = (key ?? join(homedir(), '.claude')).normalize('NFC')
    cachedHomeDirKey = key
    cachedHomeDir = dir
  }
  return dir
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

export type LoadedFrom =
  | 'commands_DEPRECATED'
  | 'skills'
  | 'plugin'
  | 'managed'
  | 'bundled'
  | 'mcp'

/**
 * El texto del prompt ANTES de ejecutar los bloques de shell: prefijo del
 * directorio base, sustitución de argumentos y de `${CLAUDE_SKILL_DIR}` /
 * `${CLAUDE_SESSION_ID}`. En la fuente vive en línea dentro de
 * `getPromptForCommand`; se extrae para poder medirlo sin construir un
 * `ToolUseContext` completo (divergencia de forma, no de conducta).
 */
export function buildSkillPromptText({
  markdownContent,
  baseDir,
  args,
  argumentNames,
}: {
  markdownContent: string
  baseDir: string | undefined
  args: string
  argumentNames: string[]
}): string {
  let finalContent = baseDir
    ? `Base directory for this skill: ${baseDir}\n\n${markdownContent}`
    : markdownContent

  finalContent = substituteArguments(finalContent, args, true, argumentNames)

  // Replace ${CLAUDE_SKILL_DIR} with the skill's own directory so bash
  // injection (!`...`) can reference bundled scripts. Normalize backslashes
  // to forward slashes on Windows so shell commands don't treat them as escapes.
  if (baseDir) {
    const skillDir =
      process.platform === 'win32' ? baseDir.replace(/\\/g, '/') : baseDir
    finalContent = finalContent.replace(/\$\{CLAUDE_SKILL_DIR\}/g, skillDir)
  }

  // Replace ${CLAUDE_SESSION_ID} with the current session ID
  return finalContent.replace(/\$\{CLAUDE_SESSION_ID\}/g, getSessionId())
}

/**
 * Creates a skill command from parsed data
 */
export function createSkillCommand({
  skillName,
  displayName,
  description,
  hasUserSpecifiedDescription,
  markdownContent,
  allowedTools,
  argumentHint,
  argumentNames,
  whenToUse,
  version,
  model,
  disableModelInvocation,
  userInvocable,
  source,
  baseDir,
  loadedFrom,
  hooks,
  executionContext,
  agent,
  paths,
  effort,
  shell,
}: {
  skillName: string
  displayName: string | undefined
  description: string
  hasUserSpecifiedDescription: boolean
  markdownContent: string
  allowedTools: string[]
  argumentHint: string | undefined
  argumentNames: string[]
  whenToUse: string | undefined
  version: string | undefined
  model: string | undefined
  disableModelInvocation: boolean
  userInvocable: boolean
  source: PromptCommand['source']
  baseDir: string | undefined
  loadedFrom: LoadedFrom
  hooks: HooksSettings | undefined
  executionContext: 'inline' | 'fork' | undefined
  agent: string | undefined
  paths: string[] | undefined
  effort: EffortValue | undefined
  shell: FrontmatterShell | undefined
}): Command {
  return {
    type: 'prompt',
    name: skillName,
    description,
    hasUserSpecifiedDescription,
    allowedTools,
    argumentHint,
    argNames: argumentNames.length > 0 ? argumentNames : undefined,
    whenToUse,
    version,
    model,
    disableModelInvocation,
    userInvocable,
    context: executionContext,
    agent,
    effort,
    paths,
    contentLength: markdownContent.length,
    isHidden: !userInvocable,
    progressMessage: 'running',
    userFacingName(): string {
      return displayName || skillName
    },
    source,
    loadedFrom,
    hooks,
    skillRoot: baseDir,
    async getPromptForCommand(args, toolUseContext) {
      let finalContent = buildSkillPromptText({
        markdownContent,
        baseDir,
        args,
        argumentNames,
      })

      // Security: MCP skills are remote and untrusted — never execute inline
      // shell commands (!`…` / ```! … ```) from their markdown body.
      // ${CLAUDE_SKILL_DIR} is meaningless for MCP skills anyway.
      if (loadedFrom !== 'mcp') {
        finalContent = await executeShellCommandsInPrompt(
          finalContent,
          {
            ...toolUseContext,
            getAppState() {
              const appState = toolUseContext.getAppState()
              return {
                ...appState,
                toolPermissionContext: {
                  ...appState.toolPermissionContext,
                  alwaysAllowRules: {
                    ...appState.toolPermissionContext.alwaysAllowRules,
                    command: allowedTools,
                  },
                },
              }
            },
          },
          `/${skillName}`,
          shell,
        )
      }

      return [{ type: 'text', text: finalContent }]
    },
  } satisfies Command
}

/**
 * Gets a unique identifier for a file by resolving symlinks to a canonical path.
 * This allows detection of duplicate files accessed through different paths
 * (e.g., via symlinks or overlapping parent directories).
 * Returns null if the file doesn't exist or can't be resolved.
 *
 * Uses realpath to resolve symlinks, which is filesystem-agnostic and avoids
 * issues with filesystems that report unreliable inode values (e.g., inode 0 on
 * some virtual/container/NFS filesystems, or precision loss on ExFAT).
 */
async function getFileIdentity(filePath: string): Promise<string | null> {
  try {
    return await realpath(filePath)
  } catch {
    return null
  }
}

// Internal type to track skill with its file path for deduplication
export type SkillWithPath = {
  skill: Command
  filePath: string
}

/**
 * Loads skills from a /skills/ directory path.
 * Only supports directory format: skill-name/SKILL.md
 *
 * La fuente no lo exporta; aquí sí, para medirlo sobre un directorio real
 * (`__tests__/loadSkillsDir.loader.test.ts`).
 */
export async function loadSkillsFromSkillsDir(
  basePath: string,
  source: SettingSource,
): Promise<SkillWithPath[]> {
  const fs = getFsImplementation()

  let entries
  try {
    entries = await fs.readdir(basePath)
  } catch (e: unknown) {
    if (!isFsInaccessible(e)) logError(e)
    return []
  }

  const results = await Promise.all(
    entries.map(async (entry): Promise<SkillWithPath | null> => {
      try {
        // Only support directory format: skill-name/SKILL.md
        if (!entry.isDirectory() && !entry.isSymbolicLink()) {
          // Single .md files are NOT supported in /skills/ directory
          return null
        }

        const skillDirPath = join(basePath, entry.name)
        const skillFilePath = join(skillDirPath, 'SKILL.md')

        let content: string
        try {
          content = await fs.readFile(skillFilePath, { encoding: 'utf-8' })
        } catch (e: unknown) {
          // SKILL.md doesn't exist, skip this entry. Log non-ENOENT errors
          // (EACCES/EPERM/EIO) so permission/IO problems are diagnosable.
          if (!isENOENT(e)) {
            logForDebugging(`[skills] failed to read ${skillFilePath}: ${e}`, {
              level: 'warn',
            })
          }
          return null
        }

        const { frontmatter, content: markdownContent } = parseFrontmatter(
          content,
          skillFilePath,
        )

        const skillName = entry.name
        const parsed = parseSkillFrontmatterFields(
          frontmatter,
          markdownContent,
          skillName,
        )
        const paths = parseSkillPaths(frontmatter)

        return {
          skill: createSkillCommand({
            ...parsed,
            skillName,
            markdownContent,
            source,
            baseDir: skillDirPath,
            loadedFrom: 'skills',
            paths,
          }),
          filePath: skillFilePath,
        }
      } catch (error) {
        logError(error)
        return null
      }
    }),
  )

  return results.filter((r): r is SkillWithPath => r !== null)
}

// --- Legacy /commands/ loader ---

function isSkillFile(filePath: string): boolean {
  return /^skill\.md$/i.test(basename(filePath))
}

/**
 * Transforms markdown files to handle "skill" commands in legacy /commands/ folder.
 * When a SKILL.md file exists in a directory, only that file is loaded
 * and it takes the name of its parent directory.
 */
function transformSkillFiles(files: MarkdownFile[]): MarkdownFile[] {
  const filesByDir = new Map<string, MarkdownFile[]>()

  for (const file of files) {
    const dir = dirname(file.filePath)
    const dirFiles = filesByDir.get(dir) ?? []
    dirFiles.push(file)
    filesByDir.set(dir, dirFiles)
  }

  const result: MarkdownFile[] = []

  for (const [dir, dirFiles] of filesByDir) {
    const skillFiles = dirFiles.filter(f => isSkillFile(f.filePath))
    const skillFile = skillFiles[0]
    if (skillFile !== undefined) {
      if (skillFiles.length > 1) {
        logForDebugging(
          `Multiple skill files found in ${dir}, using ${basename(skillFile.filePath)}`,
        )
      }
      result.push(skillFile)
    } else {
      result.push(...dirFiles)
    }
  }

  return result
}

function buildNamespace(targetDir: string, baseDir: string): string {
  const normalizedBaseDir = baseDir.endsWith(pathSep)
    ? baseDir.slice(0, -1)
    : baseDir

  if (targetDir === normalizedBaseDir) {
    return ''
  }

  const relativePath = targetDir.slice(normalizedBaseDir.length + 1)
  return relativePath ? relativePath.split(pathSep).join(':') : ''
}

function getSkillCommandName(filePath: string, baseDir: string): string {
  const skillDirectory = dirname(filePath)
  const parentOfSkillDir = dirname(skillDirectory)
  const commandBaseName = basename(skillDirectory)

  const namespace = buildNamespace(parentOfSkillDir, baseDir)
  return namespace ? `${namespace}:${commandBaseName}` : commandBaseName
}

function getRegularCommandName(filePath: string, baseDir: string): string {
  const fileName = basename(filePath)
  const fileDirectory = dirname(filePath)
  const commandBaseName = fileName.replace(/\.md$/, '')

  const namespace = buildNamespace(fileDirectory, baseDir)
  return namespace ? `${namespace}:${commandBaseName}` : commandBaseName
}

function getCommandName(file: MarkdownFile): string {
  const isSkill = isSkillFile(file.filePath)
  return isSkill
    ? getSkillCommandName(file.filePath, file.baseDir)
    : getRegularCommandName(file.filePath, file.baseDir)
}

/**
 * Loads skills from legacy /commands/ directories.
 * Supports both directory format (SKILL.md) and single .md file format.
 * Commands from /commands/ default to user-invocable: true
 */
async function loadSkillsFromCommandsDir(
  cwd: string,
): Promise<SkillWithPath[]> {
  try {
    const markdownFiles = await loadMarkdownFilesForSubdir('commands', cwd)
    const processedFiles = transformSkillFiles(markdownFiles)

    const skills: SkillWithPath[] = []

    for (const {
      baseDir,
      filePath,
      frontmatter,
      content,
      source,
    } of processedFiles) {
      try {
        const isSkillFormat = isSkillFile(filePath)
        const skillDirectory = isSkillFormat ? dirname(filePath) : undefined
        const cmdName = getCommandName({
          baseDir,
          filePath,
          frontmatter,
          content,
          source,
        })

        const parsed = parseSkillFrontmatterFields(
          frontmatter,
          content,
          cmdName,
          'Custom command',
        )

        skills.push({
          skill: createSkillCommand({
            ...parsed,
            skillName: cmdName,
            displayName: undefined,
            markdownContent: content,
            source,
            baseDir: skillDirectory,
            loadedFrom: 'commands_DEPRECATED',
            paths: undefined,
          }),
          filePath,
        })
      } catch (error) {
        logError(error)
      }
    }

    return skills
  } catch (error) {
    logError(error)
    return []
  }
}

// Memoización por `cwd`, a mano: la fuente usa `lodash-es/memoize`, que este
// paquete no declara. Igual que aquélla, guarda la PROMESA, así que dos
// llamadas con el mismo `cwd` resuelven al mismo arreglo.
const skillDirCommandsCache = new Map<string, Promise<Command[]>>()

/**
 * Loads all skills from both /skills/ and legacy /commands/ directories.
 *
 * Skills from /skills/ directories:
 * - Only support directory format: skill-name/SKILL.md
 * - Default to user-invocable: true (can opt-out with user-invocable: false)
 *
 * Skills from legacy /commands/ directories:
 * - Support both directory format (SKILL.md) and single .md file format
 * - Default to user-invocable: true (user can type /cmd)
 *
 * @param cwd Current working directory for project directory traversal
 */
export function getSkillDirCommands(cwd: string): Promise<Command[]> {
  const cached = skillDirCommandsCache.get(cwd)
  if (cached !== undefined) return cached
  const loading = loadSkillDirCommands(cwd)
  skillDirCommandsCache.set(cwd, loading)
  return loading
}

async function loadSkillDirCommands(cwd: string): Promise<Command[]> {
  const userSkillsDir = join(getClaudeConfigHomeDir(), 'skills')
  const managedSkillsDir = join(getManagedFilePath(), '.claude', 'skills')
  const projectSkillsDirs = getProjectDirsUpToHome('skills', cwd)

  logForDebugging(
    `Loading skills from: managed=${managedSkillsDir}, user=${userSkillsDir}, project=[${projectSkillsDirs.join(', ')}]`,
  )

  // Load from additional directories (--add-dir)
  const additionalDirs = getAdditionalDirectoriesForClaudeMd()
  const skillsLocked = isRestrictedToPluginOnly('skills')
  const projectSettingsEnabled =
    isSettingSourceEnabled('projectSettings') && !skillsLocked

  // --bare: skip auto-discovery (managed/user/project dir walks + legacy
  // commands-dir). Load ONLY explicit --add-dir paths. Bundled skills
  // register separately. skillsLocked still applies — --bare is not a
  // policy bypass.
  if (isBareMode()) {
    if (additionalDirs.length === 0 || !projectSettingsEnabled) {
      logForDebugging(
        `[bare] Skipping skill dir discovery (${additionalDirs.length === 0 ? 'no --add-dir' : 'projectSettings disabled or skillsLocked'})`,
      )
      return []
    }
    const additionalSkillsNested = await Promise.all(
      additionalDirs.map(dir =>
        loadSkillsFromSkillsDir(
          join(dir, '.claude', 'skills'),
          'projectSettings',
        ),
      ),
    )
    // No dedup needed — explicit dirs, user controls uniqueness.
    return additionalSkillsNested.flat().map(s => s.skill)
  }

  // Load from /skills/ directories, additional dirs, and legacy /commands/ in parallel
  // (all independent — different directories, no shared state)
  const [
    managedSkills,
    userSkills,
    projectSkillsNested,
    additionalSkillsNested,
    legacyCommands,
  ] = await Promise.all([
    isEnvTruthy(process.env.CLAUDE_CODE_DISABLE_POLICY_SKILLS)
      ? Promise.resolve([])
      : loadSkillsFromSkillsDir(managedSkillsDir, 'policySettings'),
    isSettingSourceEnabled('userSettings') && !skillsLocked
      ? loadSkillsFromSkillsDir(userSkillsDir, 'userSettings')
      : Promise.resolve([]),
    projectSettingsEnabled
      ? Promise.all(
          projectSkillsDirs.map(dir =>
            loadSkillsFromSkillsDir(dir, 'projectSettings'),
          ),
        )
      : Promise.resolve([]),
    projectSettingsEnabled
      ? Promise.all(
          additionalDirs.map(dir =>
            loadSkillsFromSkillsDir(
              join(dir, '.claude', 'skills'),
              'projectSettings',
            ),
          ),
        )
      : Promise.resolve([]),
    // Legacy commands-as-skills goes through markdownConfigLoader with
    // subdir='commands', which our agents-only guard there skips. Block
    // here when skills are locked — these ARE skills, regardless of the
    // directory they load from.
    skillsLocked ? Promise.resolve([]) : loadSkillsFromCommandsDir(cwd),
  ])

  // Flatten and combine all skills
  const allSkillsWithPaths = [
    ...managedSkills,
    ...userSkills,
    ...projectSkillsNested.flat(),
    ...additionalSkillsNested.flat(),
    ...legacyCommands,
  ]

  // Deduplicate by resolved path (handles symlinks and duplicate parent directories)
  // Pre-compute file identities in parallel (realpath calls are independent),
  // then dedup synchronously (order-dependent first-wins)
  const fileIds = await Promise.all(
    allSkillsWithPaths.map(({ skill, filePath }) =>
      skill.type === 'prompt'
        ? getFileIdentity(filePath)
        : Promise.resolve(null),
    ),
  )

  const seenFileIds = new Map<string, PromptCommand['source']>()
  const deduplicatedSkills: Command[] = []

  for (let i = 0; i < allSkillsWithPaths.length; i++) {
    const entry = allSkillsWithPaths[i]
    if (entry === undefined || entry.skill.type !== 'prompt') continue
    const { skill } = entry

    const fileId = fileIds[i]
    if (fileId === null || fileId === undefined) {
      deduplicatedSkills.push(skill)
      continue
    }

    const existingSource = seenFileIds.get(fileId)
    if (existingSource !== undefined) {
      logForDebugging(
        `Skipping duplicate skill '${skill.name}' from ${skill.source} (same file already loaded from ${existingSource})`,
      )
      continue
    }

    seenFileIds.set(fileId, skill.source)
    deduplicatedSkills.push(skill)
  }

  const duplicatesRemoved =
    allSkillsWithPaths.length - deduplicatedSkills.length
  if (duplicatesRemoved > 0) {
    logForDebugging(`Deduplicated ${duplicatesRemoved} skills (same file)`)
  }

  // Separate conditional skills (with paths frontmatter) from unconditional ones
  const unconditionalSkills: Command[] = []
  const newConditionalSkills: DynamicPromptSkill[] = []
  for (const skill of deduplicatedSkills) {
    if (
      skill.type === 'prompt' &&
      skill.paths &&
      skill.paths.length > 0 &&
      !isConditionalSkillActivated(skill.name)
    ) {
      newConditionalSkills.push(skill)
    } else {
      unconditionalSkills.push(skill)
    }
  }

  // Store conditional skills for later activation when matching files are touched
  for (const skill of newConditionalSkills) {
    registerConditionalSkill(skill)
  }

  if (newConditionalSkills.length > 0) {
    logForDebugging(
      `[skills] ${newConditionalSkills.length} conditional skills stored (activated when matching files are touched)`,
    )
  }

  logForDebugging(
    `Loaded ${deduplicatedSkills.length} unique skills (${unconditionalSkills.length} unconditional, ${newConditionalSkills.length} conditional, managed: ${managedSkills.length}, user: ${userSkills.length}, project: ${projectSkillsNested.flat().length}, additional: ${additionalSkillsNested.flat().length}, legacy commands: ${legacyCommands.length})`,
  )

  return unconditionalSkills
}

/** Vacía la memoización por `cwd`, la de markdown y el estado dinámico. */
export function clearSkillCaches(): void {
  skillDirCommandsCache.clear()
  loadMarkdownFilesForSubdir.cache.clear?.()
  clearDynamicSkills()
}

/** Gets the number of pending conditional skills (for testing/debugging). */
export function getConditionalSkillCount(): number {
  return getConditionalSkills().length
}

// Backwards-compatible aliases for tests
export { getSkillDirCommands as getCommandDirCommands }
export { clearSkillCaches as clearCommandCaches }
export { transformSkillFiles }

// El cargador de un directorio que `dynamicSkills.ts` declara como costura
// (`Kz` en el binario): el mismo `loadSkillsFromSkillsDir` que usa el
// arranque, con la compuerta de política que la fuente aplica en
// `addSkillDirectories`. Registro de una sola vez, idempotente.
setSkillDirectoryLoader(async (dir: string): Promise<LoadedSkill[]> => {
  if (
    !isSettingSourceEnabled('projectSettings') ||
    isRestrictedToPluginOnly('skills')
  ) {
    logForDebugging(
      '[skills] Dynamic skill discovery skipped: projectSettings disabled or plugin-only policy',
    )
    return []
  }
  const loaded = await loadSkillsFromSkillsDir(dir, 'projectSettings')
  const result: LoadedSkill[] = []
  for (const { skill, filePath } of loaded) {
    if (skill.type === 'prompt') result.push({ skill, filePath })
  }
  return result
})

// Expose createSkillCommand + parseSkillFrontmatterFields to MCP skill
// discovery via a leaf registry module. See mcpSkillBuilders.ts for why this
// indirection exists (a literal dynamic import from mcpSkills.ts fans a single
// edge out into many cycle violations; a variable-specifier dynamic import
// passes dep-cruiser but fails to resolve in Bun-bundled binaries at runtime).
registerMCPSkillBuilders({
  createSkillCommand,
  parseSkillFrontmatterFields,
})

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
