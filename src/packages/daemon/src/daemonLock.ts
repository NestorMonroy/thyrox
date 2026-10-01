/**
 * `daemon.lock`: adquisición con reintento, reemplazo de lock obsoleto y
 * clasificación de un conflicto de bind contra un daemon vivo.
 *
 * Puerto acotado de `chunk-92tvramn.js` (referencia 2.1.283): `xt`
 * (adquisición/reemplazo, subconjunto — ver divergencia declarada abajo),
 * `Wt` (mensaje: daemon en shell sosteniendo el lock), `Vt`/`Ibe` (mensaje
 * clasificado por causa de conflicto), `Ft`/`a2t` (mensaje de origen
 * desconocido) y `jr` (clasificación EADDRINUSE/EACCES vs crash genérico).
 * También `chunk-ygx717jg.js` `Ae` (archivo de tokens del socket).
 *
 * Divergencia de scope: la referencia guarda `daemon.lock` en `~/.claude`
 * global (`bR()`, un solo daemon por máquina). thyrox scopea el daemon por
 * repo (`socketPaths.ts::getDaemonScopeDir`), así que el lock vive junto al
 * `control.sock`, no en un directorio global.
 *
 * Pendiente: `i2t` distingue un lock obsoleto por `predates_boot` de uno
 * por `pid_recycled` comparando el tiempo de arranque del proceso
 * (`Hx`/`nc`, que leen `/proc/<pid>/stat` con caché). Ese seguimiento no
 * existe en thyrox — aquí cualquier lock cuyo pid ya no responde a la señal
 * 0 se trata como obsoleto sin distinguir la causa.
 *
 * El outcome `"timed-out"` de `Vt` lo produce el intento activo de parada
 * (`kyt`/`Ayt`, `chunk-kfkmbq3a.js`): `stopDaemonHolder`,
 * `stopTransientLockHolder` y `acquireDaemonLockStoppingTransient`. La
 * referencia lo invoca desde los subcomandos de servicio (`wa`:
 * `install`/`start`); thyrox no los tiene, así que su llamador natural es
 * un futuro `daemon stop` en `daemonCli.ts`. Divergencia: `EJe` (verificar
 * que el pid es de verdad el daemon por su `procStart`) no existe aquí, y
 * un pid vivo se trata como verificado.
 *
 * El lado que PIDE el relevo del handshake `yield` (`xt`, antes de
 * adquirir) es `requestTransientYield`; el lado que responde vive en
 * `bgDaemon.ts`. El sondeo de desplazamiento del loop (`xt` `L`) es
 * `probeLockDisplacement`.
 *
 * @dynamicRequire
 */

import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { PRODUCT_NAME } from '@thyrox/config/product'
import { logEvent } from '@thyrox/local-observability'
import { logError } from '@thyrox/local-observability/logging'

import { isYieldAck, type Response } from './socketProto.js'

/** Contenido persistido en `daemon.lock`. */
export interface DaemonLockInfo {
  pid: number
  startedAt: number
  origin: 'transient' | 'service' | 'shell'
}

/** `chunk-kfkmbq3a.js` `Vt` — causas de conflicto con un lock vivo. */
export type LockConflictOutcome = 'eperm' | 'unverified' | 'timed-out'

export interface LockAcquireResult {
  ok: true
  lock: DaemonLockInfo
}

export interface LockConflictResult {
  ok: false
  lock: DaemonLockInfo
  outcome: LockConflictOutcome
}

/** `chunk-kfkmbq3a.js` `wwn` — retardo entre reintentos de adquisición. */
const RETRY_DELAY_MS = 250

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** `chunk-kfkmbq3a.js` `bR`, re-scopeado por repo (ver divergencia arriba). */
export function getDaemonLockPath(scopeDir: string): string {
  return join(scopeDir, 'daemon.lock')
}

/**
 * `chunk-kfkmbq3a.js` `Ij`, subconjunto legacy-fs (sin la rama de storage
 * v5 vía `StorageBackend.read`, que thyrox no tiene). Contenido ausente,
 * no-JSON o con forma inesperada se trata igual: `null`.
 */
export function readDaemonLock(lockPath: string): DaemonLockInfo | null {
  let raw: string
  try {
    raw = readFileSync(lockPath, 'utf8')
  } catch {
    return null
  }
  return parseDaemonLock(raw)
}

/**
 * Lectura del lock que distingue «no hay lock» (`ENOENT` → `null`) de un
 * fallo de lectura, que se propaga: el sondeo de desplazamiento reintenta
 * ese fallo en vez de confundirlo con un lock ausente.
 */
