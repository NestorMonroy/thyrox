/**
 * Puerto de `ccnmt: packages/local-observability/src/aggregates/stats.ts`
 * (1061 líneas fuente). Agrega estadísticas de uso de Claude Code a
 * través de todas las sesiones — la más citada de las 6 subpaths de
 * `aggregates/` en el censo de futuros consumidores (`stats.js`: 1 línea
 * directa, pero `DailyActivity`/`SessionStats` los consumen `heatmap.ts`
 * y `statsCache.ts` de este mismo paquete).
 *
 * NO PORTADO: la rama `feature('SHOT_STATS')` (5 sitios: extracción del
 * conteo de shots desde atribución de PR, `shotDistribution`,
 * `oneShotRate`) — macro de `bun:bundle` ausente en este árbol, resuelve
 * siempre `false` fuera de un build ant. Los campos opcionales
 * `shotDistribution`/`oneShotRate` de `ClaudeCodeStats` SÍ se conservan
 * en el tipo (contrato público); el código que los puebla nunca se
 * alcanza.
 *
 * Sustituidos localmente (`internal/pendingCrossPackageDeps.ts`):
 * - `ModelUsage` — tipo estructural estrecho, `headless-sdk` no existe
 *   en este árbol.
 * - `Entry`/`TranscriptMessage` — tipo estructural estrecho,
 *   `@thyrox/agent` no exporta `./logsTypes`.
 * - `getFsImplementation` — storage/fsOperations, subpath no exportado.
 * - `readJSONLFile` — storage/json.js, subpath no exportado; sustituto
 *   más simple (sin camino rápido nativo de Bun ni recuperación de línea
 *   corrupta parcial — divergencia declarada en el propio sustituto).
 * - `SYNTHETIC_MODEL` — agent/messagesConstants.js, no exportado.
 * - `getProjectsDir`/`isTranscriptMessage` — storage/sessionStorage.js
 *   / sessionStoragePredicates.js, no exportados.
 *
 * NO IMPORTADO (a propósito): `SHELL_TOOL_NAMES` —
 * `shell/legacy/shellToolUtils.js`, no exportado por `@thyrox/shell`.
 * Su único call site en la fuente es `extractShotCountFromMessages`,
 * que vive enteramente detrás de `feature('SHOT_STATS')` — ver más abajo.
 *
 * HALLAZGO DE LA FUENTE (no de este porte, documentado verbatim): el
 * comentario de `TRANSCRIPT_MESSAGE_TYPES` dice "must match
 * isTranscriptMessage()", pero el Set incluye `'progress'` mientras
 * `isTranscriptMessage` real (`sessionStoragePredicates.ts:21-27`)
 * excluye explícitamente `'progress'`. Se porta el Set EXACTO de la
 * fuente (fiel al porte), citando la discrepancia — ver
 * `hallazgo-H-DOCS-1150-el-set-de-tipos-de-transcript-no-siguio-a-su-propio-comentario.rst`.
 */

import { open } from 'fs/promises'
import { basename, join, sep } from 'path'
import { errorMessage, isENOENT } from '../errorHelpers.js'
import { logForDebugging } from '../debug.js'
import {
  type Entry,
  getFsImplementation,
  getProjectsDir,
  isTranscriptMessage,
  type ModelUsage,
  readJSONLFile,
  SYNTHETIC_MODEL,
  type TranscriptMessage,
} from '../internal/pendingCrossPackageDeps.js'
import { jsonParse } from '../slowOperations.js'
import {
  getTodayDateString,
  getYesterdayDateString,
  isDateBefore,
  loadStatsCache,
  mergeCacheWithNewStats,
  type PersistedStatsCache,
  saveStatsCache,
  toDateString,
  withStatsCacheLock,
} from './statsCache.js'

export type DailyActivity = {
  date: string // formato YYYY-MM-DD
  messageCount: number
  sessionCount: number
  toolCallCount: number
}

export type DailyModelTokens = {
  date: string // formato YYYY-MM-DD
  tokensByModel: { [modelName: string]: number } // tokens totales (input + output) por modelo
}

