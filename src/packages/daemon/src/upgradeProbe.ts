/**
 * Detección de actualización del binario en ejecución, auto-respawn del
 * daemon, y el margen de apagado que drena tareas pendientes antes de
 * salir. Puerto de `ant chunk-92tvramn.js` — símbolos `It` (stat del
 * binario, sigue symlink), `Fr` (compara dos stats), `dn`
 * (self-respawn al detectar upgrade en el arranque), `le` (margen de
 * apagado), `me` (tracking fire-and-forget de promesas pendientes) y la
 * constante `kr` (validación de `cliVersion`).
 *
 * `Fr`/`It` alimentan `setupUpgradeWatchdog` en `./bgDaemonTimers.ts`.
 * El resto de `dn` — el ensamblado de `daemon run`, la espera de
 * reachability y la escritura del log del sucesor — vive fuera de este
 * paquete en la referencia (`Ozt`/launcher, `Le`/log rotativo); aquí se
 * porta como lógica de orquestación con esas piezas inyectadas.
 */

import { readFile, realpath as fsRealpath, rm as fsRm, stat as fsStat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, sep } from 'node:path'

import { logEvent as realLogEvent } from '@thyrox/local-observability'
import { logError as realLogError } from '@thyrox/local-observability/logging'
import { errorMessage, getErrnoCode, isENOENT } from '@thyrox/local-observability/errorHelpers.js'
import { isInBundledMode } from '@thyrox/config/bundledMode.js'

import { daemonRequest } from './daemonClient.js'

// ---------------------------------------------------------------------------
// kr — regex-validacion-cliversion
// ---------------------------------------------------------------------------

/** `ant chunk-92tvramn.js` variable `kr`: forma aceptada de `cliVersion`. */
export const CLI_VERSION_PATTERN = /^[0-9A-Za-z.+_-]{1,100}$/

/**
 * `kr.test(...)?...:"unrecognized"` — sanea `cliVersion` antes de
 * mostrarlo. La referencia lo aplica como guarda ternaria en el sitio de
 * despliegue (roster/status); aquí se expone como función pura para que
 * cualquier lector la reuse sin reimplementar el regex.
 * pendiente: roster.ts (líneas 58,111,145) no pertenece a esta tarea —
 * queda sin aplicar la sanitización a lo que persiste/expone hoy.
 */
export function sanitizeCliVersion(cliVersion: string): string {
  return CLI_VERSION_PATTERN.test(cliVersion) ? cliVersion : 'unrecognized'
}

// ---------------------------------------------------------------------------
// It — resolveBinaryStat
// ---------------------------------------------------------------------------

export interface BinaryStat {
  target: string
  mtimeMs: number
}

export interface ResolveBinaryStatDeps {
  realpath: (path: string) => Promise<string>
  stat: (path: string) => Promise<{ mtimeMs: number }>
}

const defaultResolveBinaryStatDeps: ResolveBinaryStatDeps = {
  realpath: fsRealpath,
  stat: fsStat,
}

/**
 * `It`: resuelve `path` a su target real (sigue symlinks) y su
 * `mtimeMs`. ENOENT (`U(e)` en la referencia) se traduce a `null`;
 * cualquier otro error se relanza para que el llamador lo clasifique.
 */
export async function resolveBinaryStat(
  path: string,
  deps: ResolveBinaryStatDeps = defaultResolveBinaryStatDeps,
): Promise<BinaryStat | null> {
  try {
    const target = await deps.realpath(path)
    const { mtimeMs } = await deps.stat(target)
    return { target, mtimeMs }
  } catch (error) {
    if (isENOENT(error)) return null
    throw error
  }
}

// ---------------------------------------------------------------------------
// Kat — isManagedVersionedBuild (el descuento que Fr consulta)
// ---------------------------------------------------------------------------

function managedVersionsDir(): string {
  const dataHome = process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share')
  // `ccb` es el nombre de directorio propio de thyrox para el layout que
  // la referencia guarda bajo `claude` (mismo patrón que
  // `@thyrox/updater: nativeInstaller/installer.ts::getBaseDirectories`).
  return join(dataHome, 'ccb', 'versions')
}

/**
 * `Kat`: `true` sólo si el proceso corre como ejecutable standalone
 * empaquetado (`Ed()`) Y su `execPath` vive bajo el directorio de
 * versiones administradas por el instalador nativo (`PDt()`). Un build
 * así no confía en el mtime para detectar upgrade — el instalador
 * reemplaza el símlink activo, no el archivo, así que el eje de verdad
 * es el `target`, no el `mtimeMs`.
 */
