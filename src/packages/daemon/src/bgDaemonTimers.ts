/**
 * Temporizadores del ciclo de vida del bg-daemon: salida por inactividad,
 * auto-reinicio al actualizar el binario (con diferimiento por workers
 * ocupados) y sondeo de desplazamiento. Viven fuera de `bgDaemon.ts` para
 * que el punto de entrada no crezca; todos terminan abortando el
 * `AbortController` del daemon cuando su condición se cumple.
 *
 * Puerto de `chunk-92tvramn.js` `xt` (referencia 2.1.283): los umbrales
 * `Lr`/`Mt`/`Nr`/`Vr`, el temporizador de inactividad `q`, la máquina de
 * diferimiento `V` dentro de `Be` y el sondeo `L` del intervalo `ge`.
 *
 * Divergencias declaradas:
 * - Los gates `tengu_daemon_upgrade_defer_busy` y
 *   `tengu_daemon_refuse_stale_upgrade` (feature flags, por defecto
 *   activos) no existen aquí: el diferimiento siempre está activo y el
 *   rechazo de un binario más viejo no se porta.
 * - La referencia difiere mientras `busyWorkerCount()` de los workers del
 *   registro reporta un turno a mitad; aquí el llamador inyecta el conteo.
 *
 * @dynamicRequire
 */

import { logEvent } from '@thyrox/local-observability'

import {
  type BinaryStat,
  hasBinaryChanged as hasBinaryChangedDefault,
  resolveBinaryStat as resolveBinaryStatDefault,
} from './upgradeProbe.js'
import type { WorkerVm } from './workerVm.js'

type LogEventFn = (name: string, metadata?: Record<string, unknown>) => void

/**
 * `chunk-m5drh1xg.js` `QF` — presupuesto con que la CLI espera a que un
 * daemon recién lanzado conteste `ping`. La gracia de arranque lo cubre.
 */
const SPAWN_READY_BUDGET_MS = 45_000
/** `chunk-92tvramn.js` `Mt` — gracia de inactividad tras haber tenido clientes. */
const IDLE_GRACE_MS = 5_000
/** `xt` — cadencia por defecto del sondeo de upgrade, si no se configura. */
const UPGRADE_POLL_INTERVAL_MS = 30_000

/** Umbrales de arranque del daemon; cada uno se configura por separado. */
export interface DaemonStartupThresholds {
  /** `Lr` — cadencia del sondeo de desplazamiento y de binario. */
  staleCheckIntervalMs: number
  /** `Mt` — gracia de inactividad una vez que hubo un cliente. */
  idleGraceMs: number
  /** `Nr` — tope del diferimiento de upgrade por workers ocupados. */
  upgradeBusyDeferCapMs: number
  /** `Vr` — gracia de inactividad mientras nunca hubo cliente (`QF + Mt`). */
  startupIdleGraceMs: number
}

export const DEFAULT_STARTUP_THRESHOLDS: Readonly<DaemonStartupThresholds> = Object.freeze({
  staleCheckIntervalMs: 60_000,
  idleGraceMs: IDLE_GRACE_MS,
  upgradeBusyDeferCapMs: 1_800_000,
  startupIdleGraceMs: SPAWN_READY_BUDGET_MS + IDLE_GRACE_MS,
})

/** Los umbrales por defecto con los que el llamador declare, como los parámetros de `xt`. */
export function resolveStartupThresholds(
  overrides: Partial<DaemonStartupThresholds> = {},
): DaemonStartupThresholds {
  return { ...DEFAULT_STARTUP_THRESHOLDS, ...overrides }
}

/**
 * Cuenta todo lo que retiene al supervisor: leases (clientes conectados),
 * workers vivos y workers desatendidos. Cero significa inactivo, y un
 * daemon transitorio puede apagarse solo.
 */
export function makeIdleActivityCount(state: {
  leases: { readonly size: number }
  workers: { readonly size: number }
  detached: { readonly size: number }
}): () => number {
  return () => state.leases.size + state.workers.size + state.detached.size
}