export type StreakInfo = {
  currentStreak: number
  longestStreak: number
  currentStreakStart: string | null
  longestStreakStart: string | null
  longestStreakEnd: string | null
}

export type SessionStats = {
  sessionId: string
  duration: number // en milisegundos
  messageCount: number
  timestamp: string
}

export type ClaudeCodeStats = {
  // Resumen de actividad
  totalSessions: number
  totalMessages: number
  totalDays: number
  activeDays: number

  // Streaks
  streaks: StreakInfo

  // Actividad diaria para el heatmap
  dailyActivity: DailyActivity[]

  // Uso diario de tokens por modelo, para gráficos
  dailyModelTokens: DailyModelTokens[]

  // Info de sesión
  longestSession: SessionStats | null

  // Uso de modelo agregado
  modelUsage: { [modelName: string]: ModelUsage }

  // Stats de tiempo
  firstSessionDate: string | null
  lastSessionDate: string | null
  peakActivityDay: string | null
  peakActivityHour: number | null

  // Tiempo de especulación ahorrado
  totalSpeculationTimeSavedMs: number

  // Stats de shots (sólo-ant, gateado por el feature flag SHOT_STATS —
  // ver docstring del módulo: el código que los puebla es inalcanzable
  // en este árbol; los campos se conservan en el contrato público)
  shotDistribution?: { [shotCount: number]: number }
  oneShotRate?: number
}

/**
 * Resultado de procesar archivos de sesión — stats intermedias que se
 * pueden mezclar.
 */
type ProcessedStats = {
  dailyActivity: DailyActivity[]
  dailyModelTokens: DailyModelTokens[]
  modelUsage: { [modelName: string]: ModelUsage }
  sessionStats: SessionStats[]
  hourCounts: { [hour: number]: number }
  totalMessages: number
  totalSpeculationTimeSavedMs: number
  shotDistribution?: { [shotCount: number]: number }
}

/** Opciones para procesar archivos de sesión. */
type ProcessOptions = {
  // Sólo incluye datos de fechas >= esta fecha (formato YYYY-MM-DD).
  fromDate?: string
  // Sólo incluye datos de fechas <= esta fecha (formato YYYY-MM-DD).
  toDate?: string
}

/**
 * Procesa archivos de sesión y extrae stats.
 * Puede filtrar por rango de fechas.
 */
