/**
 * La sesión de reserva: una sesión de fondo que nace antes de tener trabajo
 * se anuncia como reserva, y deja de serlo cuando su trabajo la reclama
 * escribiendo el `state.json` del directorio de trabajo. Un sondeo de un
 * segundo lo comprueba y, al verlo, retira la marca del registro.
 *
 * Porte de `jy`, `iD`, `sD` y `oD` (`chunk-t6pwageh.js`) de 2.1.283.
 */
import { lstat } from 'node:fs/promises'
import { join } from 'node:path'

import { isENOENT } from '../errorHelpers.ts'
import type { HeartbeatStorage } from './fleetHeartbeat.ts'
import { type PidFileDeps, type PidFileStorage, processPidFileDeps, releaseSpare, stopSpareClaimPoll } from './pidFileRecord.ts'
import type { SessionRegistryState } from './sessionRegistryState.ts'
import { type SessionKindHost, currentJobDir, jobStorageKey, processSessionKindHost } from './sessionKind.ts'
import { storageBackendPin } from './storageBackendPin.ts'

/** `oD`. */
export const SPARE_CLAIM_POLL_MS = 1000
/** El archivo que el trabajo escribe al reclamar la sesión. */
const CLAIM_FILE = 'state.json'

export type SpareStorage = PidFileStorage & Pick<HeartbeatStorage, 'statMeta'>

export type SpareDeps = PidFileDeps & {
  kindHost: () => SessionKindHost
  /** `N()`. */
  storageBackendActive: () => boolean
  scheduleEvery: (callback: () => void, ms: number) => { handle: ReturnType<typeof setInterval>; unref: () => void }
}

export const processSpareDeps: SpareDeps = {
  ...processPidFileDeps,
  get pid() {
    return process.pid
  },
  kindHost: () => processSessionKindHost,
  storageBackendActive: () => storageBackendPin.isActive(),
  scheduleEvery: (callback, ms) => {
    const handle = setInterval(callback, ms)
    return { handle, unref: () => void handle.unref() }
  },
}

/** `jy`: si el trabajo ya escribió su `state.json`; un error que no es ausencia cuenta como sí. */
export async function isSpareClaimed(storage?: SpareStorage, deps: SpareDeps = processSpareDeps): Promise<boolean> {
  const jobDir = currentJobDir(deps.kindHost())
  if (!jobDir) return false
  if (deps.storageBackendActive() && storage !== undefined) {
    const key = jobStorageKey(jobDir, [CLAIM_FILE], deps.kindHost())
    if (key !== undefined) {
      try {
        const meta = await storage.statMeta(key)
        return meta.ok || (meta.error.code !== 'NotFound' && meta.error.code !== 'Unavailable')
      } catch {
        return false
      }
    }
  }
  try {
    await lstat(join(jobDir, CLAIM_FILE))
    return true
  } catch (error) {
    return !isENOENT(error)
  }
}

export type SpareClaimContext = { registry: SessionRegistryState; storage: SpareStorage | undefined; clearing: boolean; deps: SpareDeps }

/** `sD`: una vuelta del sondeo; no se solapa con la anterior. */
export function pollSpareClaim(context: SpareClaimContext): Promise<void> {
  if (context.clearing || context.registry.spareClaimPoll === undefined) return Promise.resolve()
  context.clearing = true
  return isSpareClaimed(context.storage, context.deps)
    .then(claimed => (claimed ? releaseSpare(context.storage, context.deps) : false))
    .then(released => {
      if (released) stopSpareClaimPoll(context.registry)
    })
    .finally(() => {
      context.clearing = false
    })
}

/** `iD`: empieza a sondear el reclamo, sin retener el proceso. */
export function startSpareClaimPoll(storage?: SpareStorage, deps: SpareDeps = processSpareDeps): void {
  const registry = deps.state()
  const context: SpareClaimContext = { registry, storage, clearing: false, deps }
  const timer = deps.scheduleEvery(() => void pollSpareClaim(context), SPARE_CLAIM_POLL_MS)
  registry.spareClaimPoll = timer.handle
  timer.unref()
}
