/**
 * Puerto de `ccnmt: packages/local-observability/src/aggregates/cleanup.ts`
 * (602 líneas fuente, 100 % portado — mecanismo completo, 4 símbolos
 * declarados como puntos de inyección con éxito documentado).
 *
 * CORRECCIÓN DE PREMISA (Clausula 2 del principio rector — se corrige
 * antes de continuar): la premisa con la que se despachó este porte
 * decía *"exactamente UN edge de valor hacia un sibling sin portar:
 * `cleanupStaleAgentWorktrees` de `@claude-code-how-works/swarm`"*.
 * Medido leyendo este archivo completo, son CUATRO, los cuatro en la
 * misma función (`cleanupOldMessageFilesInBackground`):
 *
 *   - `cleanupOldImageCaches` — `@claude-code-how-works/tool-registry/imageStore.js`
 *   - `cleanupOldVersions` — `@claude-code-how-works/updater/nativeInstaller/index.js`
 *   - `cleanupOldPastes` — `@claude-code-how-works/repl/clipboard/pasteStore.js`
 *   - `cleanupStaleAgentWorktrees` — `@claude-code-how-works/swarm` (bare)
 *
 * Los cuatro paquetes (`tool-registry`, `updater`, `repl`, `swarm`) están
 * ausentes de este árbol por igual. Registrado como hallazgo
 * (`hallazgo-H-DOCS-1149-la-premisa-decia-un-borde-y-eran-nueve.rst`) porque afecta la planificación de las
 * próximas olas, no sólo este porte.
 *
 * Los cuatro se tratan con el MISMO desenlace — outcome (a) del marco de
 * 3 salidas de la tarea: se dejan como puntos de inyección
 * (`internal/pendingCrossPackageDeps.ts`) con default no-op/neutro que
 * el futuro sibling puede satisfacer. NINGUNO se reimplementa aquí — la
 * prohibición explícita de la tarea ("no reimplementar
 * cleanupStaleAgentWorktrees; pertenece al futuro porte de swarm") se
 * generaliza a los otros tres por el mismo razonamiento: son mecanismos
 * de OTRO dominio (imagen-cache de tool-registry, versiones del
 * instalador nativo, pegado del portapapeles del REPL).
 *
 * El resto del archivo (`cleanupOldMessageFiles`, `cleanupOldSessionFiles`,
 * `cleanupOldPlanFiles`, `cleanupOldFileHistoryBackups`,
 * `cleanupOldSessionEnvDirs`, `cleanupOldDebugLogs`,
 * `cleanupNpmCacheForAnthropicPackages`, `cleanupOldVersionsThrottled`,
 * más los helpers puros `addCleanupResults`/`convertFileNameToDate`) opera
 * exclusivamente sobre storage/config, ambos con sustituto real —
 * 100 % portado sin reducción.
 *
 * Reapuntado a `@thyrox/*` real: `CACHE_PATHS` — `@thyrox/storage`
 * exporta `./cache-paths`.
 *
 * Sustituidos localmente (`internal/pendingCrossPackageDeps.ts`):
 * `getFsImplementation`, `getClaudeConfigHomeDir`, `getProjectsDir`,
 * `TOOL_RESULTS_SUBDIR`, `getSettings`/`rawSettingsContainsKey`/
 * `getSettingsWithAllErrors`, `lock`/`unlock` (proper-lockfile),
 * los 4 puntos de inyección de arriba.
 */

import * as fs from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { logEvent } from '../index.js'
import { CACHE_PATHS } from '@thyrox/storage/cache-paths'
import { logForDebugging } from '../debug.js'
import { logError } from '../log.js'
import {
  cleanupOldImageCaches,
  cleanupOldPastes,
  cleanupOldVersions,
  cleanupStaleAgentWorktrees,
  getClaudeConfigHomeDir,
  getFsImplementation,
  getProjectsDir,
  getSettings,
  getSettingsWithAllErrors,
  lock,
  rawSettingsContainsKey,
  TOOL_RESULTS_SUBDIR,
  unlock,
  type FsOperations,
} from '../internal/pendingCrossPackageDeps.js'

const DEFAULT_CLEANUP_PERIOD_DAYS = 30