export function readDaemonLockOrThrow(lockPath: string): DaemonLockInfo | null {
  let raw: string
  try {
    raw = readFileSync(lockPath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
  return parseDaemonLock(raw)
}

function parseDaemonLock(raw: string): DaemonLockInfo | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (
    parsed !== null &&
    typeof parsed === 'object' &&
    typeof (parsed as DaemonLockInfo).pid === 'number' &&
    typeof (parsed as DaemonLockInfo).startedAt === 'number'
  ) {
    return parsed as DaemonLockInfo
  }
  return null
}

export type SignalProbeResult = 'alive' | 'eperm' | 'dead'

/**
 * `chunk-j2p7jgmc.js` `ua` — sondeo de vida por señal 0, salvo que aquí se
 * distingue `EPERM` (el proceso existe pero es de otro usuario) de `dead`
 * (`ESRCH`), porque `classifyLiveLockOutcome` necesita esa distinción.
 */
export function probeProcessSignal(pid: number): SignalProbeResult {
  if (pid <= 1) return 'dead'
  try {
    process.kill(pid, 0)
    return 'alive'
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EPERM') return 'eperm'
    return 'dead'
  }
}

export function isProcessAlive(pid: number): boolean {
  return probeProcessSignal(pid) !== 'dead'
}

function classifyLiveLockOutcome(pid: number): LockConflictOutcome {
  return probeProcessSignal(pid) === 'eperm' ? 'eperm' : 'unverified'
}

function writeLockExclusive(lockPath: string, info: DaemonLockInfo): boolean {
  try {
    writeFileSync(lockPath, JSON.stringify(info), { flag: 'wx', mode: 0o600 })
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false
    throw error
  }
}

async function tryAcquireOnce(
  lockPath: string,
  info: DaemonLockInfo,
): Promise<LockAcquireResult | LockConflictResult | 'retry'> {
  if (writeLockExclusive(lockPath, info)) return { ok: true, lock: info }
  const held = readDaemonLock(lockPath)
  if (held?.pid === info.pid) return { ok: true, lock: held }
  if (held && isProcessAlive(held.pid)) {
    return { ok: false, lock: held, outcome: classifyLiveLockOutcome(held.pid) }
  }
  // Lock ausente/ilegible (basura) o con un pid que ya no responde:
  // obsoleto en los dos casos — chunk-92tvramn.js xt, camino de reemplazo.
  try {
    unlinkSync(lockPath)
  } catch {
    // otro intento concurrente ya lo limpió.
  }
  if (held) {
    logEvent('tengu_daemon_stale_lock_replaced', { held_pid: String(held.pid) })
  }
  return 'retry'
}

/**
 * Adquiere `daemon.lock` en `scopeDir`, con reintento acotado y reemplazo
 * de lock obsoleto. `chunk-92tvramn.js` `xt`, subconjunto de adquisición
 * (ver las dos divergencias declaradas en la cabecera del módulo).
 */
export async function acquireDaemonLock(
  scopeDir: string,
  origin: DaemonLockInfo['origin'] = 'transient',
  opts: { retries?: number } = {},
): Promise<LockAcquireResult | LockConflictResult> {
  const lockPath = getDaemonLockPath(scopeDir)
  mkdirSync(scopeDir, { recursive: true, mode: 0o700 })
  const info: DaemonLockInfo = { pid: process.pid, startedAt: Date.now(), origin }
  const retries = opts.retries ?? 2

  for (let attempt = 0; ; attempt++) {
    const result = await tryAcquireOnce(lockPath, info)
    if (result !== 'retry') return result
    if (attempt >= retries) {
      const held = readDaemonLock(lockPath)
      if (held && isProcessAlive(held.pid)) {
        return { ok: false, lock: held, outcome: classifyLiveLockOutcome(held.pid) }
      }
      return { ok: false, lock: held ?? info, outcome: 'unverified' }
    }
    await delay(RETRY_DELAY_MS)
  }
}

/**
 * Libera `daemon.lock` sólo si sigue siendo el nuestro (mismo pid y
 * `startedAt`) — mismo guardia que `chunk-92tvramn.js` `xt` usa antes de
 * `p8r` en su cierre, para no borrar el lock de un daemon que ya ganó la
 * carrera después de que este arranque se abortó.
 */
export function releaseDaemonLock(scopeDir: string, pid: number, startedAt: number): void {
  const lockPath = getDaemonLockPath(scopeDir)
  const held = readDaemonLock(lockPath)
  if (held && held.pid === pid && held.startedAt === startedAt) {
    try {
      unlinkSync(lockPath)
    } catch {
      // ya no está — nada que liberar.
    }
  }
}

/** `chunk-92tvramn.js` `Wt` — un daemon en shell (`origin: 'shell'`, el
 * equivalente de `foreground` en la referencia) ya sostiene el lock. */
export function formatForegroundLockMessage(prefix: string, pid: number): string {
  return (
    `${prefix} refused: a foreground daemon (pid ${pid}) holds the daemon ` +
    `lock — stop it first (Ctrl-C in its terminal or \`${PRODUCT_NAME} daemon stop\`)`
  )
}

/** `chunk-kfkmbq3a.js` `Ibe` — texto de la causa, por outcome. */
function describeLockConflict(result: LockConflictResult): string {
  switch (result.outcome) {
    case 'eperm':
      return (
        `the daemon holding the lock (pid ${result.lock.pid}) is owned by ` +
        'another user and cannot be signalled from this session'
      )
    case 'unverified':
      return (
        `pid ${result.lock.pid} is holding the daemon lock but could not ` +
        'be verified as the daemon, so it was not signalled'
      )
    case 'timed-out':
      return (
        `the daemon holding the lock (pid ${result.lock.pid}) was asked ` +
        'to stop but has not exited yet'
      )
  }
}

/** `chunk-kfkmbq3a.js` `f8r` — consejo del caso `unverified`. */
function unverifiedAdvice(lockPath: string): string {
  return (
    `Stop it with \`${PRODUCT_NAME} daemon stop --any\` (a graceful, ` +
    `socket-based stop); if nothing is running at that pid, delete ${lockPath}`
  )
}

/**
 * `chunk-92tvramn.js` `Vt` — mensaje de rechazo clasificado por causa de
 * conflicto con un lock vivo.
 */
export function formatLockConflictMessage(
  prefix: string,
  result: LockConflictResult,
  lockPath: string,
): string {
  const advice =
    result.outcome === 'eperm'
      ? 'Stop it from the account that owns it'
      : result.outcome === 'timed-out'
        ? `Wait for it to exit (or kill pid ${result.lock.pid})`
        : unverifiedAdvice(lockPath)
  return (
    `${prefix} refused: ${describeLockConflict(result)} — a freshly ` +
    `started service would lose the lockfile race to it and crash-loop. ${advice}, then retry.`
  )
}

/**
 * `chunk-92tvramn.js` `Ft`/`a2t` — mensaje genérico cuando el origen del
 * lock no se reconoce (pudo escribirlo un daemon de una versión más
 * nueva).
 */
export function formatUnknownOriginLockMessage(prefix: string, pid: number): string {
  return (
    `${prefix} refused: a background daemon with an unrecognized origin ` +
    `(pid ${pid}) holds the daemon lock — it may have been started by a ` +
    `newer build, so it was left untouched. Stop it (\`${PRODUCT_NAME} daemon stop\`) and retry.`
  )
}

/**
 * Compone Wt/Vt/Ft según el `origin` del lock en conflicto — mismo
 * discriminador que el `switch` de `wa` (`chunk-92tvramn.js`) sobre
 * `M.kind` (`"foreground"` / `"not-stopped"` / `"unknown-origin"`), pero
 * llamado desde `startSocketServer` en vez de los subcomandos de servicio
 * (`install`/`start`), que thyrox no tiene.
 */
export function formatLockRefusalMessage(
  prefix: string,
  result: LockConflictResult,
  lockPath: string,
): string {
  if (result.lock.origin === 'shell') {
    return formatForegroundLockMessage(prefix, result.lock.pid)
  }
  if (result.lock.origin === 'transient' || result.lock.origin === 'service') {
    return formatLockConflictMessage(prefix, result, lockPath)
  }
  return formatUnknownOriginLockMessage(prefix, result.lock.pid)
}

/**
 * `chunk-92tvramn.js` `jr` — un fallo de `listen` por `EADDRINUSE`/
 * `EACCES` es el caso esperado de dos daemons compitiendo por el mismo
 * socket (se registra como evento, no como error persistente); cualquier
 * otro fallo de bind es un crash real.
 */
export function classifyListenError(
  error: unknown,
  deps: {
    logErrorFn?: (error: unknown) => void
    logEventFn?: (name: string, metadata?: Record<string, unknown>) => void
  } = {},
): void {
  const { logErrorFn = logError, logEventFn = logEvent } = deps
  const errno = error as NodeJS.ErrnoException
  if (
    errno &&
    typeof errno === 'object' &&
    errno.syscall === 'listen' &&
    (errno.code === 'EADDRINUSE' || errno.code === 'EACCES')
  ) {
    logEventFn('tengu_daemon_listen_conflict', { code: String(errno.code) })
    return
  }
  logErrorFn(error)
}

/** Tokens persistidos junto al socket de control. */
export interface SocketTokens {
  controlAuth: string
}

/**
 * `chunk-ygx717jg.js` `Ae` — archivo de tokens del socket de control
 * (0600, junto al lock). No-op en Windows, igual que la referencia.
 *
 * Pendiente: nada del lado del cliente (`daemonClient.ts`) ni del
 * protocolo (`socketProto.ts`) verifica todavía este token — quedan fuera
 * del alcance de esta tarea (no se tocan). Esta función sólo persiste el
 * archivo; el cableado de verificación es trabajo futuro declarado.
 */
export function writeSocketTokensFile(
  scopeDir: string,
  tokens: SocketTokens,
): string | undefined {
  if (process.platform === 'win32') return undefined
  const tokensPath = join(scopeDir, 'control.tokens.json')
  try {
    mkdirSync(scopeDir, { recursive: true, mode: 0o700 })
    writeFileSync(tokensPath, JSON.stringify(tokens), { mode: 0o600 })
    return tokensPath
  } catch (error) {
    logEvent('tengu_daemon_write_socket_tokens_failed', {
      error: String(error instanceof Error ? error.message : error).slice(0, 120),
    })
    return undefined
  }
}

/** `chunk-kfkmbq3a.js` `kyt` — gracia por defecto tras SIGTERM. */
const STOP_GRACEFUL_MS = 2_000
/** `chunk-kfkmbq3a.js` `kyt` — cadencia del sondeo de salida tras SIGTERM. */
const STOP_POLL_MS = 50
/** `chunk-92tvramn.js` `xt` — plazo para que el transitorio suelte el lock. */
const YIELD_TAKEOVER_TIMEOUT_MS = 5_000
/** `chunk-92tvramn.js` `xt` — cadencia del sondeo del lock durante el relevo. */
const YIELD_POLL_MS = 100

export type StopHolderOutcome = 'exited' | 'eperm' | 'timed-out'

export interface StopHolderOptions {
  gracefulMs?: number
}

/**
 * `chunk-kfkmbq3a.js` `kyt` — SIGTERM al titular y espera activa a que
 * salga. `EPERM` es el caso esperado de un titular de otro usuario; otro
 * fallo de la señal (`ESRCH`) significa que ya no existe.
 */
export async function stopDaemonHolder(
  pid: number,
  opts: StopHolderOptions = {},
): Promise<StopHolderOutcome> {
  try {
    process.kill(pid, 'SIGTERM')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EPERM') return 'eperm'
    return 'exited'
  }
  const deadline = Date.now() + (opts.gracefulMs ?? STOP_GRACEFUL_MS)
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) return 'exited'
    await delay(STOP_POLL_MS)
  }
  return 'timed-out'
}

