/**
 * Listado y barrido del registro de sesiones: cada sesión deja `<pid>.json`
 * y sus claves `<pid>.<sha256>.key` en el directorio de sesiones; cuando su
 * pid muere, la siguiente sesión que barre los retira y, si la muerta era
 * interactiva, avisa de que salió sin cerrar.
 *
 * Porte de `Ny`, `Fy`, `zy`, `TCe`, `aD`, `ZKn`, `Ly`, `lpn`, `xut` e `id`
 * (`chunk-t6pwageh.js`) de 2.1.283. Un pid sólo se compara con los de su
 * dominio (`pidDomain`): un registro de otra máquina o de otro espacio de
 * pids no se toca aunque su pid no exista aquí.
 */
import { readdir, unlink } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, sep } from 'node:path'

import { getIsInteractive } from '@thyrox/app-host/bootstrap/state.js'
import { isEmbeddedEntrypoint } from '@thyrox/config/entrypoint'
import { getPlatform } from '@thyrox/config/platform'

import { logEvent } from '../core.ts'
import type { EventMetadata } from '../contracts.ts'
import type { DebugLogLevel } from '../debug.ts'
import { logForDebugging } from '../debug.ts'
import { errorMessage } from '../errorHelpers.ts'
import { INBOX_KEY_FILE } from './inboxAuth.ts'
import {
  type SessionKeyStorage,
  type SessionStorageKey,
  type StorageResult,
  defaultSessionsDir,
  listSessionKeyNames,
  readBoundedFile,
  readKeyPidDomain,
  sessionKey,
} from './inboxKeys.ts'
import { currentPidDomain, isProcessGone } from './processIdentity.ts'
import { SessionRegistryState, sessionRegistryState } from './sessionRegistryState.ts'
import { storageBackendPin } from './storageBackendPin.ts'

/** `bYe`: un registro legítimo cabe holgadamente en 256 KiB. */
export const REGISTRY_RECORD_MAX_BYTES = 262144
/** `sfn`: un registro ilegible puede estar a medio escribir; se relee una vez tras este plazo. */
const UNREADABLE_RECORD_RETRY_MS = 25
const RECORD_FILE = /^\d+\.json$/
/** `vD`: la versión que la telemetría acepta tal cual. */
const TELEMETRY_VERSION =
  /^\d{1,8}\.\d{1,8}\.\d{1,8}(?!\d)(-(?:dev|alpha|beta|rc|test|nightly|engine|byoc|gateway|ccs)(?![A-Za-z_-])\d{0,8}(?![A-Za-z0-9_-])(?:\.(?:\d{1,8}|t\d{6}|sha[0-9a-f]{1,40})(?![A-Za-z0-9_-])){0,4})?/
const TELEMETRY_ID = /^[A-Za-z0-9_-]{1,128}$/

export type RegistryRecordKind = 'interactive' | 'bg' | 'daemon' | 'daemon-worker'
const RECORD_KINDS: ReadonlySet<string> = new Set(['interactive', 'bg', 'daemon', 'daemon-worker'])

/** `id`: lo que el barrido lee de un archivo pid. */
export type RegistryRecord = {
  pid: number
  sessionId: string
  cwd?: string
  startedAt: number
  version?: string
  kind: RegistryRecordKind
  entrypoint?: string
  pidDomain?: string
}

/** La parte del contrato de storage que el barrido consume. */
export interface RegistryStorage extends Pick<SessionKeyStorage, 'listEntries'> {
  read(requests: Array<{ key: SessionStorageKey; offset: number; length: number }>): Promise<StorageResult<{ items: Array<{ found: boolean; value: Uint8Array }> }>>
  delete(key: SessionStorageKey): Promise<StorageResult<{ existed: boolean }>>
}