export interface IdleExitOptions {
  origin: string
  abort: AbortController
  /** `Mt` — gracia una vez que hubo actividad. */
  idleGraceMs: number
  /** `Vr` — gracia mientras nunca hubo actividad. */
  startupIdleGraceMs: number
  countActivity: () => number
  /** Un upgrade diferido rearma la espera en vez de salir (`xt`: `if(V!==null){q();return}`). */
  isUpgradePending?: () => boolean
  logEventFn?: LogEventFn
}

/**
 * Temporizador de salida por inactividad (`xt` `q`). `probe` se llama en
 * cada tick; con actividad 0 durante la gracia vigente emite
 * `tengu_daemon_idle_exit` y aborta. La gracia es la de arranque hasta
 * que se ve la primera actividad, y la corta desde entonces. Un origen de
 * servicio o shell retiene al supervisor y nunca sale por inactividad.
 */
export function setupIdleExitWatchdog(opts: IdleExitOptions): {
  probe: () => void
  dispose: () => void
} {
  const emit = opts.logEventFn ?? logEvent
  let idleExitTimer: NodeJS.Timeout | null = null
  let everHadActivity = false
  const clearIdleTimer = (): void => {
    if (idleExitTimer) clearTimeout(idleExitTimer)
    idleExitTimer = null
  }
  const onGraceElapsed = (graceMs: number): void => {
    idleExitTimer = null
    if (opts.countActivity() > 0) {
      everHadActivity = true
      return
    }
    if (opts.abort.signal.aborted) return
    if (opts.isUpgradePending?.()) {
      probe()
      return
    }
    emit('tengu_daemon_idle_exit', {
      grace_ms: String(graceMs),
      never_had_client: String(!everHadActivity),
      cfg_workers: '0',
    })
    opts.abort.abort()
  }
  const probe = (): void => {
    if (opts.origin !== 'transient') return
    if (opts.abort.signal.aborted) return
    if (opts.countActivity() > 0) {
      everHadActivity = true
      clearIdleTimer()
      return
    }
    if (idleExitTimer) return
    const graceMs = everHadActivity ? opts.idleGraceMs : opts.startupIdleGraceMs
    idleExitTimer = setTimeout(() => onGraceElapsed(graceMs), graceMs)
    idleExitTimer.unref()
  }
  return { probe, dispose: clearIdleTimer }
}

export type UpgradeDeferralDecision = 'defer' | 'proceed'

interface DeferralState {
  target: string
  start: number
  logged: boolean
  suspendedAt: number | null
  capExpiredEmitted: boolean
}

/**
 * Máquina de diferimiento de upgrade por workers ocupados (`xt`, la
 * variable `V` dentro de `Be`). Difiere mientras haya workers ocupados y
 * no se haya alcanzado el tope `Nr`; el reloj se suspende mientras el
 * binario no se puede leer. Cada transición emite
 * `tengu_daemon_upgrade_deferred_busy` con su fase.
 */
export class UpgradeBusyDeferral {
  private state: DeferralState | null = null
  private readonly now: () => number
  private readonly emit: LogEventFn

  constructor(
    private readonly capMs: number,
    deps: { now?: () => number; logEventFn?: LogEventFn } = {},
  ) {
    this.now = deps.now ?? Date.now
    this.emit = deps.logEventFn ?? logEvent
  }

  isPending(): boolean {
    return this.state !== null
  }

  /** El binario volvió a coincidir: no hay upgrade que diferir. */
  reset(): void {
    this.state = null
  }

  /** Decide, ante un binario cambiado hacia `target`, si reiniciar ya o esperar. */
  evaluate(target: string, busyWorkers: number): UpgradeDeferralDecision {
    this.resumeClock()
    if (busyWorkers === 0) {
      this.resolve(busyWorkers, this.now())
      return 'proceed'
    }
    const state = this.trackTarget(target)
    if (this.now() - state.start < this.capMs) {
      this.logStartOnce(state, busyWorkers)
      return 'defer'
    }
    this.emitCapExpiredOnce(state, busyWorkers)
    return 'proceed'
  }

