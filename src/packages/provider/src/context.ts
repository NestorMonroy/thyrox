/**
 * Porte de `ccnmt: packages/provider/src/context.ts` — sus 5 exportaciones
 * (`getSystemPromptInjection`, `setSystemPromptInjection`, `getGitStatus`,
 * `getSystemContext`, `getUserContext`), ninguna omitida.
 *
 * Divergencias medidas (specifier no resuelve en `@thyrox/*` hoy):
 * - `getMemoryFiles`/`getClaudeMds` (`storage/claudemd.ts`) — el archivo
 *   dest sólo trae `filterInjectedMemoryFiles`/`stripHtmlComments`/
 *   `isMemoryFilePath`/`getLargeMemoryFiles` (porte parcial, fuera de
 *   alcance). Se usa `require()` diferido apuntando al mismo subpath.
 * - `getBranch`/`getDefaultBranch`/`getIsGit`/`gitExe` (`storage/git.ts`) —
 *   el dest sólo trae `normalizeGitRemoteUrl`. `require()` diferido.
 * - `execFileNoThrow` SÍ resuelve (`@thyrox/shell/execFileNoThrow.js`) —
 *   import estático.
 * - `getAdditionalDirectoriesForClaudeMd`/`setCachedClaudeMdContent`
 *   (`app-host/bootstrap/state.js`) — zona prohibida (la escribe otro
 *   agente en paralelo esta sesión). `require()` diferido.
 * - `getLocalISODate`/`isBareMode`/`shouldIncludeGitInstructions` — no
 *   están en `@thyrox/config` hoy; sustitutos fieles en
 *   `internal/pendingCrossPackageDeps.ts`.
 * - `feature('BREAK_CACHE_COMMAND')` (`bun:bundle`) — macro de build de
 *   Bun; sin ese define en este árbol se resuelve `false` (constante
 *   local), que es el valor que el propio macro produce cuando la flag no
 *   está activa.
 */

import memoize from 'lodash-es/memoize.js'
import { logError, logForDiagnosticsNoPII } from '@thyrox/local-observability/logging'
import { isEnvTruthy, readEnv } from '@thyrox/config/env/utils'
import { filterInjectedMemoryFiles } from '@thyrox/storage/claudemd.js'
import { execFileNoThrow } from '@thyrox/shell/execFileNoThrow.js'
import {
  getLocalISODate,
  isBareMode,
  shouldIncludeGitInstructions,
} from './internal/pendingCrossPackageDeps.ts'

const MAX_STATUS_CHARS = 2000
const BREAK_CACHE_COMMAND = false

// Inyección de system prompt para cache-breaking (estado efímero de debug).
let systemPromptInjection: string | null = null

export function getSystemPromptInjection(): string | null {
  return systemPromptInjection
}

export function setSystemPromptInjection(value: string | null): void {
  systemPromptInjection = value
  getUserContext.cache.clear?.()
  getSystemContext.cache.clear?.()
}

function requireGit(): {
  getBranch: () => Promise<string>
  getDefaultBranch: () => Promise<string>
  getIsGit: () => Promise<boolean>
  gitExe: () => string
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/storage/git.js')
}

