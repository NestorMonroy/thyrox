/**
 * Puerto de `ccnmt: packages/memory/src/memdir.ts`, con tres ajustes
 * declarados:
 *
 * 1. Los dos `require()` perezosos guardados por `feature('TEAMMEM')`
 *    (`teamMemPaths`, `teamMemPrompts`) se portan como imports estáticos:
 *    no hay ciclo de import entre este archivo y esos dos en el grafo
 *    portado (`teamMemPaths.ts` no importa de vuelta `memdir.js`;
 *    `teamMemPrompts.ts` importa de `memoryEntrypoint`/`memoryTypes`/
 *    `paths`/`teamMemPaths`, ninguno de los cuales importa `memdir.js`).
 * 2. `getFeatureValue_CACHED_MAY_BE_STALE` / `getInitialSettings` vienen
 *    del sustituto local `./internal/pendingCrossPackageDeps.js`.
 * 3. `readEnv` viene de `@thyrox/config/env/utils` (mismo símbolo, otro
 *    subpath — la fuente lo importa de `config/env`, que en `@thyrox`
 *    reexporta desde `env/utils`).
 */
import { feature } from 'bun:bundle'
import { join } from 'node:path'
import { readEnv } from '@thyrox/config/env/utils'
import { getAutoMemPath, isAutoMemoryEnabled } from './paths.js'
import { getMemoryHostBindings } from './host.js'
import { formatFileSize, isEnvTruthy } from './internalUtils.js'
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getInitialSettings,
} from './internal/pendingCrossPackageDeps.js'
import * as teamMemPathsModule from './teamMemPaths.js'
import * as teamMemPromptsModule from './teamMemPrompts.js'

const teamMemPaths = feature('TEAMMEM') ? teamMemPathsModule : null
const teamMemPrompts = feature('TEAMMEM') ? teamMemPromptsModule : null

/** Tipo de marca opaco para metadata de analítica — no debe contener código ni rutas de archivo. */
type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS = never

import {
  MEMORY_FRONTMATTER_EXAMPLE,
  TRUSTING_RECALL_SECTION,
  TYPES_SECTION_INDIVIDUAL,
  WHAT_NOT_TO_SAVE_SECTION,
  WHEN_TO_ACCESS_SECTION,
} from './memoryTypes.js'

export {
  ENTRYPOINT_NAME,
  MAX_ENTRYPOINT_LINES,
  DIRS_EXIST_GUIDANCE,
  buildSearchingPastContextSection,
} from './memoryEntrypoint.js'
import {
  ENTRYPOINT_NAME,
  MAX_ENTRYPOINT_LINES,
  buildSearchingPastContextSection,
} from './memoryEntrypoint.js'

// ~125 caracteres/línea a 200 líneas. En p97 hoy; atrapa índices de línea
// larga que se cuelan bajo el tope de líneas (p100 observado: 197KB bajo
// 200 líneas).
export const MAX_ENTRYPOINT_BYTES = 25_000
const AUTO_MEM_DISPLAY_NAME = 'auto memory'

export type EntrypointTruncation = {
  content: string
  lineCount: number
  byteCount: number
  wasLineTruncated: boolean
  wasByteTruncated: boolean
}

/**
 * Trunca el contenido de MEMORY.md a los topes de línea Y de byte,
 * agregando una advertencia que nombra cuál tope disparó. Trunca por línea
 * primero (límite natural), luego por byte en el último salto de línea
 * antes del tope, para no cortar a mitad de línea.
 *
 * Compartido por buildMemoryPrompt y claudemd getMemoryFiles (antes
 * duplicaba la lógica de solo-línea).
 */