export type RegistrySweepDeps = {
  sessionsDir: () => string
  pid: number
  platform: () => string
  /** `_u`. */
  isInteractive: () => boolean
  homedir: () => string
  version: string
  now: () => number
  /** `N()`. */
  storageBackendActive?: () => boolean
  /** `Nh`: el pid es válido y no existe. */
  isProcessGone: (pid: number) => boolean
  /** `ua`: el pid responde a la señal 0. */
  isProcessAlive: (pid: number) => boolean
  /** `HP`. */
  ownPidDomain: () => Promise<string>
  sleep: (ms: number) => Promise<void>
  log: (message: string, options?: { level: DebugLogLevel }) => void
  logEvent: (name: string, fields: Record<string, unknown>) => void
  /** `xUo`. */
  isEmbeddedEntrypoint: (entrypoint: string | undefined) => boolean
  state: () => SessionRegistryState
}

function signalZero(pid: number): boolean {
  if (pid <= 1) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export const processRegistrySweepDeps: RegistrySweepDeps = {
  sessionsDir: defaultSessionsDir,
  get pid() {
    return process.pid
  },
  platform: () => getPlatform(),
  isInteractive: () => getIsInteractive(),
  homedir: () => homedir(),
  version: typeof MACRO !== 'undefined' ? MACRO.VERSION : '',
  now: () => Date.now(),
  storageBackendActive: () => storageBackendPin.isActive(),
  isProcessGone: pid => isProcessGone(pid),
  isProcessAlive: signalZero,
  ownPidDomain: () => currentPidDomain(getPlatform()),
  sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
  log: (message, options) => logForDebugging(message, options),
  logEvent: (name, fields) => logEvent(name, fields as EventMetadata),
  isEmbeddedEntrypoint,
  state: () => sessionRegistryState(),
}

function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

/** `id` + `J`: el registro si el texto tiene su forma; los campos de más se descartan. */
export function parseRegistryRecord(text: string): RegistryRecord | null {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  if (typeof raw.pid !== 'number' || typeof raw.sessionId !== 'string' || typeof raw.startedAt !== 'number') return null
  if (typeof raw.kind !== 'string' || !RECORD_KINDS.has(raw.kind)) return null
  const optional = ['cwd', 'version', 'entrypoint', 'pidDomain'] as const
  if (!optional.every(key => optionalString(raw[key]))) return null
  const parsed: RegistryRecord = { pid: raw.pid, sessionId: raw.sessionId, startedAt: raw.startedAt, kind: raw.kind as RegistryRecordKind }
  for (const key of optional) if (raw[key] !== undefined) parsed[key] = raw[key] as string
  return parsed
}

/** `Ny`. */
export async function readRegistryRecordFromStorage(storage: RegistryStorage, file: string): Promise<RegistryRecord | null> {
  try {
    const result = await storage.read([{ key: sessionKey(file), offset: 0, length: REGISTRY_RECORD_MAX_BYTES + 1 }])
    const item = result.ok ? result.value.items[0] : undefined
    if (!item?.found || item.value.byteLength > REGISTRY_RECORD_MAX_BYTES) return null
    return parseRegistryRecord(Buffer.from(item.value).toString('utf8'))
  } catch {
    return null
  }
}

/** `Fy`: si el registro existía y se borró. */
export async function deleteRegistryRecordFromStorage(storage: RegistryStorage, file: string): Promise<boolean> {
  try {
    const result = await storage.delete(sessionKey(file))
    return result.ok && result.value.existed
  } catch {
    return false
  }
}

/** `zy`: los nombres del ámbito de sesiones; con el tope alcanzado, lo visto. */
function listRegistryNames(storage: RegistryStorage, deps: RegistrySweepDeps): Promise<string[] | undefined> {
  return listSessionKeyNames(storage as unknown as SessionKeyStorage, {
    partialOnCap: true,
    onIssue: (message, level) => deps.log(`[concurrentSessions] session list ${message}`, level === undefined ? undefined : { level }),
  })
}

/** `TCe`. */
export function isRegistrySweepPermitted(deps: Pick<RegistrySweepDeps, 'state'> = processRegistrySweepDeps): Promise<boolean> {
  return deps.state().isRegistrySweepPermitted()
}

/** `aD`: en windows, una ruta POSIX delata un registro escrito desde otro sistema. */
export function isWindowsPosixCwd(cwd: string | undefined, deps: Pick<RegistrySweepDeps, 'platform'> = processRegistrySweepDeps): boolean {
  return deps.platform() === 'windows' && cwd !== undefined && cwd.startsWith('/')
}

/**
 * `lpn`: si el registro pertenece al dominio de pids de esta sesión. Sin
 * dominio declarado se infiere: sin registro, por el dominio de sus claves;
 * con registro, por lo que su `cwd` delata en windows y en macos.
 */
export function recordInPidDomain(
  record: RegistryRecord | null,
  domain: string,
  keyDomains: Array<string | undefined> = [],
  deps: Pick<RegistrySweepDeps, 'platform' | 'isInteractive' | 'homedir'> = processRegistrySweepDeps,
): boolean {
  const platform = deps.platform()
  const nonInteractive = !deps.isInteractive()
  if (record === null) {
    if (keyDomains.some(keyDomain => keyDomain !== undefined && keyDomain !== domain)) return false
    return platform !== 'windows' && !(platform === 'macos' && nonInteractive)
  }
  if (record.pidDomain !== undefined) return record.pidDomain === domain
  switch (platform) {
    case 'windows':
      return !isWindowsPosixCwd(record.cwd, deps)
    case 'macos': {
      const home = deps.homedir()
      return !nonInteractive || record.cwd === undefined || record.cwd.startsWith(home + sep) || record.cwd === home
    }
    default:
      return true
  }
}

/** `Ly`: borra las claves de `pid` que no declaran otro dominio, si el pid murió. */
async function deleteDeadPidKeys(
  names: string[],
  dir: string,
  pid: number,
  domain: string,
  remove: (name: string) => Promise<void>,
  deps: RegistrySweepDeps,
): Promise<void> {
  const prefix = `${pid}.`
  await Promise.all(
    names.map(async name => {
      if (!name.startsWith(prefix) || !INBOX_KEY_FILE.test(name)) return
      const keyDomain = await readKeyPidDomain(join(dir, name))
      if (keyDomain !== undefined && keyDomain !== domain) return
      if (pid === deps.pid || !deps.isProcessGone(pid)) return
      await remove(name)
    }),
  )
}

/** `ZKn`: retira las claves de un pid muerto, por el storage si está activo. */
export async function sweepDeadPidKeys(
  dir: string,
  pid: number,
  domain: string,
  storage: RegistryStorage | undefined,
  deps: RegistrySweepDeps = processRegistrySweepDeps,
): Promise<void> {
  if (deps.storageBackendActive?.() && storage !== undefined) {
    const names = await listRegistryNames(storage, deps)
    if (names === undefined) return
    await deleteDeadPidKeys(names, dir, pid, domain, name => storage.delete(sessionKey(name)).then(() => {}, () => {}), deps)
    return
  }
  let names: string[]
  try {
    names = await readdir(dir)
  } catch {
    return
  }
  await deleteDeadPidKeys(names, dir, pid, domain, name => unlink(join(dir, name)).catch(() => {}), deps)
}

async function readRecord(storage: RegistryStorage | undefined, path: string, name: string): Promise<RegistryRecord | null> {
  if (storage !== undefined) return readRegistryRecordFromStorage(storage, name)
  const text = await readBoundedFile(path, REGISTRY_RECORD_MAX_BYTES)
  return text === null ? null : parseRegistryRecord(text)
}

/** `fi`. */
function telemetryVersion(version: string | undefined): string {
  if (version == null) return 'none'
  return version.match(TELEMETRY_VERSION)?.[0] ?? 'other'
}

/** `_e`. */
function telemetryId(id: string): string {
  return TELEMETRY_ID.test(id) ? id : 'nonconforming'
}

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | null)?.code === 'ENOENT'
}

