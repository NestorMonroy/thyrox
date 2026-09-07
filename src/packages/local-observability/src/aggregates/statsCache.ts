/**
 * Puerto de `ccnmt: packages/local-observability/src/aggregates/statsCache.ts`
 * (434 líneas fuente). Caché en disco de las estadísticas de uso
 * agregadas — evita reprocesar transcripts históricos en cada
 * `aggregateClaudeCodeStats()`.
 *
 * NO PORTADO: la rama `feature('SHOT_STATS')` (3 sitios) — macro de
 * `bun:bundle` ausente en este árbol, resuelve siempre `false` fuera de
 * un build ant (mismo precedente que `slowLoggingTag.ts`). El campo
 * `shotDistribution` del tipo `PersistedStatsCache` SÍ se conserva
 * (contrato público que un futuro consumidor podría leer), pero el
 * código que lo recalcula/fuerza nunca se alcanza en este árbol.
 *
 * Sustituidos localmente (`internal/pendingCrossPackageDeps.ts`):
 * `getClaudeConfigHomeDir` (config/env/utils, no exportado),
 * `getFsImplementation` (storage/fsOperations, no exportado),
 * `ModelUsage` (tipo estructural estrecho — `headless-sdk` no existe en
 * este árbol).
 */

import { randomBytes } from 'crypto'
import { open } from 'fs/promises'
import { join } from 'path'
import { logForDebugging } from '../debug.js'
import {
  getClaudeConfigHomeDir,
  getFsImplementation,
  type ModelUsage,
} from '../internal/pendingCrossPackageDeps.js'
import { errorMessage } from '../errorHelpers.js'
import { logError } from '../log.js'
import { jsonParse, jsonStringify } from '../slowOperations.js'
import type { DailyActivity, DailyModelTokens, SessionStats } from './stats.js'

const STATS_CACHE_VERSION = 3
const MIN_MIGRATABLE_VERSION = 1
const STATS_CACHE_FILENAME = 'stats-cache.json'

/** Lock simple en memoria para evitar operaciones concurrentes de caché. */
let statsCacheLockPromise: Promise<void> | null = null

/**
 * Ejecuta una función mientras se sostiene el lock de la caché de stats.
 * Sólo una operación puede sostener el lock a la vez.
 */
export async function withStatsCacheLock<T>(fn: () => Promise<T>): Promise<T> {
  while (statsCacheLockPromise) {
    await statsCacheLockPromise
  }

  let releaseLock: (() => void) | undefined
  statsCacheLockPromise = new Promise<void>(resolve => {
    releaseLock = resolve
  })

  try {
    return await fn()
  } finally {
    statsCacheLockPromise = null
    releaseLock?.()
  }
}

/**
 * Caché de stats persistida en disco.
 * Contiene agregados históricos que no cambiarán. Todos los campos están
 * acotados para prevenir crecimiento ilimitado del archivo.
 */
export type PersistedStatsCache = {
  version: number
  // Última fecha totalmente computada (formato YYYY-MM-DD). Las stats
  // hasta e incluyendo esta fecha se consideran completas.
  lastComputedDate: string | null
  // Agregados diarios necesarios para heatmap, streaks, tendencias
  // (acotado por días).
  dailyActivity: DailyActivity[]
  dailyModelTokens: DailyModelTokens[]
  // Uso de modelo agregado (acotado por número de modelos).
  modelUsage: { [modelName: string]: ModelUsage }
  // Agregados de sesión (reemplaza el array ilimitado sessionStats).
  totalSessions: number
  totalMessages: number
  longestSession: SessionStats | null
  // Primera fecha de sesión jamás registrada.
  firstSessionDate: string | null
  // Conteos por hora para el cálculo de la hora pico (acotado a 24 entradas).
  hourCounts: { [hour: number]: number }
  // Tiempo de especulación ahorrado en todas las sesiones.
  totalSpeculationTimeSavedMs: number
  // Distribución de shots: mapa de conteo de shots → número de sesiones (ant-only).
  shotDistribution?: { [shotCount: number]: number }
}

function getStatsCachePath(): string {
  return join(getClaudeConfigHomeDir(), STATS_CACHE_FILENAME)
}

function getEmptyCache(): PersistedStatsCache {
  return {
    version: STATS_CACHE_VERSION,
    lastComputedDate: null,
    dailyActivity: [],
    dailyModelTokens: [],
    modelUsage: {},
    totalSessions: 0,
    totalMessages: 0,
    longestSession: null,
    firstSessionDate: null,
    hourCounts: {},
    totalSpeculationTimeSavedMs: 0,
    shotDistribution: {},
  }
}