  /** Un sondeo fallido suspende el reloj; sin workers ocupados, resuelve. */
  suspend(busyWorkers: number): void {
    const state = this.state
    if (state === null) return
    if (busyWorkers === 0) {
      this.resolve(busyWorkers, state.suspendedAt ?? this.now())
      return
    }
    if (state.suspendedAt === null) state.suspendedAt = this.now()
  }

  private resumeClock(): void {
    const state = this.state
    if (state === null || state.suspendedAt === null) return
    state.start += this.now() - state.suspendedAt
    state.suspendedAt = null
  }

  private resolve(busyWorkers: number, endedAt: number): void {
    const state = this.state
    this.state = null
    if (state === null || state.capExpiredEmitted) return
    this.emit('tengu_daemon_upgrade_deferred_busy', {
      busy_workers: String(busyWorkers),
      deferred_ms: String(endedAt - state.start),
      cap_expired: 'false',
      phase: 'resolved',
    })
  }

  private trackTarget(target: string): DeferralState {
    if (this.state === null) {
      this.state = { target, start: this.now(), logged: false, suspendedAt: null, capExpiredEmitted: false }
    } else if (this.state.target !== target) {
      this.state.target = target
      this.state.logged = false
    }
    return this.state
  }

  private logStartOnce(state: DeferralState, busyWorkers: number): void {
    if (state.logged) return
    state.logged = true
    this.emit('tengu_daemon_upgrade_deferred_busy', {
      busy_workers: String(busyWorkers),
      cap_expired: 'false',
      phase: 'start',
    })
  }

  private emitCapExpiredOnce(state: DeferralState, busyWorkers: number): void {
    if (state.capExpiredEmitted) return
    state.capExpiredEmitted = true
    this.emit('tengu_daemon_upgrade_deferred_busy', {
      busy_workers: String(busyWorkers),
      deferred_ms: String(this.now() - state.start),
      cap_expired: 'true',
      phase: 'cap_expired',
    })
  }
}

/**
 * Sondeo de upgrade del binario. Resuelve argv[1] con `It`
 * (`resolveBinaryStat`, sigue symlinks) y compara lecturas sucesivas con
 * `Fr` (`hasBinaryChanged`). Ante un cambio consulta la máquina de
 * diferimiento: con workers ocupados espera hasta el tope `Nr`; si no,
 * emite `tengu_daemon_self_restart_on_upgrade` y aborta para que el
 * wrapper reinicie el supervisor bajo el binario nuevo (los workers se
 * re-adoptan desde el roster). Un binario ilegible al arrancar deja el
 * sondeo sin armar.
 */
export interface UpgradeWatchdogOptions {
  /** Cadencia del sondeo; 30_000ms si no se declara. */
  intervalMs?: number
  binaryPath?: string
  /** Punto de inyección para pruebas — por defecto `It` (./upgradeProbe.ts). */
  resolveBinaryStat?: (path: string) => Promise<BinaryStat | null>
  /** Punto de inyección para pruebas — por defecto `Fr` (./upgradeProbe.ts). */
  hasBinaryChanged?: (previous: BinaryStat, current: BinaryStat) => boolean
  /** Workers con un turno a mitad; sin él, nunca se difiere. */
  busyWorkerCount?: () => number
  /** `Nr` — tope del diferimiento. */
  busyDeferCapMs?: number
}