export function truncateEntrypointContent(raw: string): EntrypointTruncation {
  const trimmed = raw.trim()
  const contentLines = trimmed.split('\n')
  const lineCount = contentLines.length
  const byteCount = trimmed.length

  const wasLineTruncated = lineCount > MAX_ENTRYPOINT_LINES
  // Verifica el conteo de bytes original — las líneas largas son el modo
  // de fallo que el tope de bytes apunta, así que el tamaño
  // post-truncado-por-línea subestimaría la advertencia.
  const wasByteTruncated = byteCount > MAX_ENTRYPOINT_BYTES

  if (!wasLineTruncated && !wasByteTruncated) {
    return {
      content: trimmed,
      lineCount,
      byteCount,
      wasLineTruncated,
      wasByteTruncated,
    }
  }

  let truncated = wasLineTruncated
    ? contentLines.slice(0, MAX_ENTRYPOINT_LINES).join('\n')
    : trimmed

  if (truncated.length > MAX_ENTRYPOINT_BYTES) {
    const cutAt = truncated.lastIndexOf('\n', MAX_ENTRYPOINT_BYTES)
    truncated = truncated.slice(0, cutAt > 0 ? cutAt : MAX_ENTRYPOINT_BYTES)
  }

  const reason =
    wasByteTruncated && !wasLineTruncated
      ? `${formatFileSize(byteCount)} (limit: ${formatFileSize(MAX_ENTRYPOINT_BYTES)}) — index entries are too long`
      : wasLineTruncated && !wasByteTruncated
        ? `${lineCount} lines (limit: ${MAX_ENTRYPOINT_LINES})`
        : `${lineCount} lines and ${formatFileSize(byteCount)}`

  return {
    content:
      truncated +
      `\n\n> WARNING: ${ENTRYPOINT_NAME} is ${reason}. Only part of it was loaded. Keep index entries to one line under ~200 chars; move detail into topic files.`,
    lineCount,
    byteCount,
    wasLineTruncated,
    wasByteTruncated,
  }
}

/**
 * Texto de guía compartido, agregado al final de cada línea de prompt de
 * directorio de memoria. Se envía porque Claude estaba quemando turnos en
 * `ls`/`mkdir -p` antes de escribir. El harness garantiza que el directorio
 * existe vía ensureMemoryDirExists().
 */
export const DIR_EXISTS_GUIDANCE =
  'This directory already exists — write to it directly with the Write tool (do not run mkdir or check for its existence).'

/**
 * Asegura que un directorio de memoria exista. Idempotente — se llama
 * desde loadMemoryPrompt (una vez por sesión vía la caché de
 * systemPromptSection) para que el modelo siempre pueda escribir sin
 * verificar existencia primero.
 */
export async function ensureMemoryDirExists(memoryDir: string, signal?: AbortSignal): Promise<void> {
  const bindings = getMemoryHostBindings()
  const fs = bindings.getFsImplementation?.()
  if (!fs) return
  try {
    await fs.mkdir(memoryDir)
  } catch (e) {
    const code =
      e instanceof Error && 'code' in e && typeof e.code === 'string'
        ? e.code
        : undefined
    bindings.logDebug?.(
      `ensureMemoryDirExists failed for ${memoryDir}: ${code ?? String(e)}`,
      { level: 'debug' },
    )
  }
}

/**
 * Loguea de forma asíncrona el conteo de archivos/subdirectorios de un
 * directorio de memoria. Fire-and-forget — no bloquea la construcción del
 * prompt.
 */
function logMemoryDirCounts(
  memoryDir: string,
  baseMetadata: Record<
    string,
    | number
    | boolean
    | AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  >,
): void {
  const bindings = getMemoryHostBindings()
  const fs = bindings.getFsImplementation?.()
  if (!fs) return
  void fs.readdir(memoryDir).then(
    dirents => {
      let fileCount = 0
      let subdirCount = 0
      for (const d of dirents) {
        if (d.isFile()) {
          fileCount++
        } else if (d.isDirectory()) {
          subdirCount++
        }
      }
      bindings.logEvent?.('tengu_memdir_loaded', {
        ...baseMetadata,
        total_file_count: fileCount,
        total_subdir_count: subdirCount,
      } as Record<string, number | boolean | string>)
    },
    () => {
      bindings.logEvent?.('tengu_memdir_loaded', baseMetadata as Record<string, number | boolean | string>)
    },
  )
}

/**
 * Construye las instrucciones de comportamiento de memoria tipada (sin el
 * contenido de MEMORY.md).
 */