/**
 * `xut`: cuenta las sesiones vivas del registro y, si barrer está permitido,
 * retira los registros y las claves de las muertas de este dominio. Avisa
 * una vez por archivo de cada interactiva que salió sin cerrar.
 */
export async function sweepRegistry(storage?: RegistryStorage, deps: RegistrySweepDeps = processRegistrySweepDeps): Promise<number> {
  const dir = deps.sessionsDir()
  let names: string[]
  if (storage !== undefined) {
    const listed = await listRegistryNames(storage, deps)
    if (listed === undefined) return 0
    names = listed
  } else {
    try {
      names = await readdir(dir)
    } catch (error) {
      if (!isNotFound(error)) deps.log(`[concurrentSessions] readdir failed: ${errorMessage(error)}`)
      return 0
    }
  }
  const state = deps.state()
  const permitted = await state.isRegistrySweepPermitted()
  const domain = permitted ? await deps.ownPidDomain() : ''
  deps.log(
    `[sessionRegistry] sweep ${permitted ? `permitted (domain ${domain})` : 'declined by isRegistrySweepPermitted() — dead records are left in place (neither counted nor deleted)'}`,
  )
  let live = 0
  const foreign = new Set<number>()
  const removed = new Set<number>()
  const keysByPid = new Map<number, string[]>()
  for (const name of names) {
    const match = INBOX_KEY_FILE.exec(name)
    if (match) {
      const pid = Number.parseInt(match[1]!, 10)
      keysByPid.set(pid, [...(keysByPid.get(pid) ?? []), name])
    }
  }
  for (const name of names) {
    if (!RECORD_FILE.test(name)) continue
    const pid = Number.parseInt(name.slice(0, -5), 10)
    if (pid === deps.pid || deps.isProcessAlive(pid)) {
      live++
      continue
    }
    if (!deps.isProcessGone(pid) || !permitted) continue
    const path = join(dir, name)
    let record = await readRecord(storage, path, name)
    if (record === null) {
      await deps.sleep(UNREADABLE_RECORD_RETRY_MS)
      record = await readRecord(storage, path, name)
    }
    const keyDomains = record === null ? await Promise.all((keysByPid.get(pid) ?? []).map(key => readKeyPidDomain(join(dir, key)))) : []
    if (!recordInPidDomain(record, domain, keyDomains, deps) || !deps.isProcessGone(pid)) {
      foreign.add(pid)
      continue
    }
    removed.add(pid)
    const deleted = storage !== undefined ? await deleteRegistryRecordFromStorage(storage, name) : await unlink(path).then(() => true, () => false)
    if (
      deleted &&
      !state.uncleanExitsScanned &&
      record !== null &&
      record.kind === 'interactive' &&
      !deps.isEmbeddedEntrypoint(record.entrypoint) &&
      !state.reportedUncleanExitPaths.has(path)
    ) {
      deps.log(`Prior session exited uncleanly: ${record.sessionId} (v${record.version ?? '?'})`)
      deps.logEvent('tengu_unclean_exit', {
        session_age_sec: Math.round((deps.now() - record.startedAt) / 1000),
        prior_version: telemetryVersion(record.version),
        on_current_version: record.version === deps.version,
        prior_session_id: telemetryId(record.sessionId),
      })
      state.markUncleanExitReported(path)
    }
  }
  if (permitted) {
    for (const name of names) {
      const match = INBOX_KEY_FILE.exec(name)
      if (!match) continue
      const pid = Number.parseInt(match[1]!, 10)
      if (pid === deps.pid || foreign.has(pid) || !deps.isProcessGone(pid)) continue
      const keyDomain = await readKeyPidDomain(join(dir, name))
      if (!(keyDomain !== undefined ? keyDomain === domain : removed.has(pid) || deps.platform() === 'linux')) continue
      if (!deps.isProcessGone(pid)) continue
      // la referencia no espera estos borrados; aquí se esperan para que el barrido termine con el directorio ya limpio
      if (storage !== undefined) await deleteRegistryRecordFromStorage(storage, name)
      else await unlink(join(dir, name)).catch(() => {})
    }
    state.setUncleanExitsScanned(true)
  }
  return live
}
