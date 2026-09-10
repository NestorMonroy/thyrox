/**
 * Temporizadores de guardia del bg-daemon: salida por inactividad + upgrade
 * del binario. Extraídos de bgDaemon.ts para que el archivo de entrada
 * quede bajo el presupuesto de 800 LOC. `ant 5170.js` iFK:172-244 — corren
 * durante toda la vida del daemon y abortan el AbortController cuando su
 * condición dispara.
 *
 * Puerto fiel de `ccnmt: packages/daemon/src/bgDaemonTimers.ts`.
 */

import { statSync } from 'node:fs'

import { logEvent } from './internal/pendingCrossPackageDeps.js'

import type { WorkerVm } from './workerVm.js'

/**
 * idleActivityCount cuenta todo lo que ancla al supervisor — leases
 * (conexiones de cliente activas), workers vivos, y workers desatendidos
 * (siguen corriendo pero ya no supervisados). Cero significa que el daemon
 * está inactivo y un origen transitorio puede auto-apagarse.
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
 * Arma la guardia de salida por inactividad. Devuelve un callback `probe`
 * que el llamador debe disparar cada ~2s + una función `dispose` para
 * desmontar. Cuando el conteo de actividad es 0 durante `graceMs`, emite
 * tengu_daemon_idle_exit y aborta el controller (apagado ordenado).
 *
 * Los orígenes service/shell anclan al supervisor — nunca salen por
 * inactividad.
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
 * Arma la guardia de upgrade del binario. Observa argv[1] (el binario ccb)
 * por cambio de mtime; al detectarlo, emite
 * tengu_daemon_self_restart_on_upgrade y aborta el controller para que el
 * wrapper / launchAgent reinicie al supervisor bajo el binario nuevo. Los
 * workers bg se re-adoptan desde el roster al siguiente arranque del
 * supervisor.
 *
 * Devuelve el mtime inicial + función dispose. Si argv[1] no se puede leer
 * (pasa en algunas rutas de bundle compilado), devuelve initialMtime=null y
 * el probe es un no-op.
 */
export function setupUpgradeWatchdog(
  abort: AbortController,
): { dispose: () => void } {
  const binaryPath = process.argv[1] ?? process.execPath
  let initialMtime: number | null = null
  try {
    initialMtime = statSync(binaryPath).mtimeMs
  } catch {
    return { dispose: () => {} }
  }
  const timer = setInterval(() => {
    if (initialMtime === null) return
    if (abort.signal.aborted) return
    try {
      const current = statSync(binaryPath).mtimeMs
      if (current !== initialMtime) {
        logEvent('tengu_daemon_self_restart_on_upgrade', {
          old_mtime: String(initialMtime),
          new_mtime: String(current),
        })
        abort.abort()
      }
    } catch {
      // best-effort
    }
  }, 30_000)
  timer.unref()
  return {
    dispose() {
      clearInterval(timer)
    },
  }
}

/**
 * Tipo del mapa de workers para makeIdleActivityCount — exportado para que
 * los llamadores puedan angostar el tipo sin traer WorkerVm a
 * bgDaemonTimers.
 */
export type WorkerMaps = {
  workers: Map<string, WorkerVm>
  detached: Map<string, WorkerVm>
  leases: Set<unknown>
}