export function buildMemoryLines(
  displayName: string,
  memoryDir: string,
  extraGuidelines?: string[],
  skipIndex = false,
): string[] {
  const howToSave = skipIndex
    ? [
        '## How to save memories',
        '',
        'Write each memory to its own file (e.g., `user_role.md`, `feedback_testing.md`) using this frontmatter format:',
        '',
        ...MEMORY_FRONTMATTER_EXAMPLE,
        '',
        '- Keep the name, description, and type fields in memory files up-to-date with the content',
        '- Organize memory semantically by topic, not chronologically',
        '- Update or remove memories that turn out to be wrong or outdated',
        '- Do not write duplicate memories. First check if there is an existing memory you can update before writing a new one.',
      ]
    : [
        '## How to save memories',
        '',
        'Saving a memory is a two-step process:',
        '',
        '**Step 1** — write the memory to its own file (e.g., `user_role.md`, `feedback_testing.md`) using this frontmatter format:',
        '',
        ...MEMORY_FRONTMATTER_EXAMPLE,
        '',
        `**Step 2** — add a pointer to that file in \`${ENTRYPOINT_NAME}\`. \`${ENTRYPOINT_NAME}\` is an index, not a memory — each entry should be one line, under ~150 characters: \`- [Title](file.md) — one-line hook\`. It has no frontmatter. Never write memory content directly into \`${ENTRYPOINT_NAME}\`.`,
        '',
        `- \`${ENTRYPOINT_NAME}\` is always loaded into your conversation context — lines after ${MAX_ENTRYPOINT_LINES} will be truncated, so keep the index concise`,
        '- Keep the name, description, and type fields in memory files up-to-date with the content',
        '- Organize memory semantically by topic, not chronologically',
        '- Update or remove memories that turn out to be wrong or outdated',
        '- Do not write duplicate memories. First check if there is an existing memory you can update before writing a new one.',
      ]

  const lines: string[] = [
    `# ${displayName}`,
    '',
    `You have a persistent, file-based memory system at \`${memoryDir}\`. ${DIR_EXISTS_GUIDANCE}`,
    '',
    "You should build up this memory system over time so that future conversations can have a complete picture of who the user is, how they'd like to collaborate with you, what behaviors to avoid or repeat, and the context behind the work the user gives you.",
    '',
    'If the user explicitly asks you to remember something, save it immediately as whichever type fits best. If they ask you to forget something, find and remove the relevant entry.',
    '',
    ...TYPES_SECTION_INDIVIDUAL,
    ...WHAT_NOT_TO_SAVE_SECTION,
    '',
    ...howToSave,
    '',
    ...WHEN_TO_ACCESS_SECTION,
    '',
    ...TRUSTING_RECALL_SECTION,
    '',
    '## Memory and other forms of persistence',
    'Memory is one of several persistence mechanisms available to you as you assist the user in a given conversation. The distinction is often that memory can be recalled in future conversations and should not be used for persisting information that is only useful within the scope of the current conversation.',
    '- When to use or update a plan instead of memory: If you are about to start a non-trivial implementation task and would like to reach alignment with the user on your approach you should use a Plan rather than saving this information to memory. Similarly, if you already have a plan within the conversation and you have changed your approach persist that change by updating the plan rather than saving a memory.',
    '- When to use or update tasks instead of memory: When you need to break your work in current conversation into discrete steps or keep track of your progress use tasks instead of saving to memory. Tasks are great for persisting information about the work that needs to be done in the current conversation, but memory should be reserved for information that will be useful in future conversations.',
    '',
    ...(extraGuidelines ?? []),
    '',
  ]

  lines.push(...buildSearchingPastContextSection(memoryDir))

  return lines
}

/**
 * Construye el prompt de memoria tipada con el contenido de MEMORY.md
 * incluido. Usado por memoria de agente (que no tiene equivalente de
 * getClaudeMds()).
 */