export const getGitStatus = memoize(async (): Promise<string | null> => {
  if (readEnv('NODE_ENV') === 'test') {
    return null
  }

  const startTime = Date.now()
  logForDiagnosticsNoPII('info', 'git_status_started')

  const { getBranch, getDefaultBranch, getIsGit, gitExe } = requireGit()

  const isGitStart = Date.now()
  const isGit = await getIsGit()
  logForDiagnosticsNoPII('info', 'git_is_git_check_completed', {
    duration_ms: Date.now() - isGitStart,
    is_git: isGit,
  })

  if (!isGit) {
    logForDiagnosticsNoPII('info', 'git_status_skipped_not_git', {
      duration_ms: Date.now() - startTime,
    })
    return null
  }

  try {
    const gitCmdsStart = Date.now()
    const [branch, mainBranch, status, log, userName] = await Promise.all([
      getBranch(),
      getDefaultBranch(),
      execFileNoThrow(gitExe(), ['--no-optional-locks', 'status', '--short'], {
        preserveOutputOnError: false,
      }).then(({ stdout }) => stdout.trim()),
      execFileNoThrow(gitExe(), ['--no-optional-locks', 'log', '--oneline', '-n', '5'], {
        preserveOutputOnError: false,
      }).then(({ stdout }) => stdout.trim()),
      execFileNoThrow(gitExe(), ['config', 'user.name'], {
        preserveOutputOnError: false,
      }).then(({ stdout }) => stdout.trim()),
    ])

    logForDiagnosticsNoPII('info', 'git_commands_completed', {
      duration_ms: Date.now() - gitCmdsStart,
      status_length: status.length,
    })

    const truncatedStatus =
      status.length > MAX_STATUS_CHARS
        ? status.substring(0, MAX_STATUS_CHARS) +
          '\n... (truncated because it exceeds 2k characters. If you need more information, run "git status" using BashTool)'
        : status

    logForDiagnosticsNoPII('info', 'git_status_completed', {
      duration_ms: Date.now() - startTime,
      truncated: status.length > MAX_STATUS_CHARS,
    })

    return [
      `This is the git status at the start of the conversation. Note that this status is a snapshot in time, and will not update during the conversation.`,
      `Current branch: ${branch}`,
      `Main branch (you will usually use this for PRs): ${mainBranch}`,
      ...(userName ? [`Git user: ${userName}`] : []),
      `Status:\n${truncatedStatus || '(clean)'}`,
      `Recent commits:\n${log}`,
    ].join('\n\n')
  } catch (error) {
    logForDiagnosticsNoPII('error', 'git_status_failed', {
      duration_ms: Date.now() - startTime,
    })
    logError(error)
    return null
  }
})

/** Contexto que se antepone a cada conversación; cacheado por su duración. */
export const getSystemContext = memoize(async (): Promise<{ [k: string]: string }> => {
  const startTime = Date.now()
  logForDiagnosticsNoPII('info', 'system_context_started')

  const gitStatus =
    isEnvTruthy(readEnv('CLAUDE_CODE_REMOTE')) || !shouldIncludeGitInstructions()
      ? null
      : await getGitStatus()

  const injection = BREAK_CACHE_COMMAND ? getSystemPromptInjection() : null

  logForDiagnosticsNoPII('info', 'system_context_completed', {
    duration_ms: Date.now() - startTime,
    has_git_status: gitStatus !== null,
    has_injection: injection !== null,
  })

  return {
    ...(gitStatus && { gitStatus }),
    ...(BREAK_CACHE_COMMAND && injection ? { cacheBreaker: `[CACHE_BREAKER: ${injection}]` } : {}),
  }
})

function requireAppHostState(): {
  getAdditionalDirectoriesForClaudeMd: () => string[]
  setCachedClaudeMdContent: (content: string | null) => void
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/app-host/bootstrap/state.js')
}

function requireClaudemd(): {
  getMemoryFiles: () => Promise<unknown[]>
  getClaudeMds: (files: unknown[]) => string
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/storage/claudemd.js')
}

/** Contexto que se antepone a cada conversación; cacheado por su duración. */
export const getUserContext = memoize(async (): Promise<{ [k: string]: string }> => {
  const startTime = Date.now()
  logForDiagnosticsNoPII('info', 'user_context_started')

  const { getAdditionalDirectoriesForClaudeMd, setCachedClaudeMdContent } = requireAppHostState()
  const { getMemoryFiles, getClaudeMds } = requireClaudemd()

  const shouldDisableClaudeMd =
    isEnvTruthy(readEnv('CLAUDE_CODE_DISABLE_CLAUDE_MDS')) ||
    (isBareMode() && getAdditionalDirectoriesForClaudeMd().length === 0)
  const memoryFiles = shouldDisableClaudeMd ? [] : await getMemoryFiles()
  const claudeMdFiles = filterInjectedMemoryFiles(
    memoryFiles as Parameters<typeof filterInjectedMemoryFiles>[0],
  ).filter(f => f.type !== 'AutoMem' && f.type !== 'TeamMem')
  const claudeMd = shouldDisableClaudeMd ? null : getClaudeMds(claudeMdFiles)
  setCachedClaudeMdContent(claudeMd || null)

  logForDiagnosticsNoPII('info', 'user_context_completed', {
    duration_ms: Date.now() - startTime,
    claudemd_length: claudeMd?.length ?? 0,
    claudemd_disabled: Boolean(shouldDisableClaudeMd),
  })

  return {
    ...(claudeMd && { claudeMd }),
    currentDate: `Today's date is ${getLocalISODate()}.`,
  }
})