async function processSessionFiles(
  sessionFiles: string[],
  options: ProcessOptions = {},
): Promise<ProcessedStats> {
  const { fromDate, toDate } = options
  const fs = getFsImplementation()

  const dailyActivityMap = new Map<string, DailyActivity>()
  const dailyModelTokensMap = new Map<string, { [modelName: string]: number }>()
  const sessions: SessionStats[] = []
  const hourCounts = new Map<number, number>()
  let totalMessages = 0
  let totalSpeculationTimeSavedMs = 0
  const modelUsageAgg: { [modelName: string]: ModelUsage } = {}

  // Procesa archivos de sesión en lotes paralelos para mejor rendimiento.
  const BATCH_SIZE = 20
  for (let i = 0; i < sessionFiles.length; i += BATCH_SIZE) {
    const batch = sessionFiles.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map(async sessionFile => {
        try {
          // Si hay un filtro fromDate, se saltan archivos que no han
          // sido modificados desde entonces.
          if (fromDate) {
            let fileSize = 0
            try {
              const fileStat = await fs.stat(sessionFile)
              const fileModifiedDate = toDateString(fileStat.mtime)
              if (isDateBefore(fileModifiedDate, fromDate)) {
                return {
                  sessionFile,
                  entries: null,
                  error: null,
                  skipped: true,
                }
              }
              fileSize = fileStat.size
            } catch {
              // Si no se puede hacer stat, se intenta leer igual.
            }
            // Para archivos grandes, se espía la fecha de inicio de
            // sesión antes de leer todo. Sesiones que pasan el filtro de
            // mtime pero empezaron antes de fromDate se saltan (p. ej.
            // una sesión de hace un mes retomada hoy tiene mtime nuevo
            // pero fecha de inicio vieja).
            if (fileSize > 65536) {
              const startDate = await readSessionStartDate(sessionFile)
              if (startDate && isDateBefore(startDate, fromDate)) {
                return {
                  sessionFile,
                  entries: null,
                  error: null,
                  skipped: true,
                }
              }
            }
          }
          const entries = await readJSONLFile<Entry>(sessionFile)
          return { sessionFile, entries, error: null, skipped: false }
        } catch (error) {
          return { sessionFile, entries: null, error, skipped: false }
        }
      }),
    )

    for (const { sessionFile, entries, error, skipped } of results) {
      if (skipped) continue
      if (error || !entries) {
        logForDebugging(
          `Failed to read session file ${sessionFile}: ${errorMessage(error)}`,
        )
        continue
      }

      const sessionId = basename(sessionFile, '.jsonl')
      const messages: TranscriptMessage[] = []

      for (const entry of entries) {
        if (isTranscriptMessage(entry)) {
          messages.push(entry as unknown as TranscriptMessage)
        } else if (entry.type === 'speculation-accept') {
          totalSpeculationTimeSavedMs += entry.timeSavedMs
        }
      }

      if (messages.length === 0) continue

      // Los transcripts de subagente marcan todos los mensajes como
      // sidechain. Igual se quiere contar su uso de tokens, pero no como
      // sesiones separadas.
      const isSubagentFile = sessionFile.includes(`${sep}subagents${sep}`)

      // Filtra mensajes sidechain para metadata de sesión (duración,
      // conteos). Para archivos de subagente, usa todos los mensajes
      // porque todos son sidechain.
      const mainMessages = isSubagentFile
        ? messages
        : messages.filter(m => !m.isSidechain)
      if (mainMessages.length === 0) continue

      const firstMessage = mainMessages[0]!
      const lastMessage = mainMessages.at(-1)!

      const firstTimestamp = new Date(firstMessage.timestamp)
      const lastTimestamp = new Date(lastMessage.timestamp)

      // Se saltan sesiones con timestamps malformados — algunos
      // transcripts en disco tienen entradas sin el campo timestamp
      // (p. ej. escrituras parciales/remotas). new Date(undefined)
      // produce un Invalid Date, y toDateString() lanzaría RangeError.
      if (isNaN(firstTimestamp.getTime()) || isNaN(lastTimestamp.getTime())) {
        logForDebugging(
          `Skipping session with invalid timestamp: ${sessionFile}`,
        )
        continue
      }

      const dateKey = toDateString(firstTimestamp)

      if (fromDate && isDateBefore(dateKey, fromDate)) continue
      if (toDate && isDateBefore(toDate, dateKey)) continue

      const existing = dailyActivityMap.get(dateKey) || {
        date: dateKey,
        messageCount: 0,
        sessionCount: 0,
        toolCallCount: 0,
      }

      // Los archivos de subagente contribuyen tokens y tool calls, pero
      // no son sesiones.
      if (!isSubagentFile) {
        const duration = lastTimestamp.getTime() - firstTimestamp.getTime()

        sessions.push({
          sessionId,
          duration,
          messageCount: mainMessages.length,
          timestamp: firstMessage.timestamp,
        })

        totalMessages += mainMessages.length

        existing.sessionCount++
        existing.messageCount += mainMessages.length

        const hour = firstTimestamp.getHours()
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1)
      }

      if (!isSubagentFile || dailyActivityMap.has(dateKey)) {
        dailyActivityMap.set(dateKey, existing)
      }

      // Procesa mensajes para uso de herramientas y stats de modelo.
      for (const message of mainMessages) {
        if (message.type === 'assistant') {
          const content = message.message?.content
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'tool_use') {
                const activity = dailyActivityMap.get(dateKey)
                if (activity) {
                  activity.toolCallCount++
                }
              }
            }
          }

          // Rastrea uso de modelo si está disponible (salta mensajes sintéticos).
          if (message.message?.usage) {
            const usage = message.message.usage as Record<string, number>
            const model = (message.message.model as string) || 'unknown'

            if (model === SYNTHETIC_MODEL) {
              continue
            }

            if (!modelUsageAgg[model]) {
              modelUsageAgg[model] = {
                inputTokens: 0,
                outputTokens: 0,
                cacheReadInputTokens: 0,
                cacheCreationInputTokens: 0,
                webSearchRequests: 0,
                costUSD: 0,
                contextWindow: 0,
                maxOutputTokens: 0,
              }
            }

            modelUsageAgg[model]!.inputTokens += usage.input_tokens || 0
            modelUsageAgg[model]!.outputTokens += usage.output_tokens || 0
            modelUsageAgg[model]!.cacheReadInputTokens +=
              usage.cache_read_input_tokens || 0
            modelUsageAgg[model]!.cacheCreationInputTokens +=
              usage.cache_creation_input_tokens || 0

            const totalTokens =
              (usage.input_tokens || 0) + (usage.output_tokens || 0)
            if (totalTokens > 0) {
              const dayTokens = dailyModelTokensMap.get(dateKey) || {}
              dayTokens[model] = (dayTokens[model] || 0) + totalTokens
              dailyModelTokensMap.set(dateKey, dayTokens)
            }
          }
        }
      }
    }
  }

  return {
    dailyActivity: Array.from(dailyActivityMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
    dailyModelTokens: Array.from(dailyModelTokensMap.entries())
      .map(([date, tokensByModel]) => ({ date, tokensByModel }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    modelUsage: modelUsageAgg,
    sessionStats: sessions,
    hourCounts: Object.fromEntries(hourCounts),
    totalMessages,
    totalSpeculationTimeSavedMs,
  }
}

/**
 * Obtiene todos los archivos de sesión de todos los directorios de
 * proyecto. Incluye archivos de sesión principales y de transcript de
 * subagente.
 */
async function getAllSessionFiles(): Promise<string[]> {
  const projectsDir = getProjectsDir()
  const fs = getFsImplementation()

  let allEntries
  try {
    allEntries = await fs.readdir(projectsDir)
  } catch (e) {
    if (isENOENT(e)) return []
    throw e
  }
  const projectDirs = allEntries
    .filter(dirent => dirent.isDirectory())
    .map(dirent => join(projectsDir, dirent.name))

  const projectResults = await Promise.all(
    projectDirs.map(async projectDir => {
      try {
        const entries = await fs.readdir(projectDir)

        const mainFiles = entries
          .filter(dirent => dirent.isFile() && dirent.name.endsWith('.jsonl'))
          .map(dirent => join(projectDir, dirent.name))

        // Estructura: {projectDir}/{sessionId}/subagents/agent-{agentId}.jsonl
        const sessionDirs = entries.filter(dirent => dirent.isDirectory())
        const subagentResults = await Promise.all(
          sessionDirs.map(async sessionDir => {
            const subagentsDir = join(projectDir, sessionDir.name, 'subagents')
            try {
              const subagentEntries = await fs.readdir(subagentsDir)
              return subagentEntries
                .filter(
                  dirent =>
                    dirent.isFile() &&
                    dirent.name.endsWith('.jsonl') &&
                    dirent.name.startsWith('agent-'),
                )
                .map(dirent => join(subagentsDir, dirent.name))
            } catch {
              return []
            }
          }),
        )

        return [...mainFiles, ...subagentResults.flat()]
      } catch (error) {
        logForDebugging(
          `Failed to read project directory ${projectDir}: ${errorMessage(error)}`,
        )
        return []
      }
    }),
  )

  return projectResults.flat()
}

/** Convierte una PersistedStatsCache a ClaudeCodeStats computando campos derivados. */
function cacheToStats(
  cache: PersistedStatsCache,
  todayStats: ProcessedStats | null,
): ClaudeCodeStats {
  const dailyActivityMap = new Map<string, DailyActivity>()
  for (const day of cache.dailyActivity) {
    dailyActivityMap.set(day.date, { ...day })
  }
  if (todayStats) {
    for (const day of todayStats.dailyActivity) {
      const existing = dailyActivityMap.get(day.date)
      if (existing) {
        existing.messageCount += day.messageCount
        existing.sessionCount += day.sessionCount
        existing.toolCallCount += day.toolCallCount
      } else {
        dailyActivityMap.set(day.date, { ...day })
      }
    }
  }

  const dailyModelTokensMap = new Map<string, { [model: string]: number }>()
  for (const day of cache.dailyModelTokens) {
    dailyModelTokensMap.set(day.date, { ...day.tokensByModel })
  }
  if (todayStats) {
    for (const day of todayStats.dailyModelTokens) {
      const existing = dailyModelTokensMap.get(day.date)
      if (existing) {
        for (const [model, tokens] of Object.entries(day.tokensByModel)) {
          existing[model] = (existing[model] || 0) + tokens
        }
      } else {
        dailyModelTokensMap.set(day.date, { ...day.tokensByModel })
      }
    }
  }

  const modelUsage = { ...cache.modelUsage }
  if (todayStats) {
    for (const [model, usage] of Object.entries(todayStats.modelUsage)) {
      if (modelUsage[model]) {
        modelUsage[model] = {
          inputTokens: modelUsage[model]!.inputTokens + usage.inputTokens,
          outputTokens: modelUsage[model]!.outputTokens + usage.outputTokens,
          cacheReadInputTokens:
            modelUsage[model]!.cacheReadInputTokens +
            usage.cacheReadInputTokens,
          cacheCreationInputTokens:
            modelUsage[model]!.cacheCreationInputTokens +
            usage.cacheCreationInputTokens,
          webSearchRequests:
            modelUsage[model]!.webSearchRequests + usage.webSearchRequests,
          costUSD: modelUsage[model]!.costUSD + usage.costUSD,
          contextWindow: Math.max(
            modelUsage[model]!.contextWindow,
            usage.contextWindow,
          ),
          maxOutputTokens: Math.max(
            modelUsage[model]!.maxOutputTokens,
            usage.maxOutputTokens,
          ),
        }
      } else {
        modelUsage[model] = { ...usage }
      }
    }
  }

  const hourCountsMap = new Map<number, number>()
  for (const [hour, count] of Object.entries(cache.hourCounts)) {
    hourCountsMap.set(parseInt(hour, 10), count)
  }
  if (todayStats) {
    for (const [hour, count] of Object.entries(todayStats.hourCounts)) {
      const hourNum = parseInt(hour, 10)
      hourCountsMap.set(hourNum, (hourCountsMap.get(hourNum) || 0) + count)
    }
  }

  const dailyActivityArray = Array.from(dailyActivityMap.values()).sort(
    (a, b) => a.date.localeCompare(b.date),
  )
  const streaks = calculateStreaks(dailyActivityArray)

  const dailyModelTokens = Array.from(dailyModelTokensMap.entries())
    .map(([date, tokensByModel]) => ({ date, tokensByModel }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const totalSessions =
    cache.totalSessions + (todayStats?.sessionStats.length || 0)
  const totalMessages = cache.totalMessages + (todayStats?.totalMessages || 0)

  let longestSession = cache.longestSession
  if (todayStats) {
    for (const session of todayStats.sessionStats) {
      if (!longestSession || session.duration > longestSession.duration) {
        longestSession = session
      }
    }
  }

  let firstSessionDate = cache.firstSessionDate
  let lastSessionDate: string | null = null
  if (todayStats) {
    for (const session of todayStats.sessionStats) {
      if (!firstSessionDate || session.timestamp < firstSessionDate) {
        firstSessionDate = session.timestamp
      }
      if (!lastSessionDate || session.timestamp > lastSessionDate) {
        lastSessionDate = session.timestamp
      }
    }
  }
  if (!lastSessionDate && dailyActivityArray.length > 0) {
    lastSessionDate = dailyActivityArray.at(-1)!.date
  }

  const peakActivityDay =
    dailyActivityArray.length > 0
      ? dailyActivityArray.reduce((max, d) =>
          d.messageCount > max.messageCount ? d : max,
        ).date
      : null

  const peakActivityHour =
    hourCountsMap.size > 0
      ? Array.from(hourCountsMap.entries()).reduce((max, [hour, count]) =>
          count > max[1] ? [hour, count] : max,
        )[0]
      : null

  const totalDays =
    firstSessionDate && lastSessionDate
      ? Math.ceil(
          (new Date(lastSessionDate).getTime() -
            new Date(firstSessionDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1
      : 0

  const totalSpeculationTimeSavedMs =
    cache.totalSpeculationTimeSavedMs +
    (todayStats?.totalSpeculationTimeSavedMs || 0)

  const result: ClaudeCodeStats = {
    totalSessions,
    totalMessages,
    totalDays,
    activeDays: dailyActivityMap.size,
    streaks,
    dailyActivity: dailyActivityArray,
    dailyModelTokens,
    longestSession,
    modelUsage,
    firstSessionDate,
    lastSessionDate,
    peakActivityDay,
    peakActivityHour,
    totalSpeculationTimeSavedMs,
  }

  return result
}

/**
 * Agrega stats de todas las sesiones de Claude Code en todos los
 * proyectos. Usa una caché en disco para evitar reprocesar datos
 * históricos.
 */
export async function aggregateClaudeCodeStats(): Promise<ClaudeCodeStats> {
  const allSessionFiles = await getAllSessionFiles()

  if (allSessionFiles.length === 0) {
    return getEmptyStats()
  }

  // Usa lock para prevenir condiciones de carrera con actualizaciones de
  // caché en background.
  const updatedCache = await withStatsCacheLock(async () => {
    const cache = await loadStatsCache()
    const yesterday = getYesterdayDateString()

    let result = cache

    if (!cache.lastComputedDate) {
      logForDebugging('Stats cache empty, processing all historical data')
      const historicalStats = await processSessionFiles(allSessionFiles, {
        toDate: yesterday,
      })

      if (
        historicalStats.sessionStats.length > 0 ||
        historicalStats.dailyActivity.length > 0
      ) {
        result = mergeCacheWithNewStats(cache, historicalStats, yesterday)
        await saveStatsCache(result)
      }
    } else if (isDateBefore(cache.lastComputedDate, yesterday)) {
      const nextDay = getNextDay(cache.lastComputedDate)
      logForDebugging(
        `Stats cache stale (${cache.lastComputedDate}), processing ${nextDay} to ${yesterday}`,
      )
      const newStats = await processSessionFiles(allSessionFiles, {
        fromDate: nextDay,
        toDate: yesterday,
      })

      if (
        newStats.sessionStats.length > 0 ||
        newStats.dailyActivity.length > 0
      ) {
        result = mergeCacheWithNewStats(cache, newStats, yesterday)
        await saveStatsCache(result)
      } else {
        result = { ...cache, lastComputedDate: yesterday }
        await saveStatsCache(result)
      }
    }

    return result
  })

  // Siempre procesa los datos de hoy en vivo (están incompletos). No
  // necesita estar dentro del lock porque no modifica la caché.
  const today = getTodayDateString()
  const todayStats = await processSessionFiles(allSessionFiles, {
    fromDate: today,
    toDate: today,
  })

  return cacheToStats(updatedCache, todayStats)
}

export type StatsDateRange = '7d' | '30d' | 'all'

/**
 * Agrega stats para un rango de fechas específico. Para 'all', usa la
 * agregación cacheada. Para otros rangos, procesa archivos directamente.
 */
export async function aggregateClaudeCodeStatsForRange(
  range: StatsDateRange,
): Promise<ClaudeCodeStats> {
  if (range === 'all') {
    return aggregateClaudeCodeStats()
  }

  const allSessionFiles = await getAllSessionFiles()
  if (allSessionFiles.length === 0) {
    return getEmptyStats()
  }

  const today = new Date()
  const daysBack = range === '7d' ? 7 : 30
  const fromDate = new Date(today)
  fromDate.setDate(today.getDate() - daysBack + 1) // +1 para incluir hoy
  const fromDateStr = toDateString(fromDate)

  const stats = await processSessionFiles(allSessionFiles, {
    fromDate: fromDateStr,
  })

  return processedStatsToClaudeCodeStats(stats)
}

/**
 * Convierte ProcessedStats a ClaudeCodeStats. Se usa para rangos de
 * fecha filtrados que evitan la caché.
 */
function processedStatsToClaudeCodeStats(
  stats: ProcessedStats,
): ClaudeCodeStats {
  const dailyActivitySorted = stats.dailyActivity
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
  const dailyModelTokensSorted = stats.dailyModelTokens
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))

  const streaks = calculateStreaks(dailyActivitySorted)

  let longestSession: SessionStats | null = null
  for (const session of stats.sessionStats) {
    if (!longestSession || session.duration > longestSession.duration) {
      longestSession = session
    }
  }

  let firstSessionDate: string | null = null
  let lastSessionDate: string | null = null
  for (const session of stats.sessionStats) {
    if (!firstSessionDate || session.timestamp < firstSessionDate) {
      firstSessionDate = session.timestamp
    }
    if (!lastSessionDate || session.timestamp > lastSessionDate) {
      lastSessionDate = session.timestamp
    }
  }

  const peakActivityDay =
    dailyActivitySorted.length > 0
      ? dailyActivitySorted.reduce((max, d) =>
          d.messageCount > max.messageCount ? d : max,
        ).date
      : null

  const hourEntries = Object.entries(stats.hourCounts)
  const peakActivityHour =
    hourEntries.length > 0
      ? parseInt(
          hourEntries.reduce((max, [hour, count]) =>
            count > parseInt(max[1].toString(), 10) ? [hour, count] : max,
          )[0],
          10,
        )
      : null

  const totalDays =
    firstSessionDate && lastSessionDate
      ? Math.ceil(
          (new Date(lastSessionDate).getTime() -
            new Date(firstSessionDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1
      : 0

  const result: ClaudeCodeStats = {
    totalSessions: stats.sessionStats.length,
    totalMessages: stats.totalMessages,
    totalDays,
    activeDays: stats.dailyActivity.length,
    streaks,
    dailyActivity: dailyActivitySorted,
    dailyModelTokens: dailyModelTokensSorted,
    longestSession,
    modelUsage: stats.modelUsage,
    firstSessionDate,
    lastSessionDate,
    peakActivityDay,
    peakActivityHour,
    totalSpeculationTimeSavedMs: stats.totalSpeculationTimeSavedMs,
  }

  return result
}

/** Obtiene el día siguiente a una cadena de fecha dada (formato YYYY-MM-DD). */
function getNextDay(dateStr: string): string {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + 1)
  return toDateString(date)
}

function calculateStreaks(dailyActivity: DailyActivity[]): StreakInfo {
  if (dailyActivity.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      currentStreakStart: null,
      longestStreakStart: null,
      longestStreakEnd: null,
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let currentStreak = 0
  let currentStreakStart: string | null = null
  const checkDate = new Date(today)

  const activeDates = new Set(dailyActivity.map(d => d.date))

  while (true) {
    const dateStr = toDateString(checkDate)
    if (!activeDates.has(dateStr)) {
      break
    }
    currentStreak++
    currentStreakStart = dateStr
    checkDate.setDate(checkDate.getDate() - 1)
  }

  let longestStreak = 0
  let longestStreakStart: string | null = null
  let longestStreakEnd: string | null = null

  if (dailyActivity.length > 0) {
    const sortedDates = Array.from(activeDates).sort()
    let tempStreak = 1
    let tempStart = sortedDates[0]!

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]!)
      const currDate = new Date(sortedDates[i]!)

      const dayDiff = Math.round(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
      )

      if (dayDiff === 1) {
        tempStreak++
      } else {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak
          longestStreakStart = tempStart
          longestStreakEnd = sortedDates[i - 1]!
        }
        tempStreak = 1
        tempStart = sortedDates[i]!
      }
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak
      longestStreakStart = tempStart
      longestStreakEnd = sortedDates.at(-1)!
    }
  }

  return {
    currentStreak,
    longestStreak,
    currentStreakStart,
    longestStreakStart,
    longestStreakEnd,
  }
}

// Tipos de mensaje de transcript — deben coincidir con isTranscriptMessage()
// en sessionStorage.ts. El dateKey canónico (ver processSessionFiles) lee
// mainMessages[0].timestamp, donde mainMessages =
// entries.filter(isTranscriptMessage).filter(!isSidechain). Este espiado
// debe extraer el mismo valor para ser una optimización de salto segura.
//
// NOTA DE DISCREPANCIA DE LA FUENTE (ver docstring del módulo): el
// comentario de arriba dice "must match isTranscriptMessage()" pero el
// Set real de la fuente incluye 'progress', que `isTranscriptMessage`
// EXCLUYE explícitamente (`sessionStoragePredicates.ts:21-27`). Se porta
// el Set exacto, verbatim a la fuente.
const TRANSCRIPT_MESSAGE_TYPES = new Set([
  'user',
  'assistant',
  'attachment',
  'system',
  'progress',
])

/**
 * Espía el inicio de un archivo de sesión para obtener la fecha de
 * inicio de la sesión. Usa una lectura pequeña de 4 KB para evitar
 * cargar el archivo completo.
 *
 * Los archivos de sesión típicamente empiezan con entradas que no son
 * de transcript (`mode`, `file-history-snapshot`, `attribution-snapshot`)
 * antes del primer mensaje de transcript, así que se recorren líneas
 * hasta encontrar una. Cada línea completa se parsea como JSON — una
 * búsqueda ingenua por cadena no es segura aquí porque las entradas
 * `file-history-snapshot` embeben un `snapshot.timestamp` anidado que
 * lleva la fecha de la sesión ANTERIOR (escrito por
 * copyFileHistoryForResume), lo que haría que sesiones retomadas se
 * clasificaran mal como viejas y se descartaran en silencio de las stats.
 *
 * Devuelve una cadena YYYY-MM-DD, o null si ningún mensaje de transcript
 * cabe en el inicio (el llamador cae al camino de lectura completa —
 * default seguro).
 */
export async function readSessionStartDate(
  filePath: string,
): Promise<string | null> {
  try {
    const fd = await open(filePath, 'r')
    try {
      const buf = Buffer.allocUnsafe(4096)
      const { bytesRead } = await fd.read(buf, 0, buf.length, 0)
      if (bytesRead === 0) return null
      const head = buf.toString('utf8', 0, bytesRead)

      // Sólo confía en líneas completas — la frontera de 4KB puede
      // partir una entrada JSON en dos.
      const lastNewline = head.lastIndexOf('\n')
      if (lastNewline < 0) return null

      for (const line of head.slice(0, lastNewline).split('\n')) {
        if (!line) continue
        let entry: {
          type?: unknown
          timestamp?: unknown
          isSidechain?: unknown
        }
        try {
          entry = jsonParse(line)
        } catch {
          continue
        }
        if (typeof entry.type !== 'string') continue
        if (!TRANSCRIPT_MESSAGE_TYPES.has(entry.type)) continue
        if (entry.isSidechain === true) continue
        if (typeof entry.timestamp !== 'string') return null
        const date = new Date(entry.timestamp)
        if (Number.isNaN(date.getTime())) return null
        return toDateString(date)
      }
      return null
    } finally {
      await fd.close()
    }
  } catch {
    return null
  }
}

function getEmptyStats(): ClaudeCodeStats {
  return {
    totalSessions: 0,
    totalMessages: 0,
    totalDays: 0,
    activeDays: 0,
    streaks: {
      currentStreak: 0,
      longestStreak: 0,
      currentStreakStart: null,
      longestStreakStart: null,
      longestStreakEnd: null,
    },
    dailyActivity: [],
    dailyModelTokens: [],
    longestSession: null,
    modelUsage: {},
    firstSessionDate: null,
    lastSessionDate: null,
    peakActivityDay: null,
    peakActivityHour: null,
    totalSpeculationTimeSavedMs: 0,
  }
}

// NO PORTADO: `extractShotCountFromMessages` (extrae el conteo de shots
// de la atribución de PR en `gh pr create`) y su import
// `SHELL_TOOL_NAMES` (`shell/legacy/shellToolUtils.js`, no exportado por
// `@thyrox/shell`) — su único call site vivía dentro de
// `feature('SHOT_STATS')` (ver docstring del módulo), inalcanzable en
// este árbol.