export function buildMemoryPrompt(params: {
  displayName: string
  memoryDir: string
  extraGuidelines?: string[]
}): string {
  const { displayName, memoryDir, extraGuidelines } = params
  const bindings = getMemoryHostBindings()
  const fs = bindings.getFsImplementation?.()
  const entrypoint = memoryDir + ENTRYPOINT_NAME

  // Lee el entrypoint de memoria existente (sync: construir el prompt es
  // síncrono).
  let entrypointContent = ''
  if (fs) {
    try {
      entrypointContent = fs.readFileSync(entrypoint, { encoding: 'utf-8' })
    } catch {
      // Aún no hay archivo de memoria.
    }
  }

  const lines = buildMemoryLines(displayName, memoryDir, extraGuidelines)

  if (entrypointContent.trim()) {
    const t = truncateEntrypointContent(entrypointContent)
    const memoryType = displayName === AUTO_MEM_DISPLAY_NAME ? 'auto' : 'agent'
    logMemoryDirCounts(memoryDir, {
      content_length: t.byteCount,
      line_count: t.lineCount,
      was_truncated: t.wasLineTruncated,
      was_byte_truncated: t.wasByteTruncated,
      memory_type:
        memoryType as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
    lines.push(`## ${ENTRYPOINT_NAME}`, '', t.content)
  } else {
    lines.push(
      `## ${ENTRYPOINT_NAME}`,
      '',
      `Your ${ENTRYPOINT_NAME} is currently empty. When you save new memories, they will appear here.`,
    )
  }

  return lines.join('\n')
}

/**
 * Prompt de bitácora diaria en modo asistente. Condicionado por
 * feature('KAIROS').
 */
function buildAssistantDailyLogPrompt(skipIndex = false): string {
  const memoryDir = getAutoMemPath()
  const logPathPattern = join(memoryDir, 'logs', 'YYYY', 'MM', 'YYYY-MM-DD.md')

  const lines: string[] = [
    '# auto memory',
    '',
    `You have a persistent, file-based memory system found at: \`${memoryDir}\``,
    '',
    "This session is long-lived. As you work, record anything worth remembering by **appending** to today's daily log file:",
    '',
    `\`${logPathPattern}\``,
    '',
    "Substitute today's date (from `currentDate` in your context) for `YYYY-MM-DD`. When the date rolls over mid-session, start appending to the new day's file.",
    '',
    'Write each entry as a short timestamped bullet. Create the file (and parent directories) on first write if it does not exist. Do not rewrite or reorganize the log — it is append-only. A separate nightly process distills these logs into `MEMORY.md` and topic files.',
    '',
    '## What to log',
    '- User corrections and preferences ("use bun, not npm"; "stop summarizing diffs")',
    '- Facts about the user, their role, or their goals',
    '- Project context that is not derivable from the code (deadlines, incidents, decisions and their rationale)',
    '- Pointers to external systems (dashboards, Linear projects, Slack channels)',
    '- Anything the user explicitly asks you to remember',
    '',
    ...WHAT_NOT_TO_SAVE_SECTION,
    '',
    ...(skipIndex
      ? []
      : [
          `## ${ENTRYPOINT_NAME}`,
          `\`${ENTRYPOINT_NAME}\` is the distilled index (maintained nightly from your logs) and is loaded into your context automatically. Read it for orientation, but do not edit it directly — record new information in today's log instead.`,
          '',
        ]),
    ...buildSearchingPastContextSection(memoryDir),
  ]

  return lines.join('\n')
}

/**
 * Carga el prompt de memoria unificado para incluirlo en el prompt de
 * sistema.
 */
export async function loadMemoryPrompt(signal?: AbortSignal): Promise<string | null> {
  const autoEnabled = isAutoMemoryEnabled()
  const bindings = getMemoryHostBindings()

  const skipIndex = getFeatureValue_CACHED_MAY_BE_STALE(
    'tengu_moth_copse',
    false,
  )

  if (feature('KAIROS') && autoEnabled && (bindings.getKairosActive?.() ?? false)) {
    logMemoryDirCounts(getAutoMemPath(), {
      memory_type:
        'auto' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
    return buildAssistantDailyLogPrompt(skipIndex)
  }

  const coworkExtraGuidelines = readEnv('CLAUDE_COWORK_MEMORY_EXTRA_GUIDELINES')
  const extraGuidelines =
    coworkExtraGuidelines && coworkExtraGuidelines.trim().length > 0
      ? [coworkExtraGuidelines]
      : undefined

  if (feature('TEAMMEM')) {
    if (teamMemPaths!.isTeamMemoryEnabled()) {
      const autoDir = getAutoMemPath()
      const teamDir = teamMemPaths!.getTeamMemPath()
      await ensureMemoryDirExists(teamDir)
      logMemoryDirCounts(autoDir, {
        memory_type:
          'auto' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      })
      logMemoryDirCounts(teamDir, {
        memory_type:
          'team' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      })
      return teamMemPrompts!.buildCombinedMemoryPrompt(
        extraGuidelines,
        skipIndex,
      )
    }
  }

  if (autoEnabled) {
    const autoDir = getAutoMemPath()
    await ensureMemoryDirExists(autoDir)
    logMemoryDirCounts(autoDir, {
      memory_type:
        'auto' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
    return buildMemoryLines(
      'auto memory',
      autoDir,
      extraGuidelines,
      skipIndex,
    ).join('\n')
  }

  bindings.logEvent?.('tengu_memdir_disabled', {
    disabled_by_env_var: isEnvTruthy(
      readEnv('CLAUDE_CODE_DISABLE_AUTO_MEMORY'),
    ),
    disabled_by_setting:
      !isEnvTruthy(readEnv('CLAUDE_CODE_DISABLE_AUTO_MEMORY')) &&
      getInitialSettings().autoMemoryEnabled === false,
  })
  if (getFeatureValue_CACHED_MAY_BE_STALE('tengu_herring_clock', false)) {
    bindings.logEvent?.('tengu_team_memdir_disabled', {})
  }
  return null
}
