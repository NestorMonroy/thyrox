/**
 * Puerto de `ccnmt: packages/memory/src/teamMemorySyncWatcher.ts`
 * (verbatim — `@thyrox/local-observability` ya porta tanto el top-level
 * como `/compat`).
 *
 * Watcher de archivos de Team Memory.
 *
 * Vigila el directorio de memoria de equipo en busca de cambios y
 * dispara un push con debounce al servidor cuando se modifican archivos.
 * Hace un pull inicial al arrancar, y luego arranca un fs.watch a nivel
 * de directorio para que las primeras escrituras a un repo nuevo se
 * detecten.
 */

import { feature } from 'bun:bundle'
import { type FSWatcher, watch } from 'node:fs'
import { mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import {
  getTeamMemPath,
  isTeamMemoryEnabled,
} from './teamMemPaths.js'
import { getMemoryHostBindings } from './host.js'
// logForDebugging vía host binding, abajo.
// errorMessage inlineado abajo.
// getGithubRepo vía host binding, abajo.
import { logEvent } from '@thyrox/local-observability'
import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '@thyrox/local-observability/compat'
import {
  createSyncState,
  isTeamMemorySyncAvailable,
  pullTeamMemory,
  pushTeamMemory,
  type SyncState,
} from './teamMemorySync.js'
import type { TeamMemorySyncPushResult } from './teamMemSyncTypes.js'

// Helpers inlineados para mantener a memory hoja de Wave-2 sin src/.
function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  return typeof e === 'string' ? e : String(e)
}
function logForDebugging(message: string, metadata?: unknown): void {
  const b = getMemoryHostBindings() as { logDebug?: (m: string, md?: unknown) => void } | null
  b?.logDebug?.(message, metadata)
}
async function getGithubRepo(): Promise<string | undefined> {
  const b = getMemoryHostBindings() as { getGithubRepo?: () => Promise<string | undefined> | string | undefined } | null
  if (b?.getGithubRepo) return await b.getGithubRepo()
  return undefined
}
function registerCleanup(fn: () => void | Promise<void>): void {
  const b = getMemoryHostBindings() as { registerCleanup?: (cb: () => void | Promise<void>) => void } | null
  b?.registerCleanup?.(fn)
}

const DEBOUNCE_MS = 2000 // Espera 2s tras el último cambio antes de hacer push.

// ─── Estado del watcher ──────────────────────────────────────
let watcher: FSWatcher | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let pushInProgress = false
let hasPendingChanges = false
let currentPushPromise: Promise<void> | null = null
let watcherStarted = false

// Se fija tras un push que falló por una razón que no se autorrepara con
// reintentos. Evita que eventos de watch por escrituras de otras sesiones
// al dir de equipo compartido disparen un loop infinito de reintentos (BQ
// 14-16 marzo: un dispositivo no_oauth emitió 167K eventos de push en 2.5
// días). Se limpia con unlink — borrar el archivo es una acción de
// recuperación para el caso too-many-entries, y para no_oauth es correcto
// que la supresión persista hasta reiniciar la sesión.
let pushSuppressedReason: string | null = null

/**
 * Permanente = reintentar sin acción del usuario fallará de la misma
 * forma.
 * - no_oauth / no_repo: chequeos del cliente previos a la petición, sin
 *   código de estado.
 * - 4xx salvo 409/429: error del cliente (404 repo faltante, 413 too many
 *   entries, 403 permiso). 409 es un conflicto transitorio — el estado del
 *   servidor cambió bajo nosotros, un push fresco tras el próximo pull
 *   puede tener éxito. 429 es un rate limit — el backoff del watcher basta.
 */
export function isPermanentFailure(r: TeamMemorySyncPushResult): boolean {
  if (r.errorType === 'no_oauth' || r.errorType === 'no_repo') return true
  if (
    r.httpStatus !== undefined &&
    r.httpStatus >= 400 &&
    r.httpStatus < 500 &&
    r.httpStatus !== 409 &&
    r.httpStatus !== 429
  ) {
    return true
  }
  return false
}