export type StopTransientResult =
  | { kind: 'none' }
  | { kind: 'service' | 'shell'; lock: DaemonLockInfo }
  | { kind: 'stopped'; pid: number }
  | { kind: 'not-stopped'; lock: DaemonLockInfo; outcome: Exclude<StopHolderOutcome, 'exited'> }

/**
 * `chunk-kfkmbq3a.js` `Ayt` — sólo un titular transitorio se puede parar
 * para quitarle el lock; uno de servicio o en shell se devuelve intacto.
 * Un lock ausente o de un pid muerto no tiene a quién parar.
 */
export async function stopTransientLockHolder(
  lockPath: string,
  opts: StopHolderOptions = {},
): Promise<StopTransientResult> {
  const held = readDaemonLock(lockPath)
  if (!held || !isProcessAlive(held.pid)) return { kind: 'none' }
  if (held.origin === 'service' || held.origin === 'shell') return { kind: held.origin, lock: held }
  const outcome = await stopDaemonHolder(held.pid, opts)
  if (outcome === 'exited') return { kind: 'stopped', pid: held.pid }
  return { kind: 'not-stopped', lock: held, outcome }
}

/**
 * Adquisición que, ante un lock vivo de un daemon transitorio, intenta
 * pararlo (`Ayt`) y reintenta. Es el camino por el que el outcome
 * `"timed-out"` de `Vt` llega al llamador: el titular recibió SIGTERM y
 * no salió dentro de la gracia.
 */