function getCutoffDate(): Date {
  const settings = getSettings() || {}
  const cleanupPeriodDays =
    settings.cleanupPeriodDays ?? DEFAULT_CLEANUP_PERIOD_DAYS
  const cleanupPeriodMs = cleanupPeriodDays * 24 * 60 * 60 * 1000
  return new Date(Date.now() - cleanupPeriodMs)
}

export type CleanupResult = {
  messages: number
  errors: number
}

export function addCleanupResults(
  a: CleanupResult,
  b: CleanupResult,
): CleanupResult {
  return {
    messages: a.messages + b.messages,
    errors: a.errors + b.errors,
  }
}

export function convertFileNameToDate(filename: string): Date {
  const isoStr = filename
    .split('.')[0]!
    .replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, 'T$1:$2:$3.$4Z')
  return new Date(isoStr)
}

async function cleanupOldFilesInDirectory(
  dirPath: string,
  cutoffDate: Date,
  isMessagePath: boolean,
): Promise<CleanupResult> {
  const result: CleanupResult = { messages: 0, errors: 0 }

  try {
    const files = await getFsImplementation().readdir(dirPath)

    for (const file of files) {
      try {
        // Convierte el formato de nombre donde todos los ':.' fueron
        // reemplazados por '-'.
        const timestamp = convertFileNameToDate(file.name)
        if (timestamp < cutoffDate) {
          await getFsImplementation().unlink(join(dirPath, file.name))
          if (isMessagePath) {
            result.messages++
          } else {
            result.errors++
          }
        }
      } catch (error) {
        // Loguea pero sigue procesando el resto de archivos.
        logError(error as Error)
      }
    }
  } catch (error: unknown) {
    // Ignora si el directorio no existe.
    if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
      logError(error)
    }
  }

  return result
}

export async function cleanupOldMessageFiles(): Promise<CleanupResult> {
  const fsImpl = getFsImplementation()
  const cutoffDate = getCutoffDate()
  const errorPath = CACHE_PATHS.errors()
  const baseCachePath = CACHE_PATHS.baseLogs()

  // Limpia logs de mensajes y de error.
  let result = await cleanupOldFilesInDirectory(errorPath, cutoffDate, false)

  // Limpia logs MCP.
  try {
    let dirents
    try {
      dirents = await fsImpl.readdir(baseCachePath)
    } catch {
      return result
    }

    const mcpLogDirs = dirents
      .filter(
        dirent => dirent.isDirectory() && dirent.name.startsWith('mcp-logs-'),
      )
      .map(dirent => join(baseCachePath, dirent.name))

    for (const mcpLogDir of mcpLogDirs) {
      result = addCleanupResults(
        result,
        await cleanupOldFilesInDirectory(mcpLogDir, cutoffDate, true),
      )
      await tryRmdir(mcpLogDir, fsImpl)
    }
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
      logError(error)
    }
  }

  return result
}

async function unlinkIfOld(
  filePath: string,
  cutoffDate: Date,
  fsImpl: FsOperations,
): Promise<boolean> {
  const stats = await fsImpl.stat(filePath)
  if (stats.mtime < cutoffDate) {
    await fsImpl.unlink(filePath)
    return true
  }
  return false
}

async function tryRmdir(dirPath: string, fsImpl: FsOperations): Promise<void> {
  try {
    await fsImpl.rmdir(dirPath)
  } catch {
    // no vacío / no existe
  }
}

