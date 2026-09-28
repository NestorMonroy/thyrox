/**
 * El archivo pid de la sesión en el registro de sesiones: cómo se reescribe
 * (una cadena de escrituras por anfitrión, cada una leyendo el registro y
 * mezclando el parche) y los campos que la sesión publica en él — su nombre,
 * el socket del buzón, la sesión de puente, el trabajo aparcado, su estado y
 * si nació de reserva.
 *
 * Porte de `Vt`, `eF`, `Rut`, `X5o`, `ipn`, `GNr`, `apn`, `kCe`, `rD`, `Wy`,
 * `ud` y `Ms` (`chunk-t6pwageh.js`) de 2.1.283. Si el registro es de esta
 * sesión (`ud`: `Vk()` y `kFe()`, del contexto de equipo) llega como sonda.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { DebugLogLevel } from '../debug.ts'
import { logForDebugging } from '../debug.ts'
import { errorMessage } from '../errorHelpers.ts'
import { type SessionStorageKey, type StorageResult, defaultSessionsDir, formatStorageError, sessionKey } from './inboxKeys.ts'
import { normalizeSessionName } from './sessionNameState.ts'
import { SessionRegistryState, sessionRegistryState } from './sessionRegistryState.ts'
import { sanitizeSessionName } from './sessionRename.ts'

export type PidFilePatch = Record<string, unknown>

/** La parte del contrato de storage que el archivo pid consume. */
export interface PidFileStorage {
  read(keys: SessionStorageKey[]): Promise<StorageResult<{ items: Array<{ found: boolean; value: Uint8Array }> }>>
  write(key: SessionStorageKey, text: string, options: { publishDiscipline: 'inPlace' }): Promise<StorageResult<unknown>>
}

export type PidFileDeps = {
  sessionsDir: () => string
  pid: number
  now: () => number
  log: (message: string, options?: { level: DebugLogLevel }) => void
  /** `ud`: si el registro es de esta sesión y no de un teammate ni de una sesión hija. */
  ownsRegistryRecord: () => boolean
  state: () => SessionRegistryState
}

let registryOwnershipProbe: () => boolean = () => true

/**
 * Registra la sonda de `ud`. El contexto de equipo y la marca de sesión hija
 * viven en `@thyrox/swarm`, que depende de este paquete; el cableado la
 * instala al arrancar. Sin ella no hay contexto de equipo ni sesión hija.
 */
export function setRegistryOwnershipProbe(probe: () => boolean): void {
  registryOwnershipProbe = probe
}

export const processPidFileDeps: PidFileDeps = {
  sessionsDir: defaultSessionsDir,
  get pid() {
    return process.pid
  },
  now: () => Date.now(),
  log: (message, options) => logForDebugging(message, options),
  ownsRegistryRecord: () => registryOwnershipProbe(),
  state: () => sessionRegistryState(),
}

/** `Ms`: la clave del archivo pid de esta sesión en el storage. */
export function pidFileKey(pid: number): SessionStorageKey {
  return sessionKey(`${pid}.json`)
}

/** `ud`. */
export function ownsRegistryRecord(deps: PidFileDeps = processPidFileDeps): boolean {
  return deps.ownsRegistryRecord()
}

/** `Vt`: mezcla el parche sobre el registro, detrás de las escrituras anteriores. */
export function updatePidFile(patch: PidFilePatch, storage?: PidFileStorage, deps: PidFileDeps = processPidFileDeps): Promise<boolean> {
  const path = join(deps.sessionsDir(), `${deps.pid}.json`)
  const state = deps.state()
  const fail = (reason: string): false => {
    deps.log(`[concurrentSessions] updatePidFile failed: ${reason}`)
    return false
  }
  const write = state.pidFileWriteChain.then(async (): Promise<boolean> => {
    try {
      if (storage) {
        const key = pidFileKey(deps.pid)
        const read = await storage.read([key])
        if (!read.ok) return fail(formatStorageError(read.error))
        const item = read.value.items[0]
        if (!item?.found) return fail('pid file not found')
        const record = JSON.parse(Buffer.from(item.value).toString('utf8'))
        const written = await storage.write(key, JSON.stringify({ ...record, ...patch }), { publishDiscipline: 'inPlace' })
        if (!written.ok) return fail(formatStorageError(written.error))
        return true
      }
      const record = JSON.parse(await readFile(path, 'utf8'))
      await writeFile(path, JSON.stringify({ ...record, ...patch }))
      return true
    } catch (error) {
      return fail(errorMessage(error))
    }
  })
  state.setPidFileWriteChain(write.then(() => undefined))
  return write
}