export function isManagedVersionedBuild(
  execPath: string = process.execPath,
  isBundled: boolean = isInBundledMode(),
): boolean {
  if (!isBundled) return false
  return execPath.startsWith(managedVersionsDir() + sep)
}

// ---------------------------------------------------------------------------
// Fr — hasBinaryChanged
// ---------------------------------------------------------------------------

/**
 * `Fr`: un `target` distinto (symlink resuelto a otro archivo) siempre
 * cuenta como cambio. Con el mismo `target`, sólo cuenta si además
 * cambió el `mtimeMs` — salvo que `isManagedVersionedBuild()` desactive
 * esa segunda comparación.
 */
export function hasBinaryChanged(
  previous: BinaryStat,
  current: BinaryStat,
  isManagedBuild: boolean = isManagedVersionedBuild(),
): boolean {
  if (previous.target !== current.target) return true
  return !isManagedBuild && previous.mtimeMs !== current.mtimeMs
}

// ---------------------------------------------------------------------------
// me — trackPending
// ---------------------------------------------------------------------------

/**
 * `me`: añade `promise` a `pending` y la retira sola vía `.finally()`
 * cuando se asienta — tracking fire-and-forget para que un apagado
 * pueda esperar (con margen) a que las escrituras en vuelo terminen.
 */
export function trackPending(pending: Set<Promise<unknown>>, promise: Promise<unknown>): void {
  pending.add(promise)
  // `.finally()` devuelve una promesa nueva que también rechaza si
  // `promise` rechaza; se descarta con un `catch` mudo para no dejar un
  // rechazo sin manejar — el rechazo original sigue siendo del llamador.
  void promise.finally(() => pending.delete(promise)).catch(() => {})
}

// ---------------------------------------------------------------------------
// le — shutdownWithDrainGrace
// ---------------------------------------------------------------------------

export interface ShutdownDrainDeps {
  /** Tareas de vaciado a esperar (p. ej. drenar `pending` de arriba). */
  drainTasks: ReadonlyArray<() => Promise<unknown>>
  /** Margen máximo de espera; 500ms en la referencia. */
  graceMs?: number
  exit: (code: number) => void
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    const timer = setTimeout(resolve, ms)
    timer.unref?.()
  })
}

/**
 * `le`: da hasta `graceMs` (500 por defecto) para que `drainTasks`
 * terminen antes de salir con `code`. Cualquier fallo de la espera se
 * ignora — el apagado nunca se bloquea por una tarea de vaciado rota.
 */
export async function shutdownWithDrainGrace(code: number, deps: ShutdownDrainDeps): Promise<void> {
  const graceMs = deps.graceMs ?? 500
  await Promise.race([Promise.all(deps.drainTasks.map(task => task())), delay(graceMs)]).catch(() => {})
  deps.exit(code)
}

// ---------------------------------------------------------------------------
// dn — respawnDaemonOnUpgrade
// ---------------------------------------------------------------------------

/** `hw`: redacta el id aleatorio del directorio temporal de captura de stderr. */
const DAEMON_TEMP_DIR_ID_PATTERN = /cc-daemon-[0-9a-f]{16}/g

function redactDaemonTempDirId(text: string): string {
  return text.replace(DAEMON_TEMP_DIR_ID_PATTERN, 'cc-daemon-*')
}