export async function cleanupOldSessionFiles(): Promise<CleanupResult> {
  const cutoffDate = getCutoffDate()
  const result: CleanupResult = { messages: 0, errors: 0 }
  const projectsDir = getProjectsDir()
  const fsImpl = getFsImplementation()

  let projectDirents
  try {
    projectDirents = await fsImpl.readdir(projectsDir)
  } catch {
    return result
  }

  for (const projectDirent of projectDirents) {
    if (!projectDirent.isDirectory()) continue
    const projectDir = join(projectsDir, projectDirent.name)

    // Un solo readdir por directorio de proyecto — particiona en
    // archivos y directorios de sesión.
    let entries
    try {
      entries = await fsImpl.readdir(projectDir)
    } catch {
      result.errors++
      continue
    }

    for (const entry of entries) {
      if (entry.isFile()) {
        if (!entry.name.endsWith('.jsonl') && !entry.name.endsWith('.cast')) {
          continue
        }
        try {
          if (
            await unlinkIfOld(join(projectDir, entry.name), cutoffDate, fsImpl)
          ) {
            result.messages++
          }
        } catch {
          result.errors++
        }
      } else if (entry.isDirectory()) {
        // Directorio de sesión — limpia tool-results/<toolDir>/* debajo.
        const sessionDir = join(projectDir, entry.name)
        const toolResultsDir = join(sessionDir, TOOL_RESULTS_SUBDIR)
        let toolDirs
        try {
          toolDirs = await fsImpl.readdir(toolResultsDir)
        } catch {
          // Sin dir de tool-results — igual intenta remover el session
          // dir si está vacío.
          await tryRmdir(sessionDir, fsImpl)
          continue
        }
        for (const toolEntry of toolDirs) {
          if (toolEntry.isFile()) {
            try {
              if (
                await unlinkIfOld(
                  join(toolResultsDir, toolEntry.name),
                  cutoffDate,
                  fsImpl,
                )
              ) {
                result.messages++
              }
            } catch {
              result.errors++
            }
          } else if (toolEntry.isDirectory()) {
            const toolDirPath = join(toolResultsDir, toolEntry.name)
            let toolFiles
            try {
              toolFiles = await fsImpl.readdir(toolDirPath)
            } catch {
              continue
            }
            for (const tf of toolFiles) {
              if (!tf.isFile()) continue
              try {
                if (
                  await unlinkIfOld(
                    join(toolDirPath, tf.name),
                    cutoffDate,
                    fsImpl,
                  )
                ) {
                  result.messages++
                }
              } catch {
                result.errors++
              }
            }
            await tryRmdir(toolDirPath, fsImpl)
          }
        }
        await tryRmdir(toolResultsDir, fsImpl)
        await tryRmdir(sessionDir, fsImpl)
      }
    }

    await tryRmdir(projectDir, fsImpl)
  }

  return result
}

/**
 * Helper genérico para limpiar archivos viejos en un solo directorio.
 */
async function cleanupSingleDirectory(
  dirPath: string,
  extension: string,
  removeEmptyDir: boolean = true,
): Promise<CleanupResult> {
  const cutoffDate = getCutoffDate()
  const result: CleanupResult = { messages: 0, errors: 0 }
  const fsImpl = getFsImplementation()

  let dirents
  try {
    dirents = await fsImpl.readdir(dirPath)
  } catch {
    return result
  }

  for (const dirent of dirents) {
    if (!dirent.isFile() || !dirent.name.endsWith(extension)) continue
    try {
      if (await unlinkIfOld(join(dirPath, dirent.name), cutoffDate, fsImpl)) {
        result.messages++
      }
    } catch {
      result.errors++
    }
  }

  if (removeEmptyDir) {
    await tryRmdir(dirPath, fsImpl)
  }

  return result
}

export function cleanupOldPlanFiles(): Promise<CleanupResult> {
  const plansDir = join(getClaudeConfigHomeDir(), 'plans')
  return cleanupSingleDirectory(plansDir, '.md')
}

export async function cleanupOldFileHistoryBackups(): Promise<CleanupResult> {
  const cutoffDate = getCutoffDate()
  const result: CleanupResult = { messages: 0, errors: 0 }
  const fsImpl = getFsImplementation()

  try {
    const configDir = getClaudeConfigHomeDir()
    const fileHistoryStorageDir = join(configDir, 'file-history')

    let dirents
    try {
      dirents = await fsImpl.readdir(fileHistoryStorageDir)
    } catch {
      return result
    }

    const fileHistorySessionsDirs = dirents
      .filter(dirent => dirent.isDirectory())
      .map(dirent => join(fileHistoryStorageDir, dirent.name))

    await Promise.all(
      fileHistorySessionsDirs.map(async fileHistorySessionDir => {
        try {
          const stats = await fsImpl.stat(fileHistorySessionDir)
          if (stats.mtime < cutoffDate) {
            await fsImpl.rm(fileHistorySessionDir, {
              recursive: true,
              force: true,
            })
            result.messages++
          }
        } catch {
          result.errors++
        }
      }),
    )

    await tryRmdir(fileHistoryStorageDir, fsImpl)
  } catch (error) {
    logError(error as Error)
  }

  return result
}