/** `eF`: registra el nombre y lo publica; si el registro no se actualiza, lo avisa. */
export async function setSessionName(
  name: string,
  storage?: PidFileStorage,
  source = 'user',
  givenAtLaunch?: boolean,
  deps: PidFileDeps = processPidFileDeps,
): Promise<boolean> {
  if (!name) return false
  const state = deps.state()
  state.setRegisteredName(name, source, givenAtLaunch)
  const published =
    (await updatePidFile(
      {
        name,
        nameSource: source,
        formerNames: state.formerNames.length > 0 ? state.formerNames : undefined,
        nameSince: state.registeredName?.since ?? deps.now(),
        updatedAt: deps.now(),
      },
      storage,
      deps,
    )) || !ownsRegistryRecord(deps)
  if (!published) {
    deps.log(
      `[session-name] "${name}" applied locally but the session registry record was not updated — other sessions may keep showing the old name (see "updatePidFile failed" above)`,
      { level: 'warn' },
    )
  }
  return published
}

/** `Cut` sobre un estado dado. */
function registrationSettled(state: SessionRegistryState): Promise<boolean> {
  return state.registration ?? Promise.resolve(state.registered)
}

/**
 * `Rut`: el nombre automático sustituye a uno derivado, o a otro automático
 * distinto; si el registro no lo publicó y nadie cambió el nombre entretanto,
 * se vuelve al anterior.
 */
export async function applyAutoSessionName(name: string, storage?: PidFileStorage, deps: PidFileDeps = processPidFileDeps): Promise<boolean> {
  const sanitized = sanitizeSessionName(name)
  const state = deps.state()
  await registrationSettled(state)
  const previous = state.registeredName
  const replaceable =
    previous !== undefined && (previous.source === 'derived' || (previous.source === 'auto' && normalizeSessionName(previous.name) !== normalizeSessionName(sanitized)))
  if (!sanitized || previous === undefined || !replaceable) return false
  const applied = await setSessionName(sanitized, storage, 'auto', undefined, deps)
  const current = state.registeredName
  if (!applied && current?.name === sanitized && current.source === 'auto') {
    const previousNormalized = normalizeSessionName(previous.name)
    state.registeredName = previous
    state.heldNames.delete(previousNormalized)
    state.formerNames = state.formerNames.filter(former => normalizeSessionName(former.name) !== previousNormalized)
    state.registeredNameChanged.emit()
  }
  return applied
}

/** `X5o`. */
export async function publishMessagingSocketPath(socketPath: string, storage?: PidFileStorage, deps: PidFileDeps = processPidFileDeps): Promise<void> {
  await updatePidFile({ messagingSocketPath: socketPath, updatedAt: deps.now() }, storage, deps)
}

/** `ipn`. */
export async function recordBridgeSessionId(bridgeSessionId: string, storage?: PidFileStorage, deps: PidFileDeps = processPidFileDeps): Promise<void> {
  await updatePidFile({ bridgeSessionId }, storage, deps)
}

/** `GNr`. */
export async function recordParkedJob(jobId: string, storage?: PidFileStorage, deps: PidFileDeps = processPidFileDeps): Promise<void> {
  await updatePidFile({ parkedJobId: jobId, updatedAt: deps.now() }, storage, deps)
}

/** `apn`. */
export async function clearParkedJob(storage?: PidFileStorage, deps: PidFileDeps = processPidFileDeps): Promise<void> {
  await updatePidFile({ parkedJobId: undefined, updatedAt: deps.now() }, storage, deps)
}

/** `Wy`. */
export function stopSpareClaimPoll(state: SessionRegistryState): void {
  if (state.spareClaimPoll !== undefined) {
    clearInterval(state.spareClaimPoll)
    state.spareClaimPoll = undefined
  }
}

/**
 * `kCe`: publica el estado con su hora; una sesión nacida de reserva que pasa
 * a ocupada deja de ser reserva y detiene su sondeo de reclamo.
 */
export async function updateSessionStatus(patch: PidFilePatch & { status?: string }, storage?: PidFileStorage, deps: PidFileDeps = processPidFileDeps): Promise<boolean> {
  const now = deps.now()
  const state = deps.state()
  const leavesSpare = state.bornSpare && patch.status === 'busy'
  const published = await updatePidFile(
    { ...patch, updatedAt: now, ...(patch.status !== undefined && { statusUpdatedAt: now }), ...(leavesSpare && { spare: undefined }) },
    storage,
    deps,
  )
  if (leavesSpare && published) stopSpareClaimPoll(state)
  return published || !ownsRegistryRecord(deps)
}

/** `rD`: retira la marca de reserva de una sesión que nació de reserva. */
export async function releaseSpare(storage?: PidFileStorage, deps: PidFileDeps = processPidFileDeps): Promise<boolean> {
  if (!deps.state().bornSpare) return true
  return updatePidFile({ spare: undefined, updatedAt: deps.now() }, storage, deps)
}