/** `cl`: lee un archivo entero si es un archivo regular y no excede `maxBytes`; `null` en cualquier otro caso. */
async function readCappedFile(path: string, maxBytes: number): Promise<string | null> {
  try {
    const info = await fsStat(path)
    if (!info.isFile() || info.size > maxBytes) return null
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

/** `dJe`: sondea `ping` sobre el socket de control hasta `timeoutMs`, cada 100ms. */
async function pingUntilReachable(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  do {
    const response = await daemonRequest('ping', {}, { timeoutMs: 100 })
    if (response.ok) return true
    await delay(100)
  } while (Date.now() < deadline)
  return false
}

export interface RespawnSpawnResult {
  err: unknown
  stderrPath?: string
}

export interface SuccessorLogWriter {
  write: (source: string, line: string) => void
  close: () => Promise<void>
}

export interface RespawnDaemonDeps {
  /** `Ozt`: lanza `daemon run` con los flags dados. pendiente: el spawn
   * real con reintentos de launcher/reinstalación de `Ozt` no se porta
   * aquí — pertenece al subsistema de `spawnPtyHost` /
   * `pendingCrossPackageDeps.ts`, fuera del alcance de esta tarea. */
  spawnDaemon: (args: string[]) => Promise<RespawnSpawnResult>
  /** `dJe`: `true` si el sucesor responde `ping` dentro de `timeoutMs`. */
  waitReachable?: (timeoutMs: number) => Promise<boolean>
  /** `cl`: cola de hasta `maxBytes` del stderr capturado, o `null`. */
  readStderrTail?: (path: string, maxBytes: number) => Promise<string | null>
  /** `Le`: abre el log del sucesor para anotar el fallo. pendiente: el
   * escritor con rotación por tamaño no se porta — inyectado por quien
   * ya tenga uno (no existe hoy en este paquete). */
  openSuccessorLog: (logPath: string) => Promise<SuccessorLogWriter>
  /** `Ur(zr(h),...)`: borra el directorio de captura de stderr. */
  removeStderrCaptureDir?: (stderrPath: string) => Promise<void>
  /** `d`: error persistente — por defecto el `logError` real. */
  logError?: (error: unknown) => void
  /** `Tv`: evento de telemetría — por defecto el `logEvent` real. */
  logEvent?: (name: string, metadata?: Record<string, unknown>) => void
  /** `QF` = 45000ms en la referencia. */
  reachableTimeoutMs?: number
}

async function defaultRemoveStderrCaptureDir(stderrPath: string): Promise<void> {
  await fsRm(dirname(stderrPath), { recursive: true, force: true })
}

/**
 * `dn`: al detectar upgrade en el arranque, relanza el propio daemon
 * (`daemon run` con los mismos flags) y espera a que responda. Si no lo
 * logra, lo registra en el log del sucesor y en telemetría
 * (`tengu_daemon_upgrade_respawn_unreachable`); si el respawn ni pudo
 * lanzarse, va a `logError` + `tengu_bg_daemon_spawn_failed`.
 */
export async function respawnDaemonOnUpgrade(
  jsonPath: string,
  logPath: string,
  origin: string,
  spawnedBy: string | undefined,
  deps: RespawnDaemonDeps,
): Promise<void> {
  const waitReachable = deps.waitReachable ?? pingUntilReachable
  const readStderrTail = deps.readStderrTail ?? readCappedFile
  const removeStderrCaptureDir = deps.removeStderrCaptureDir ?? defaultRemoveStderrCaptureDir
  const logError = deps.logError ?? realLogError
  const logEvent = deps.logEvent ?? realLogEvent
  const reachableTimeoutMs = deps.reachableTimeoutMs ?? 45_000

  const args = [
    'daemon',
    'run',
    '--json-path',
    jsonPath,
    '--log-file',
    logPath,
    '--origin',
    origin,
    ...(spawnedBy ? ['--spawned-by', spawnedBy] : []),
  ]
  const { err, stderrPath } = await deps.spawnDaemon(args)
  const failureReason = err
    ? `failed to spawn: ${errorMessage(err)}`
    : (await waitReachable(reachableTimeoutMs))
      ? null
      : `spawned but never became reachable within ${reachableTimeoutMs / 1000}s`

  if (failureReason !== null) {
    const rawTail = stderrPath ? await readStderrTail(stderrPath, 1_048_576) : ''
    const stderrTail = redactDaemonTempDirId((rawTail ?? '').trim()).slice(-2000)
    const log = await deps.openSuccessorLog(logPath).catch(() => null)
    log?.write(
      'supervisor',
      `upgrade self-respawn ${failureReason} — bg workers may be orphan-reaped ~60s after this process exits unless a client restarts the daemon (run \`ccb agents\`)` +
        (stderrTail ? `; successor stderr: ${stderrTail}` : ''),
    )
    await log?.close()
    if (!err) {
      logEvent('tengu_daemon_upgrade_respawn_unreachable', {
        stderr_captured: stderrTail.length > 0,
      })
    }
  }

  if (stderrPath) await removeStderrCaptureDir(stderrPath).catch(() => {})

  if (err) {
    logError(new Error(`daemon: upgrade self-respawn failed: ${errorMessage(err)}`))
    const errnoCode = getErrnoCode(err)
    logEvent('tengu_bg_daemon_spawn_failed', {
      respawn: true,
      errno_enoent: errnoCode === 'ENOENT',
      errno_eacces: errnoCode === 'EACCES',
      errno: errnoCode ?? 'unknown',
    })
  }
}