export async function cleanupOldSessionEnvDirs(): Promise<CleanupResult> {
  const cutoffDate = getCutoffDate()
  const result: CleanupResult = { messages: 0, errors: 0 }
  const fsImpl = getFsImplementation()

  try {
    const configDir = getClaudeConfigHomeDir()
    const sessionEnvBaseDir = join(configDir, 'session-env')

    let dirents
    try {
      dirents = await fsImpl.readdir(sessionEnvBaseDir)
    } catch {
      return result
    }

    const sessionEnvDirs = dirents
      .filter(dirent => dirent.isDirectory())
      .map(dirent => join(sessionEnvBaseDir, dirent.name))

    for (const sessionEnvDir of sessionEnvDirs) {
      try {
        const stats = await fsImpl.stat(sessionEnvDir)
        if (stats.mtime < cutoffDate) {
          await fsImpl.rm(sessionEnvDir, { recursive: true, force: true })
          result.messages++
        }
      } catch {
        result.errors++
      }
    }

    await tryRmdir(sessionEnvBaseDir, fsImpl)
  } catch (error) {
    logError(error as Error)
  }

  return result
}

/**
 * Limpia archivos de log de debug viejos de ~/.claude/debug/.
 * Preserva el symlink 'latest' que apunta al log de la sesión actual.
 */
export async function cleanupOldDebugLogs(): Promise<CleanupResult> {
  const cutoffDate = getCutoffDate()
  const result: CleanupResult = { messages: 0, errors: 0 }
  const fsImpl = getFsImplementation()
  const debugDir = join(getClaudeConfigHomeDir(), 'debug')

  let dirents
  try {
    dirents = await fsImpl.readdir(debugDir)
  } catch {
    return result
  }

  for (const dirent of dirents) {
    // Preserva el symlink 'latest'.
    if (
      !dirent.isFile() ||
      !dirent.name.endsWith('.txt') ||
      dirent.name === 'latest'
    ) {
      continue
    }
    try {
      if (await unlinkIfOld(join(debugDir, dirent.name), cutoffDate, fsImpl)) {
        result.messages++
      }
    } catch {
      result.errors++
    }
  }

  // Intencionalmente NO se remueve debugDir aunque quede vacío — se
  // necesita para logs futuros.
  return result
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * Limpia entradas viejas del caché npm de paquetes de Anthropic.
 * Ayuda a reducir el uso de disco ya que se publican muchas versiones de
 * desarrollo por día. Sólo corre una vez al día para usuarios Ant.
 */
export async function cleanupNpmCacheForAnthropicPackages(): Promise<void> {
  const markerPath = join(getClaudeConfigHomeDir(), '.npm-cache-cleanup')

  try {
    const stat = await fs.stat(markerPath)
    if (Date.now() - stat.mtimeMs < ONE_DAY_MS) {
      logForDebugging('npm cache cleanup: skipping, ran recently')
      return
    }
  } catch {
    // El archivo no existe, procede con la limpieza.
  }

  try {
    await lock(markerPath, { retries: 0, realpath: false })
  } catch {
    logForDebugging('npm cache cleanup: skipping, lock held')
    return
  }

  logForDebugging('npm cache cleanup: starting')

  const npmCachePath = join(homedir(), '.npm', '_cacache')

  const NPM_CACHE_RETENTION_COUNT = 5

  const startTime = Date.now()
  try {
    const cacache = await import('cacache')
    const cutoff = startTime - ONE_DAY_MS

    // Recorre el índice en stream y colecciona todas las entradas de
    // Anthropic.
    const stream = cacache.ls.stream(npmCachePath)
    const anthropicEntries: { key: string; time: number }[] = []
    for await (const entry of stream as AsyncIterable<{
      key: string
      time: number
    }>) {
      if (entry.key.includes('@anthropic-ai/claude-')) {
        anthropicEntries.push({ key: entry.key, time: entry.time })
      }
    }

    // Agrupa por nombre de paquete (todo antes del último separador @versión).
    const byPackage = new Map<string, { key: string; time: number }[]>()
    for (const entry of anthropicEntries) {
      const atVersionIdx = entry.key.lastIndexOf('@')
      const pkgName =
        atVersionIdx > 0 ? entry.key.slice(0, atVersionIdx) : entry.key
      const existing = byPackage.get(pkgName) ?? []
      existing.push(entry)
      byPackage.set(pkgName, existing)
    }

    // Remueve entradas más viejas que 1 día O más allá del top N más
    // reciente por paquete.
    const keysToRemove: string[] = []
    for (const [, entries] of byPackage) {
      entries.sort((a, b) => b.time - a.time) // más nuevo primero
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]!
        if (entry.time < cutoff || i >= NPM_CACHE_RETENTION_COUNT) {
          keysToRemove.push(entry.key)
        }
      }
    }

    await Promise.all(
      keysToRemove.map(key => cacache.rm.entry(npmCachePath, key)),
    )

    await fs.writeFile(markerPath, new Date().toISOString())

    const durationMs = Date.now() - startTime
    if (keysToRemove.length > 0) {
      logForDebugging(
        `npm cache cleanup: Removed ${keysToRemove.length} old @anthropic-ai entries in ${durationMs}ms`,
      )
    } else {
      logForDebugging(`npm cache cleanup: completed in ${durationMs}ms`)
    }
    logEvent('tengu_npm_cache_cleanup', {
      success: true,
      durationMs,
      entriesRemoved: keysToRemove.length,
    })
  } catch (error) {
    logError(error as Error)
    logEvent('tengu_npm_cache_cleanup', {
      success: false,
      durationMs: Date.now() - startTime,
    })
  } finally {
    await unlock(markerPath, { realpath: false }).catch(() => {})
  }
}

