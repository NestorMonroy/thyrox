/**
 * Bg-daemon idle-exit + binary-upgrade watchdog timers. Extracted from
 * bgDaemon.ts so the entry file stays under the 800-LOC budget. ant
 * 5170.js iFK:172-244 — these run for the lifetime of the daemon and
 * abort the AbortController when their condition fires.
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

/**
 * idleActivityCount counts everything that pins the supervisor —
 * leases (active client connections), live workers, and detached
 * workers (still running but no longer supervised). Zero means the
 * daemon is idle and a transient origin can self-shutdown.
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
  graceMs: number
  countActivity: () => number
}

/**
 * Set up the idle-exit watchdog. Returns a probe-tick callback caller
 * should fire every ~2s + a clear function to teardown. When the
 * activity count is 0 for `graceMs`, emits tengu_daemon_idle_exit and
 * aborts the controller (graceful shutdown).
 *
 * Service/shell origins pin the supervisor — they never idle-exit.
 */
export function setupIdleExitWatchdog(opts: IdleExitOptions): {
  probe: () => void
  dispose: () => void
} {
  let idleExitTimer: NodeJS.Timeout | null = null
  const probe = (): void => {
    if (opts.origin !== 'transient') return
    if (opts.abort.signal.aborted) return
    if (opts.countActivity() > 0) {
      if (idleExitTimer) {
        clearTimeout(idleExitTimer)
        idleExitTimer = null
      }
      return
    }
    if (idleExitTimer) return
    idleExitTimer = setTimeout(() => {
      idleExitTimer = null
      if (opts.abort.signal.aborted) return
      if (opts.countActivity() > 0) return
      logEvent('tengu_daemon_idle_exit', {
        grace_ms: String(opts.graceMs),
        cfg_workers: '0',
      })
      opts.abort.abort()
    }, opts.graceMs)
    idleExitTimer.unref()
  }
  return {
    probe,
    dispose() {
      if (idleExitTimer) {
        clearTimeout(idleExitTimer)
        idleExitTimer = null
      }
    },
  }
}

/**
 * Set up the binary-upgrade watchdog. Resuelve argv[1] (el binario ccb)
 * con `It` (`resolveBinaryStat`, sigue symlinks) y compara sucesivas
 * lecturas con `Fr` (`hasBinaryChanged`) — target distinto siempre
 * cuenta, mtime distinto cuenta salvo en un build administrado por
 * versión (`Kat`/`isManagedVersionedBuild`). Al detectar cambio, emite
 * tengu_daemon_self_restart_on_upgrade y aborta el controller para que
 * el wrapper / launchAgent reinicie el supervisor bajo el binario
 * nuevo. Los bg workers se re-adoptan desde el roster en el arranque
 * del siguiente supervisor.
 *
 * Si argv[1] es ilegible (ENOENT — pasa en algunas rutas de build
 * compilado), `resolveBinaryStat` da `null` y el sondeo periódico ni se
 * arma.
 *
 * pendiente: la máquina de estados de `xt` alrededor de `Fr`/`It` en la
 * referencia —defer mientras el daemon está ocupado
 * (`upgradeBusyDeferCapMs`), rechazo de upgrade obsoleto
 * (`tengu_daemon_refuse_stale_upgrade`)— no se porta aquí; este sondeo
 * dispara en cuanto detecta el cambio, sin ese margen.
 */
export interface UpgradeWatchdogOptions {
  /** Cadencia del sondeo; 30_000ms en la referencia. */
  intervalMs?: number
  binaryPath?: string
  /** Punto de inyección para pruebas — por defecto `It` (./upgradeProbe.ts). */
  resolveBinaryStat?: (path: string) => Promise<BinaryStat | null>
  /** Punto de inyección para pruebas — por defecto `Fr` (./upgradeProbe.ts). */
  hasBinaryChanged?: (previous: BinaryStat, current: BinaryStat) => boolean
}

export function setupUpgradeWatchdog(
  abort: AbortController,
  opts: UpgradeWatchdogOptions = {},
): { dispose: () => void } {
  const binaryPath = opts.binaryPath ?? process.argv[1] ?? process.execPath
  const resolveStat = opts.resolveBinaryStat ?? resolveBinaryStatDefault
  const changed = opts.hasBinaryChanged ?? hasBinaryChangedDefault
  let initialStat: BinaryStat | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let disposed = false

  // `It` — el primer stat es asíncrono (sigue symlinks vía
  // fs/promises.realpath); si el binario es ilegible (ENOENT), el
  // sondeo periódico ni se arma, igual que la referencia deja
  // `initialMtime=null` y el probe queda como no-op.
  void resolveStat(binaryPath).then(stat => {
    if (disposed || stat === null) return
    initialStat = stat
    timer = setInterval(() => {
      if (abort.signal.aborted) return
      void resolveStat(binaryPath)
        .then(current => {
          if (current === null || initialStat === null) return
          if (changed(initialStat, current)) {
            logEvent('tengu_daemon_self_restart_on_upgrade', {
              old_mtime: String(initialStat.mtimeMs),
              new_mtime: String(current.mtimeMs),
            })
            abort.abort()
          }
        })
        .catch(() => {
          // best-effort — un error transitorio de stat no debe tumbar el watchdog
        })
    }, opts.intervalMs ?? 30_000)
    timer.unref()
  })

  return {
    dispose() {
      disposed = true
      if (timer) clearInterval(timer)
    },
  }
}

/**
 * Worker map type for makeIdleActivityCount — exported so callers can
 * type-narrow without pulling WorkerVm into bgDaemonTimers.
 */
export type WorkerMaps = {
  workers: Map<string, WorkerVm>
  detached: Map<string, WorkerVm>
  leases: Set<unknown>
}
