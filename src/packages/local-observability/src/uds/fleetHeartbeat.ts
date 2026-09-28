/**
 * El latido del tablero de sesiones: mientras el tablero está abierto toca un
 * archivo del registro, y cada sesión mira su edad para saber si alguien la
 * observa. La respuesta se guarda un segundo en el estado del registro.
 *
 * Porte de `ld`, `jNr`, `WNr`, `$y`, `VNt` y `qNt`, con `Ds`, `tD` y `Gy`
 * (`chunk-t6pwageh.js`), y de `fBe` (`chunk-nwpc1c89.js`) de 2.1.283.
 */
import { statSync } from 'node:fs'
import { unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { errorMessage, isENOENT } from '../errorHelpers.ts'
import { type SessionStorageKey, type StorageError, type StorageResult, formatStorageError, sessionKey } from './inboxKeys.ts'
import type { PidFileDeps } from './pidFileRecord.ts'
import { processPidFileDeps } from './pidFileRecord.ts'
import type { SessionRegistryState } from './sessionRegistryState.ts'

/** `Ds`. */
export const HEARTBEAT_FILE = '.fleetview-heartbeat'
/** `tD`: cuánto vale la respuesta guardada. */
export const WATCHED_CACHE_MS = 1000
/** `Gy`: un latido más viejo que esto es un tablero cerrado. */
export const HEARTBEAT_FRESH_MS = 5000
/** `hzr`. */
const ABSENT_PARENT = 'AbsentParent'

export interface HeartbeatStorage {
  write(key: SessionStorageKey, text: string, options: { publishDiscipline: 'inPlace' }): Promise<StorageResult<unknown>>
  delete(key: SessionStorageKey): Promise<unknown>
  statMeta(key: SessionStorageKey): Promise<StorageResult<{ mtimeMs: number }>>
}

export type HeartbeatDeps = Pick<PidFileDeps, 'sessionsDir' | 'now' | 'log' | 'state'>

const heartbeatPath = (deps: HeartbeatDeps) => join(deps.sessionsDir(), HEARTBEAT_FILE)

/** `ld`. */
export function heartbeatKey(): SessionStorageKey {
  return sessionKey(HEARTBEAT_FILE)
}

/** `fBe`: el storage no pudo escribir porque falta el ámbito padre. */
export function isAbsentParentError(error: StorageError): boolean {
  return error.code === 'Failed' && 'telemetryCode' in error && error.telemetryCode === ABSENT_PARENT
}

/** `jNr`: el tablero anota que sigue abierto. */
export async function touchHeartbeat(storage?: HeartbeatStorage, deps: HeartbeatDeps = processPidFileDeps): Promise<void> {
  if (storage) {
    try {
      const written = await storage.write(heartbeatKey(), String(deps.now()), { publishDiscipline: 'inPlace' })
      if (!written.ok && !isAbsentParentError(written.error)) deps.log(`[concurrentSessions] heartbeat touch failed: ${formatStorageError(written.error)}`)
    } catch (error) {
      deps.log(`[concurrentSessions] heartbeat touch failed: ${errorMessage(error)}`)
    }
    return
  }
  try {
    await writeFile(heartbeatPath(deps), String(deps.now()))
  } catch {
    // El directorio del registro aún no existe: no hay a quién avisar.
  }
}

/** `WNr`: el tablero se cierra. */
export async function removeHeartbeat(storage?: HeartbeatStorage, deps: HeartbeatDeps = processPidFileDeps): Promise<void> {
  if (storage) {
    try {
      await storage.delete(heartbeatKey())
    } catch {
      // Borrado de mejor esfuerzo: el latido caduca solo.
    }
    return
  }
  try {
    await unlink(heartbeatPath(deps))
  } catch {
    // Idem.
  }
}

/** `$y`: la respuesta guardada, si tiene menos de `WATCHED_CACHE_MS`. */
export function cachedWatched(state: SessionRegistryState, now: number): boolean | undefined {
  const { watchedCache } = state
  return watchedCache && now - watchedCache.at < WATCHED_CACHE_MS ? watchedCache.value : undefined
}

/** `VNt`: si el tablero mira, según la edad del latido en disco. */
export function isWatchedFromFile(deps: HeartbeatDeps = processPidFileDeps): boolean {
  const state = deps.state()
  const now = deps.now()
  const cached = cachedWatched(state, now)
  if (cached !== undefined) return cached
  let watched = false
  try {
    const { mtimeMs } = statSync(heartbeatPath(deps))
    watched = now - mtimeMs < HEARTBEAT_FRESH_MS
  } catch (error) {
    if (!isENOENT(error)) deps.log(`[concurrentSessions] heartbeat stat failed: ${errorMessage(error)}`)
  }
  state.setWatchedCache({ at: now, value: watched })
  return watched
}

/**
 * `qNt`: lo mismo sobre el storage. La edad se mide con la hora de después de
 * preguntar, y la respuesta no pisa una guardada después de empezar.
 */
export async function isWatchedFromStorage(storage: HeartbeatStorage, deps: HeartbeatDeps = processPidFileDeps): Promise<boolean> {
  const state = deps.state()
  const started = deps.now()
  const cached = cachedWatched(state, started)
  if (cached !== undefined) return cached
  let mtimeMs: number | undefined
  try {
    const meta = await storage.statMeta(heartbeatKey())
    if (meta.ok) mtimeMs = meta.value.mtimeMs
    else if (meta.error.code !== 'NotFound') deps.log(`[concurrentSessions] heartbeat stat failed: ${formatStorageError(meta.error)}`)
  } catch (error) {
    deps.log(`[concurrentSessions] heartbeat stat failed: ${errorMessage(error)}`)
  }
  const finished = deps.now()
  const watched = mtimeMs !== undefined && finished - mtimeMs < HEARTBEAT_FRESH_MS
  const current = state.watchedCache
  if (!current || current.at < started) state.setWatchedCache({ at: finished, value: watched })
  return watched
}