/**
 * Envoltura acelerada alrededor de cleanupOldVersions, para limpieza
 * recurrente en sesiones de larga duración. Usa un archivo marcador +
 * lock para asegurar que corre a lo sumo una vez cada 24 horas, y no
 * bloquea si otro proceso ya está limpiando.
 * cleanupOldVersions() sin acelerar sigue usándose para flujos de
 * instalador.
 */
export async function cleanupOldVersionsThrottled(): Promise<void> {
  const markerPath = join(getClaudeConfigHomeDir(), '.version-cleanup')

  try {
    const stat = await fs.stat(markerPath)
    if (Date.now() - stat.mtimeMs < ONE_DAY_MS) {
      logForDebugging('version cleanup: skipping, ran recently')
      return
    }
  } catch {
    // El archivo no existe, procede con la limpieza.
  }

  try {
    await lock(markerPath, { retries: 0, realpath: false })
  } catch {
    logForDebugging('version cleanup: skipping, lock held')
    return
  }

  logForDebugging('version cleanup: starting (throttled)')

  try {
    await cleanupOldVersions()
    await fs.writeFile(markerPath, new Date().toISOString())
  } catch (error) {
    logError(error as Error)
  } finally {
    await unlock(markerPath, { realpath: false }).catch(() => {})
  }
}

export async function cleanupOldMessageFilesInBackground(): Promise<void> {
  // Si los settings tienen errores de validación pero el usuario fijó
  // explícitamente cleanupPeriodDays, se omite la limpieza entera en vez
  // de caer al default (30 días). Esto evita borrar archivos por
  // accidente cuando el usuario quería otro período de retención.
  const { errors } = getSettingsWithAllErrors()
  if (errors.length > 0 && rawSettingsContainsKey('cleanupPeriodDays')) {
    logForDebugging(
      'Skipping cleanup: settings have validation errors but cleanupPeriodDays was explicitly set. Fix settings errors to enable cleanup.',
    )
    return
  }

  await cleanupOldMessageFiles()
  await cleanupOldSessionFiles()
  await cleanupOldPlanFiles()
  await cleanupOldFileHistoryBackups()
  await cleanupOldSessionEnvDirs()
  await cleanupOldDebugLogs()
  await cleanupOldImageCaches()
  await cleanupOldPastes(getCutoffDate())
  const removedWorktrees = await cleanupStaleAgentWorktrees(getCutoffDate())
  if (removedWorktrees > 0) {
    logEvent('tengu_worktree_cleanup', { removed: removedWorktrees })
  }
  if (process.env.USER_TYPE === 'ant') {
    await cleanupNpmCacheForAnthropicPackages()
  }
}