// Estado de sync propiedad del watcher — compartido entre todas las
// operaciones de sync.
let syncState: SyncState | null = null

/**
 * Ejecuta el push y rastrea su ciclo de vida.
 * El push es de solo lectura en disco (delta+sonda, sin escrituras de
 * merge), así que no hace falta supresión de eventos — las ediciones que
 * llegan a mitad de push tocan schedulePush() y el debounce se re-arma
 * cuando este push termina.
 */
async function executePush(): Promise<void> {
  if (!syncState) {
    return
  }
  pushInProgress = true
  try {
    const result = await pushTeamMemory(syncState)
    if (result.success) {
      hasPendingChanges = false
    }
    if (result.success && result.filesUploaded > 0) {
      logForDebugging(
        `team-memory-watcher: pushed ${result.filesUploaded} files`,
        { level: 'info' },
      )
    } else if (!result.success) {
      logForDebugging(`team-memory-watcher: push failed: ${result.error}`, {
        level: 'warn',
      })
      if (isPermanentFailure(result) && pushSuppressedReason === null) {
        pushSuppressedReason =
          result.httpStatus !== undefined
            ? `http_${result.httpStatus}`
            : (result.errorType ?? 'unknown')
        logForDebugging(
          `team-memory-watcher: suppressing retry until next unlink or session restart (${pushSuppressedReason})`,
          { level: 'warn' },
        )
        logEvent('tengu_team_mem_push_suppressed', {
          reason:
            pushSuppressedReason as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          ...(result.httpStatus && { status: result.httpStatus }),
        })
      }
    }
  } catch (e) {
    logForDebugging(`team-memory-watcher: push error: ${errorMessage(e)}`, {
      level: 'warn',
    })
  } finally {
    pushInProgress = false
    currentPushPromise = null
  }
}

/**
 * Push con debounce: espera a que las escrituras se asienten, y hace push
 * una sola vez.
 */
function schedulePush(): void {
  if (pushSuppressedReason !== null) return
  hasPendingChanges = true
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    if (pushInProgress) {
      schedulePush()
      return
    }
    currentPushPromise = executePush()
  }, DEBOUNCE_MS)
}

/**
 * Arranca a vigilar el directorio de memoria de equipo en busca de
 * cambios.
 *
 * Usa `fs.watch({recursive: true})` sobre el directorio (no chokidar).
 * chokidar 4+ eliminó fsevents, y el fallback de `fs.watch` de Bun usa
 * kqueue, que requiere un fd abierto por archivo vigilado — con 500+
 * archivos de memoria de equipo eso son 500+ fds retenidos permanentemente
 * (confirmado vía lsof + repro).
 *
 * `recursive: true` es necesario porque la memoria de equipo admite
 * subdirectorios (validateTeamMemKey, el walkDir de pushTeamMemory). En
 * macOS Bun usa FSEvents para recursive — fds O(1) sin importar el tamaño
 * del árbol (verificado: 2 fds para 60 archivos en 5 subdirs). En Linux
 * inotify necesita un watch por directorio — O(subdirs), sigue siendo
 * razonable (la memoria de equipo rara vez anida).
 *
 * `fs.watch` sobre un directorio no distingue add/change/unlink — los tres
 * emiten `rename`. Para limpiar la supresión en la ruta de recuperación de
 * too-many-entries (el usuario borra archivos), se hace stat del nombre de
 * archivo en cada evento: ENOENT → se trata como unlink. Para la
 * supresión de `no_oauth` esto es correcto: los usuarios no_oauth no
 * borran archivos de memoria de equipo para recuperarse, reinician con
 * auth.
 */