export function setupUpgradeWatchdog(
  abort: AbortController,
  opts: UpgradeWatchdogOptions = {},
): { dispose: () => void; isUpgradePending: () => boolean } {
  const binaryPath = opts.binaryPath ?? process.argv[1] ?? process.execPath
  const resolveStat = opts.resolveBinaryStat ?? resolveBinaryStatDefault
  const changed = opts.hasBinaryChanged ?? hasBinaryChangedDefault
  const busyWorkers = opts.busyWorkerCount ?? (() => 0)
  const deferral = new UpgradeBusyDeferral(
    opts.busyDeferCapMs ?? DEFAULT_STARTUP_THRESHOLDS.upgradeBusyDeferCapMs,
  )
  let timer: ReturnType<typeof setInterval> | null = null
  let disposed = false

  const onPoll = (initialStat: BinaryStat, current: BinaryStat | null): void => {
    if (current === null || abort.signal.aborted) return
    if (!changed(initialStat, current)) {
      deferral.reset()
      return
    }
    if (deferral.evaluate(current.target, busyWorkers()) === 'defer') return
    logEvent('tengu_daemon_self_restart_on_upgrade', {
      old_mtime: String(initialStat.mtimeMs),
      new_mtime: String(current.mtimeMs),
    })
    abort.abort()
  }

  // `It` — el primer stat es asíncrono; con el binario ilegible el sondeo
  // no se arma, igual que la referencia deja la identidad inicial en null.
  void resolveStat(binaryPath).then(initialStat => {
    if (disposed || initialStat === null) return
    timer = setInterval(() => {
      if (abort.signal.aborted) return
      void resolveStat(binaryPath)
        .then(current => onPoll(initialStat, current))
        .catch(() => {
          // Manejo esperado: la referencia registra el fallo del stat y
          // suspende el reloj del diferimiento; el sondeo sigue vivo.
          deferral.suspend(busyWorkers())
        })
    }, opts.intervalMs ?? UPGRADE_POLL_INTERVAL_MS)
    timer.unref()
  })

  return {
    dispose() {
      disposed = true
      if (timer) clearInterval(timer)
    },
    isUpgradePending: () => deferral.isPending(),
  }
}

export interface DisplacementWatchdogOptions {
  origin: string
  abort: AbortController
  /** `Lr` — cadencia del sondeo. */
  intervalMs: number
  /** Pid del daemon que sostiene el lock en nuestro lugar, o `null`. */
  probeDisplacement: () => Promise<number | null>
  logEventFn?: LogEventFn
}

/**
 * Sondeo de desplazamiento (`xt`, intervalo `ge` con `L`): un daemon
 * transitorio cuyo lock pasó a otro pid se hace a un lado, emite
 * `tengu_daemon_yield` con `displaced` y aborta. `wasDisplaced` le dice
 * al cierre que el lock y el socket ya son del sucesor.
 */
export function setupDisplacementWatchdog(opts: DisplacementWatchdogOptions): {
  dispose: () => void
  wasDisplaced: () => boolean
} {
  const emit = opts.logEventFn ?? logEvent
  let displaced = false
  if (opts.origin !== 'transient') return { dispose() {}, wasDisplaced: () => false }
  const onProbe = (holderPid: number | null): void => {
    if (holderPid === null || displaced || opts.abort.signal.aborted) return
    displaced = true
    emit('tengu_daemon_yield', { displaced: 'true', displaced_by_pid: String(holderPid) })
    opts.abort.abort()
  }
  const timer = setInterval(() => {
    if (displaced || opts.abort.signal.aborted) return
    // probeDisplacement ya registra su propio fallo de lectura; un
    // rechazo inesperado se descarta para no tumbar el intervalo.
    void opts.probeDisplacement().then(onProbe, () => {})
  }, opts.intervalMs)
  timer.unref()
  return {
    dispose: () => clearInterval(timer),
    wasDisplaced: () => displaced,
  }
}

/**
 * Tipo de los mapas de workers para `makeIdleActivityCount`; exportado
 * para que el llamador lo estreche sin arrastrar `WorkerVm` hasta aquí.
 */
export type WorkerMaps = {
  workers: Map<string, WorkerVm>
  detached: Map<string, WorkerVm>
  leases: Set<unknown>
}
