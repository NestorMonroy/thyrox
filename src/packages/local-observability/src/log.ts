/**
 * Puerto de `ccnmt: packages/local-observability/src/log.ts` (165 líneas
 * fuente, 100 % portado). Fachada "V7 §10.3": re-exporta la superficie
 * real de error-logging de `./logging/index.js`, y conserva localmente
 * los helpers de listado/título (`getLogDisplayTitle`, `loadErrorLogs`,
 * `getErrorLogByIndex`) porque dependen de tipos de storage/fileHistory
 * y no son una preocupación de observabilidad — la fuente dice
 * explícitamente "Do not add new logic here — add it in
 * packages/local-observability/".
 *
 * Reapuntados a `@thyrox/*` reales (verificados contra su `package.json`
 * `exports`):
 * - `TICK_TAG` — `@thyrox/command-runtime` exporta `./xml.js`.
 * - `CACHE_PATHS` — `@thyrox/storage` exporta `./cache-paths`.
 *
 * Sustituidos localmente (ver `internal/pendingCrossPackageDeps.ts`):
 * - `LogOption`/`SerializedMessage`/`sortLogs` — de `agent/logsTypes.js`,
 *   `@thyrox/agent` no exporta ese subpath (tipo estructural estrecho).
 * - `stripDisplayTags`/`stripDisplayTagsAllowEmpty` — de
 *   `output/utils/displayTags.js`, `output` en porte concurrente.
 */

import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'

import {
  _resetErrorLogForTesting,
  attachErrorLogSink,
  captureAPIRequest,
  dateToFilename,
  getInMemoryErrors,
  logError,
  logMCPDebug,
  logMCPError,
  type ErrorLogSink,
} from './logging/index.js'

import { TICK_TAG } from '@thyrox/command-runtime/xml.js'
import { CACHE_PATHS } from '@thyrox/storage/cache-paths'
import {
  type LogOption,
  type SerializedMessage,
  sortLogs,
  stripDisplayTags,
  stripDisplayTagsAllowEmpty,
} from './internal/pendingCrossPackageDeps.js'
import { jsonParse } from './slowOperations.js'

// ---------------------------------------------------------------------------
// Re-exports de la API del paquete dueño — preserva todo call site externo
// que aún importe desde `src/utils/log.js` / rutas relativas.
// ---------------------------------------------------------------------------

export {
  _resetErrorLogForTesting,
  attachErrorLogSink,
  captureAPIRequest,
  dateToFilename,
  getInMemoryErrors,
  logError,
  logMCPDebug,
  logMCPError,
}
export type { ErrorLogSink }

// ---------------------------------------------------------------------------
// Helpers de display / listado — se quedan aquí porque dependen de
// LogOption, que arrastra tipos de storage + fileHistory.
// ---------------------------------------------------------------------------

/**
 * Obtiene el título de display de un log/sesión con lógica de fallback.
 * Omite firstPrompt si empieza con un tag de tick/goal (auto-prompt del
 * modo autónomo). Quita tags no aptos para display (como
 * <ide_opened_file>) del resultado. Cae a un session ID truncado cuando
 * no hay otro título disponible.
 */
export function getLogDisplayTitle(
  log: LogOption,
  defaultTitle?: string,
): string {
  const isAutonomousPrompt = log.firstPrompt?.startsWith(`<${TICK_TAG}>`)
  const strippedFirstPrompt = log.firstPrompt
    ? stripDisplayTagsAllowEmpty(log.firstPrompt)
    : ''
  const useFirstPrompt = strippedFirstPrompt && !isAutonomousPrompt
  const title =
    log.agentName ||
    log.customTitle ||
    log.summary ||
    (useFirstPrompt ? strippedFirstPrompt : undefined) ||
    defaultTitle ||
    (isAutonomousPrompt ? 'Autonomous session' : undefined) ||
    (log.sessionId ? log.sessionId.slice(0, 8) : '') ||
    ''
  return stripDisplayTags(title).trim()
}

/** Carga la lista de logs de error. */
export function loadErrorLogs(): Promise<LogOption[]> {
  return loadLogList(CACHE_PATHS.errors())
}

/** Obtiene un log de error por su índice. */
export async function getErrorLogByIndex(
  index: number,
): Promise<LogOption | null> {
  const logs = await loadErrorLogs()
  return logs[index] || null
}

async function loadLogList(path: string): Promise<LogOption[]> {
  let files: Awaited<ReturnType<typeof readdir>>
  try {
    files = await readdir(path, { withFileTypes: true })
  } catch {
    logError(new Error(`No logs found at ${path}`))
    return []
  }
  const logData = await Promise.all(
    files.map(async (file, i) => {
      const fullPath = join(path, String(file.name))
      const content = await readFile(fullPath, { encoding: 'utf8' })
      const messages = jsonParse(content) as SerializedMessage[]
      const firstMessage = messages[0]
      const lastMessage = messages[messages.length - 1]
      const firstPrompt =
        firstMessage?.type === 'user' &&
        typeof firstMessage?.message?.content === 'string'
          ? firstMessage?.message?.content
          : 'No prompt'

      const fileStats = await stat(fullPath)
      const isSidechain = fullPath.includes('sidechain')
      const date = dateToFilename(fileStats.mtime)

      return {
        date,
        fullPath,
        messages,
        value: i,
        created: parseISOString(firstMessage?.timestamp || date),
        modified: lastMessage?.timestamp
          ? parseISOString(lastMessage.timestamp)
          : parseISOString(date),
        firstPrompt:
          firstPrompt.split('\n')[0]?.slice(0, 50) +
            (firstPrompt.length > 50 ? '…' : '') || 'No prompt',
        messageCount: messages.length,
        isSidechain,
      }
    }),
  )

  return sortLogs(logData.filter(_ => _ !== null)).map((_, i) => ({
    ..._,
    value: i,
  }))
}

function parseISOString(s: string): Date {
  const b = s.split(/\D+/)
  return new Date(
    Date.UTC(
      parseInt(b[0]!, 10),
      parseInt(b[1]!, 10) - 1,
      parseInt(b[2]!, 10),
      parseInt(b[3]!, 10),
      parseInt(b[4]!, 10),
      parseInt(b[5]!, 10),
      parseInt(b[6]!, 10),
    ),
  )
}