async function startFileWatcher(teamDir: string): Promise<void> {
  if (watcherStarted) {
    return
  }
  watcherStarted = true

  try {
    // pullTeamMemory retorna temprano sin crear el dir para repos nuevos
    // sin contenido en el servidor (ruta isEmpty de index.ts). mkdir con
    // recursive:true es idempotente — no hace falta chequear existencia.
    await mkdir(teamDir, { recursive: true })

    watcher = watch(
      teamDir,
      { persistent: true, recursive: true },
      (_eventType, filename) => {
        if (filename === null) {
          schedulePush()
          return
        }
        if (pushSuppressedReason !== null) {
          // La supresión solo se limpia con unlink (acción de recuperación
          // para too-many-entries). fs.watch no distingue unlink de
          // add/write — se hace stat para desambiguar. ENOENT → archivo
          // desaparecido → limpiar.
          void stat(join(teamDir, filename)).catch(
            (err: NodeJS.ErrnoException) => {
              if (err.code !== 'ENOENT') return
              if (pushSuppressedReason !== null) {
                logForDebugging(
                  `team-memory-watcher: unlink cleared suppression (was: ${pushSuppressedReason})`,
                  { level: 'info' },
                )
                pushSuppressedReason = null
              }
              schedulePush()
            },
          )
          return
        }
        schedulePush()
      },
    )
    watcher.on('error', err => {
      logForDebugging(
        `team-memory-watcher: fs.watch error: ${errorMessage(err)}`,
        { level: 'warn' },
      )
    })
    logForDebugging(`team-memory-watcher: watching ${teamDir}`, {
      level: 'debug',
    })
  } catch (err) {
    // fs.watch lanza síncronamente ante ENOENT (carrera: dir borrado entre
    // mkdir y watch) o EACCES. watcherStarted ya es true arriba, así que
    // la ruta explícita schedulePush de notifyTeamMemoryWrite sigue
    // funcionando.
    logForDebugging(
      `team-memory-watcher: failed to watch ${teamDir}: ${errorMessage(err)}`,
      { level: 'warn' },
    )
  }

  registerCleanup(async () => stopTeamMemoryWatcher())
}

/**
 * Arranca el sistema de sync de memoria de equipo.
 *
 * Retorna temprano (antes de crear ningún estado) si:
 *   - el flag de build TEAMMEM está apagado
 *   - la memoria de equipo está deshabilitada (isTeamMemoryEnabled)
 *   - OAuth no está disponible (isTeamMemorySyncAvailable)
 *   - el repo actual no tiene remoto github.com
 *
 * El chequeo temprano de github.com evita un modo de fallo ruidoso donde
 * el watcher arranca, dispara ante ediciones locales, y cada push/pull
 * loguea `errorType: no_repo` para siempre. La memoria de equipo tiene
 * alcance GitHub del lado servidor, así que los remotos que no son
 * github.com nunca podrían sincronizar de todas formas.
 *
 * Hace pull del servidor, y luego arranca el watcher de archivos
 * incondicionalmente. El watcher debe arrancar incluso cuando el servidor
 * todavía no tiene contenido (repo EAP fresco) — si no, la primera
 * escritura de memoria de equipo de Claude dependería enteramente de que
 * los hooks PostToolUse disparen notifyTeamMemoryWrite, lo cual es un
 * huevo-y-gallina: la tasa de escritura de Claude es lo bastante baja
 * como para que un partner fresco quede varado en la zona muerta de
 * arranque por días.
 */