/**
 * Migra una caché más vieja al esquema actual.
 * Devuelve `null` si la versión es desconocida o demasiado vieja para migrar.
 *
 * Preserva agregados históricos que de otro modo se perderían cuando los
 * archivos de transcript ya envejecieron más allá de cleanupPeriodDays.
 * Los días pre-migración pueden subcontar (p. ej. v2 no tenía tokens de
 * subagente); se acepta eso en vez de descartar el historial.
 */
function migrateStatsCache(
  parsed: Partial<PersistedStatsCache> & { version: number },
): PersistedStatsCache | null {
  if (
    typeof parsed.version !== 'number' ||
    parsed.version < MIN_MIGRATABLE_VERSION ||
    parsed.version > STATS_CACHE_VERSION
  ) {
    return null
  }
  if (
    !Array.isArray(parsed.dailyActivity) ||
    !Array.isArray(parsed.dailyModelTokens) ||
    typeof parsed.totalSessions !== 'number' ||
    typeof parsed.totalMessages !== 'number'
  ) {
    return null
  }
  return {
    version: STATS_CACHE_VERSION,
    lastComputedDate: parsed.lastComputedDate ?? null,
    dailyActivity: parsed.dailyActivity,
    dailyModelTokens: parsed.dailyModelTokens,
    modelUsage: parsed.modelUsage ?? {},
    totalSessions: parsed.totalSessions,
    totalMessages: parsed.totalMessages,
    longestSession: parsed.longestSession ?? null,
    firstSessionDate: parsed.firstSessionDate ?? null,
    hourCounts: parsed.hourCounts ?? {},
    totalSpeculationTimeSavedMs: parsed.totalSpeculationTimeSavedMs ?? 0,
    // Preserva undefined (no cae a {}) para que en este árbol el check
    // de recomputación de SHOT_STATS de loadStatsCache (inalcanzable,
    // ver docstring del módulo) mantenga la misma forma que la fuente.
    shotDistribution: parsed.shotDistribution,
  }
}

/**
 * Carga la caché de stats desde disco.
 * Devuelve una caché vacía si el archivo no existe o es inválido.
 */
export async function loadStatsCache(): Promise<PersistedStatsCache> {
  const fs = getFsImplementation()
  const cachePath = getStatsCachePath()

  try {
    const content = await fs.readFile(cachePath, { encoding: 'utf-8' })
    const parsed = jsonParse(content) as PersistedStatsCache

    if (parsed.version !== STATS_CACHE_VERSION) {
      const migrated = migrateStatsCache(parsed)
      if (!migrated) {
        logForDebugging(
          `Stats cache version ${parsed.version} not migratable (expected ${STATS_CACHE_VERSION}), returning empty cache`,
        )
        return getEmptyCache()
      }
      logForDebugging(
        `Migrated stats cache from v${parsed.version} to v${STATS_CACHE_VERSION}`,
      )
      // Persiste la migración para no re-migrar en cada carga.
      await saveStatsCache(migrated)
      return migrated
    }

    if (
      !Array.isArray(parsed.dailyActivity) ||
      !Array.isArray(parsed.dailyModelTokens) ||
      typeof parsed.totalSessions !== 'number' ||
      typeof parsed.totalMessages !== 'number'
    ) {
      logForDebugging(
        'Stats cache has invalid structure, returning empty cache',
      )
      return getEmptyCache()
    }

    return parsed
  } catch (error) {
    logForDebugging(`Failed to load stats cache: ${errorMessage(error)}`)
    return getEmptyCache()
  }
}

/**
 * Guarda la caché de stats a disco atómicamente.
 * Usa el patrón archivo-temporal + rename para prevenir corrupción.
 */
export async function saveStatsCache(
  cache: PersistedStatsCache,
): Promise<void> {
  const fs = getFsImplementation()
  const cachePath = getStatsCachePath()
  const tempPath = `${cachePath}.${randomBytes(8).toString('hex')}.tmp`

  try {
    const configDir = getClaudeConfigHomeDir()
    try {
      await fs.mkdir(configDir)
    } catch {
      // El directorio ya existe u otro error — continúa.
    }

    const content = jsonStringify(cache, null, 2)
    const handle = await open(tempPath, 'w', 0o600)
    try {
      await handle.writeFile(content, { encoding: 'utf-8' })
      await handle.sync()
    } finally {
      await handle.close()
    }

    await fs.rename(tempPath, cachePath)
    logForDebugging(
      `Stats cache saved successfully (lastComputedDate: ${cache.lastComputedDate})`,
    )
  } catch (error) {
    logError(error)
    try {
      await fs.unlink(tempPath)
    } catch {
      // Ignora errores de limpieza.
    }
  }
}