export async function acquireDaemonLockStoppingTransient(
  scopeDir: string,
  origin: DaemonLockInfo['origin'],
  opts: StopHolderOptions = {},
): Promise<LockAcquireResult | LockConflictResult> {
  const first = await acquireDaemonLock(scopeDir, origin)
  if (first.ok) return first
  const stop = await stopTransientLockHolder(getDaemonLockPath(scopeDir), opts)
  if (stop.kind === 'stopped') return acquireDaemonLock(scopeDir, origin)
  if (stop.kind === 'not-stopped') return { ok: false, lock: stop.lock, outcome: stop.outcome }
  return first
}

export interface DisplacementProbeDeps {
  readLock?: (lockPath: string) => DaemonLockInfo | null
  retryDelayMs?: number
  logEventFn?: (name: string, metadata?: Record<string, unknown>) => void
}

/**
 * `chunk-92tvramn.js` `xt` (`L`) — pid del daemon que nos desplazó (el
 * lock lo sostiene otro pid), o `null`. Un fallo de lectura se reintenta
 * una vez; el segundo se registra con nivel y cuenta como no desplazado,
 * igual que la referencia (`level:"warn"`).
 */
export async function probeLockDisplacement(
  lockPath: string,
  ownPid: number,
  deps: DisplacementProbeDeps = {},
): Promise<number | null> {
  const { readLock = readDaemonLockOrThrow, retryDelayMs = RETRY_DELAY_MS, logEventFn = logEvent } = deps
  for (let attempt = 0; ; attempt++) {
    try {
      const held = readLock(lockPath)
      return held !== null && held.pid !== ownPid ? held.pid : null
    } catch (error) {
      if (attempt === 0) {
        await delay(retryDelayMs)
        continue
      }
      logEventFn('tengu_daemon_displacement_probe_failed', {
        error: String(error instanceof Error ? error.message : error).slice(0, 120),
      })
      return null
    }
  }
}