export async function startTeamMemoryWatcher(): Promise<void> {
  if (!feature('TEAMMEM')) {
    return
  }
  if (!isTeamMemoryEnabled() || !isTeamMemorySyncAvailable()) {
    return
  }
  const repoSlug = await getGithubRepo()
  if (!repoSlug) {
    logForDebugging(
      'team-memory-watcher: no github.com remote, skipping sync',
      { level: 'debug' },
    )
    return
  }

  syncState = createSyncState()

  // Pull inicial del servidor (corre antes de que arranque el watcher,
  // así que sus escrituras a disco no disparan schedulePush).
  let initialPullSuccess = false
  let initialFilesPulled = 0
  let serverHasContent = false
  try {
    const pullResult = await pullTeamMemory(syncState)
    initialPullSuccess = pullResult.success
    serverHasContent = pullResult.entryCount > 0
    if (pullResult.success && pullResult.filesWritten > 0) {
      initialFilesPulled = pullResult.filesWritten
      logForDebugging(
        `team-memory-watcher: initial pull got ${pullResult.filesWritten} files`,
        { level: 'info' },
      )
    }
  } catch (e) {
    logForDebugging(
      `team-memory-watcher: initial pull failed: ${errorMessage(e)}`,
      { level: 'warn' },
    )
  }

  // Siempre arranca el watcher. Vigilar un dir vacío es barato, y la
  // alternativa (arranque perezoso en notifyTeamMemoryWrite) crea una zona
  // muerta de arranque para repos frescos.
  await startFileWatcher(getTeamMemPath())

  logEvent('tengu_team_mem_sync_started', {
    initial_pull_success: initialPullSuccess,
    initial_files_pulled: initialFilesPulled,
    // Se conserva por continuidad del dashboard; ahora siempre true
    // cuando este evento dispara.
    watcher_started: true,
    server_has_content: serverHasContent,
  })
}

/**
 * Llamar esto cuando se escribe un archivo de memoria de equipo (p. ej.
 * desde hooks PostToolUse). Programa un push explícitamente por si
 * fs.watch se pierde la escritura — un archivo escrito en el mismo tick
 * en que arranca el watcher puede no disparar un evento, y algunas
 * plataformas coalescen escrituras sucesivas rápidas. Si el watcher sí
 * dispara, el timer de debounce simplemente se reinicia.
 */
export async function notifyTeamMemoryWrite(): Promise<void> {
  if (!syncState) {
    return
  }
  schedulePush()
}

/**
 * Detiene el watcher de archivos y descarga los cambios pendientes.
 * Nota: corre dentro del presupuesto de 2s de graceful shutdown, así que
 * la descarga es best-effort — si el PUT HTTP no completa a tiempo,
 * process.exit() lo matará.
 */
export async function stopTeamMemoryWatcher(): Promise<void> {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (watcher) {
    watcher.close()
    watcher = null
  }
  // Espera cualquier push en vuelo.
  if (currentPushPromise) {
    try {
      await currentPushPromise
    } catch {
      // Ignora errores durante el shutdown.
    }
  }
  // Descarga cambios pendientes que fueron debounced pero no pusheados aún.
  if (hasPendingChanges && syncState && pushSuppressedReason === null) {
    try {
      await pushTeamMemory(syncState)
    } catch {
      // Best-effort — el shutdown puede matar esto.
    }
  }
}

/**
 * Solo para tests: reinicia el estado del módulo y opcionalmente siembra
 * syncState. La guarda feature('TEAMMEM') al inicio de
 * startTeamMemoryWatcher() siempre es false en bun test, así que los
 * tests no pueden fijar syncState por la ruta normal. Este helper deja que
 * los tests manejen notifyTeamMemoryWrite() / stopTeamMemoryWatcher()
 * directamente.
 *
 * `skipWatcher: true` marca el watcher como ya-arrancado sin arrancarlo de
 * verdad. Los tests que solo ejercitan la ruta schedulePush/flush no
 * necesitan un watcher real.
 */
export function _resetWatcherStateForTesting(opts?: {
  syncState?: SyncState
  skipWatcher?: boolean
  pushSuppressedReason?: string | null
}): void {
  watcher = null
  debounceTimer = null
  pushInProgress = false
  hasPendingChanges = false
  currentPushPromise = null
  watcherStarted = opts?.skipWatcher ?? false
  pushSuppressedReason = opts?.pushSuppressedReason ?? null
  syncState = opts?.syncState ?? null
}

/**
 * Solo para tests: arranca el fs.watch real sobre un directorio
 * especificado. Lo usa el test de regresión de conteo de fds —
 * startTeamMemoryWatcher() está condicionado por feature('TEAMMEM'), que
 * es false bajo bun test.
 */
export function _startFileWatcherForTesting(dir: string): Promise<void> {
  return startFileWatcher(dir)
}