/**
 * Mezcla nuevas stats dentro de una caché existente.
 * Se usa al añadir incrementalmente nuevos días a la caché.
 */
export function mergeCacheWithNewStats(
  existingCache: PersistedStatsCache,
  newStats: {
    dailyActivity: DailyActivity[]
    dailyModelTokens: DailyModelTokens[]
    modelUsage: { [modelName: string]: ModelUsage }
    sessionStats: SessionStats[]
    hourCounts: { [hour: number]: number }
    totalSpeculationTimeSavedMs: number
    shotDistribution?: { [shotCount: number]: number }
  },
  newLastComputedDate: string,
): PersistedStatsCache {
  const dailyActivityMap = new Map<string, DailyActivity>()
  for (const day of existingCache.dailyActivity) {
    dailyActivityMap.set(day.date, { ...day })
  }
  for (const day of newStats.dailyActivity) {
    const existing = dailyActivityMap.get(day.date)
    if (existing) {
      existing.messageCount += day.messageCount
      existing.sessionCount += day.sessionCount
      existing.toolCallCount += day.toolCallCount
    } else {
      dailyActivityMap.set(day.date, { ...day })
    }
  }

  const dailyModelTokensMap = new Map<string, { [model: string]: number }>()
  for (const day of existingCache.dailyModelTokens) {
    dailyModelTokensMap.set(day.date, { ...day.tokensByModel })
  }
  for (const day of newStats.dailyModelTokens) {
    const existing = dailyModelTokensMap.get(day.date)
    if (existing) {
      for (const [model, tokens] of Object.entries(day.tokensByModel)) {
        existing[model] = (existing[model] || 0) + tokens
      }
    } else {
      dailyModelTokensMap.set(day.date, { ...day.tokensByModel })
    }
  }

  const modelUsage = { ...existingCache.modelUsage }
  for (const [model, usage] of Object.entries(newStats.modelUsage)) {
    if (modelUsage[model]) {
      modelUsage[model] = {
        inputTokens: modelUsage[model]!.inputTokens + usage.inputTokens,
        outputTokens: modelUsage[model]!.outputTokens + usage.outputTokens,
        cacheReadInputTokens:
          modelUsage[model]!.cacheReadInputTokens + usage.cacheReadInputTokens,
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

  const hourCounts = { ...existingCache.hourCounts }
  for (const [hour, count] of Object.entries(newStats.hourCounts)) {
    const hourNum = parseInt(hour, 10)
    hourCounts[hourNum] = (hourCounts[hourNum] || 0) + count
  }

  const totalSessions =
    existingCache.totalSessions + newStats.sessionStats.length
  const totalMessages =
    existingCache.totalMessages +
    newStats.sessionStats.reduce((sum, s) => sum + s.messageCount, 0)

  let longestSession = existingCache.longestSession
  for (const session of newStats.sessionStats) {
    if (!longestSession || session.duration > longestSession.duration) {
      longestSession = session
    }
  }

  let firstSessionDate = existingCache.firstSessionDate
  for (const session of newStats.sessionStats) {
    if (!firstSessionDate || session.timestamp < firstSessionDate) {
      firstSessionDate = session.timestamp
    }
  }

  const result: PersistedStatsCache = {
    version: STATS_CACHE_VERSION,
    lastComputedDate: newLastComputedDate,
    dailyActivity: Array.from(dailyActivityMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
    dailyModelTokens: Array.from(dailyModelTokensMap.entries())
      .map(([date, tokensByModel]) => ({ date, tokensByModel }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    modelUsage,
    totalSessions,
    totalMessages,
    longestSession,
    firstSessionDate,
    hourCounts,
    totalSpeculationTimeSavedMs:
      existingCache.totalSpeculationTimeSavedMs +
      newStats.totalSpeculationTimeSavedMs,
  }

  return result
}

/** Extrae la porción de fecha (YYYY-MM-DD) de un objeto Date. */
export function toDateString(date: Date): string {
  const parts = date.toISOString().split('T')
  const dateStr = parts[0]
  if (!dateStr) {
    throw new Error('Invalid ISO date string')
  }
  return dateStr
}

/** Obtiene la fecha de hoy en formato YYYY-MM-DD. */
export function getTodayDateString(): string {
  return toDateString(new Date())
}

/** Obtiene la fecha de ayer en formato YYYY-MM-DD. */
export function getYesterdayDateString(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return toDateString(yesterday)
}

/**
 * Verifica si una cadena de fecha es anterior a otra.
 * Ambas deben estar en formato YYYY-MM-DD.
 */
export function isDateBefore(date1: string, date2: string): boolean {
  return date1 < date2
}