export type YieldHandshakeResult =
  | { kind: 'not-needed' }
  | { kind: 'taken-over'; message: string }
  | { kind: 'still-held' | 'refused' | 'unreachable'; message: string }

export interface YieldHandshakeOptions {
  lockPath: string
  origin: DaemonLockInfo['origin']
  sendYield: () => Promise<Response>
  pollIntervalMs?: number
  takeoverTimeoutMs?: number
  logEventFn?: (name: string, metadata?: Record<string, unknown>) => void
}

function readLiveLock(lockPath: string): DaemonLockInfo | null {
  const held = readDaemonLock(lockPath)
  return held && isProcessAlive(held.pid) ? held : null
}

function needsYieldHandshake(held: DaemonLockInfo | null, origin: DaemonLockInfo['origin']): boolean {
  return held !== null && held.origin === 'transient' && origin !== 'transient'
}

async function waitForLockRelease(lockPath: string, pollMs: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await delay(pollMs)
    if (readLiveLock(lockPath) === null) return true
  }
  return readLiveLock(lockPath) === null
}

/**
 * `chunk-92tvramn.js` `xt` — lado que PIDE el relevo: un daemon no
 * transitorio que encuentra el lock en manos de uno transitorio le manda
 * `yield` y sondea hasta que el lock se libera, antes de adquirirlo. El
 * resultado describe el relevo; quien llama sigue con la adquisición, que
 * rehúsa con su propio mensaje si el lock sigue tomado.
 */
export async function requestTransientYield(opts: YieldHandshakeOptions): Promise<YieldHandshakeResult> {
  const held = readLiveLock(opts.lockPath)
  if (!held || !needsYieldHandshake(held, opts.origin)) return { kind: 'not-needed' }
  const response = await opts.sendYield()
  if (!isYieldAck(response)) {
    if (response.ok) {
      return { kind: 'refused', message: 'existing daemon refused to yield (it reports origin!=transient)' }
    }
    return {
      kind: 'unreachable',
      message: `existing daemon unreachable on control socket (${response.error}); not taking over`,
    }
  }
  const released = await waitForLockRelease(
    opts.lockPath,
    opts.pollIntervalMs ?? YIELD_POLL_MS,
    opts.takeoverTimeoutMs ?? YIELD_TAKEOVER_TIMEOUT_MS,
  )
  ;(opts.logEventFn ?? logEvent)('tengu_daemon_yield_takeover', {
    ok: String(released),
    new_origin: opts.origin,
  })
  if (released) {
    return { kind: 'taken-over', message: `transient daemon (pid=${held.pid}) yielded to origin=${opts.origin}` }
  }
  return { kind: 'still-held', message: 'yield acked but lock still held after the takeover window — refusing to start' }
}
