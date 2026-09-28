/**
 * La clave publicada del buzón: cada sesión deja en el directorio de sesiones
 * un archivo `<pid>.<sha256 de la dirección>.key` con su token de par, su
 * token de inicio y su dominio de pids. Quien quiere escribirle a esa
 * dirección lee ahí el token; el pid y el inicio le dicen si el dueño sigue
 * vivo y no fue reciclado.
 *
 * Porte de `XDo`, `sz`, `be`, `ifn`, `JDo`, `QDo`, `W`, `cl` y `x`
 * (`chunk-5mcqvwzx.js`, `chunk-q8a07cv0.js`) de 2.1.283, con sus dos ramas:
 * archivos locales, y el backend de storage (`N()`) por `ye`, `J4n`, `Ee`,
 * `Ks` y `rt` (`chunk-5mcqvwzx.js`, `chunk-mp7hmykc.js`, `chunk-nwpc1c89.js`).
 * `SessionKeyStorage` es sólo la parte del contrato de storage que estas
 * funciones consumen; el backend que lo implementa es otra fase.
 */
import { mkdir, readdir, readFile, stat, unlink } from 'node:fs/promises'
import { basename, join } from 'node:path'

import { getConfigHomeDir } from '@thyrox/config/env/configHome'
import { getPlatform } from '@thyrox/config/platform'

import { logForDebugging } from '../debug.ts'
import { writeFileAtomicWithMode } from './atomicWrite.ts'
import { storageBackendPin } from './storageBackendPin.ts'
import { INBOX_KEY_FILE, INBOX_KEY_TEMP_FILE, inboxKeyFileName, inboxKeySuffix } from './inboxAuth.ts'
import {
  currentPidDomain,
  currentProcessStartToken,
  isProcessGone,
  procStartFields,
  recordedStartToken,
  sameStartToken,
  startTokenCache,
} from './processIdentity.ts'

/** `x`: una clave legítima cabe holgadamente en 4 KiB; algo mayor no se lee. */
const KEY_FILE_MAX_BYTES = 4096
const PEER_TOKEN = /^[0-9a-f]{32}$/
const SESSIONS_DIR_MODE = 0o700
const KEY_FILE_MODE = 0o600

export type InboxKeyRecord = { peerToken: string; procStart?: string; procStartFt?: string; pidDomain?: string }

export type PeerTokenLookup = { kind: 'token'; token: string } | { kind: 'no-key' } | { kind: 'unusable' } | { kind: 'dead-owner' }

/** La clave de un archivo del ámbito de sesiones en el storage (`Re.session`). */
export type SessionStorageKey = { namespace: 'session'; file: string }
export type StorageError = { code: string; failureClass?: string; telemetryCode?: string; cause?: unknown }
export type StorageResult<T> = { ok: true; value: T } | { ok: false; error: StorageError }
export type StoragePage<T> = { items: T[]; cursor?: string }
export type StorageListEntry = { kind: string; key: { namespace: string; file?: string } }
export type StorageTextRead = { found: boolean; totalBytes: number; value: string }

/** La parte del contrato de storage que la clave del buzón consume. */
export interface SessionKeyStorage {
  ensureScope(scope: { namespace: 'session' }): Promise<StorageResult<unknown>>
  write(key: SessionStorageKey, text: string, options: { publishDiscipline: 'atomic'; mode: number; exactMode: number }): Promise<StorageResult<unknown>>
  delete(key: SessionStorageKey): Promise<unknown>
  listEntries(scope: { namespace: 'session' }, page: { cursor: string | undefined; skipKeyStats: true }): Promise<StorageResult<StoragePage<StorageListEntry>>>
  readText(requests: Array<{ key: SessionStorageKey; offset: number; length: number }>): Promise<StorageResult<{ items: StorageTextRead[] }>>
}

/** Tope de páginas al listar el ámbito de sesiones (`dp`). */
const STORAGE_PAGE_LIMIT = 10000

export interface InboxKeyDeps {
  sessionsDir: () => string
  /** `N()`: si hay un backend de storage instalado; sin él, todo va a archivos locales. */
  storageBackendActive: () => boolean
  storagePageLimit?: number
  pid: number
  ownStartToken: () => Promise<string | undefined>
  ownPidDomain: () => Promise<string>
  isProcessGone: (pid: number) => boolean
  startTokenOf: (pid: number) => Promise<string | undefined>
}

/** `sz`: `<config home>/sessions`. */
export function defaultSessionsDir(): string {
  return join(getConfigHomeDir(), 'sessions')
}

export const processInboxKeyDeps: InboxKeyDeps = {
  sessionsDir: defaultSessionsDir,
  storageBackendActive: () => storageBackendPin.isActive(),
  get pid() {
    return process.pid
  },
  ownStartToken: currentProcessStartToken,
  ownPidDomain: () => currentPidDomain(getPlatform()),
  isProcessGone: pid => isProcessGone(pid),
  startTokenOf: pid => startTokenCache.get(pid, { skipCache: true }),
}

/** `W`: la forma de un registro de clave; los campos opcionales, si están, son cadenas. */
function parseKeyRecord(text: string): InboxKeyRecord | undefined {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return undefined
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  if (typeof record.peerToken !== 'string' || !PEER_TOKEN.test(record.peerToken)) return undefined
  const optional = ['procStart', 'procStartFt', 'pidDomain'] as const
  if (optional.some(key => record[key] !== undefined && typeof record[key] !== 'string')) return undefined
  const parsed: InboxKeyRecord = { peerToken: record.peerToken }
  for (const key of optional) if (record[key] !== undefined) parsed[key] = record[key] as string
  return parsed
}

/** `cl`: el texto de un archivo regular de hasta `maxBytes`, o `null`. */
async function readBoundedFile(path: string, maxBytes: number): Promise<string | null> {
  try {
    const stats = await stat(path)
    if (!stats.isFile() || stats.size > maxBytes) return null
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

async function readKeyRecord(path: string): Promise<InboxKeyRecord | undefined> {
  const text = await readBoundedFile(path, KEY_FILE_MAX_BYTES)
  return text === null ? undefined : parseKeyRecord(text)
}

/** `ifn`: el dominio de pids que declara un archivo de clave, si es válido. */
export async function readKeyPidDomain(path: string): Promise<string | undefined> {
  return (await readKeyRecord(path))?.pidDomain
}

/** `Re.session`. */
const sessionKey = (file: string): SessionStorageKey => ({ namespace: 'session', file })

/** `rt`: el error de storage en una línea, con su clase, su código y su causa. */
export function formatStorageError(error: StorageError): string {
  const failureClass = error.failureClass !== undefined ? ` ${error.failureClass}` : ''
  const telemetry = error.telemetryCode ? ` ${error.telemetryCode}` : ''
  const cause = error.cause ? `: ${error.cause instanceof Error ? error.cause.message : String(error.cause)}` : ''
  return `${error.code}${failureClass}${telemetry}${cause}`
}

export type PaginationOutcome = { status: 'done' } | { status: 'capped' } | { status: 'error'; error: StorageError }

/** `Ks`: recorre un listado por cursor hasta agotarlo, hasta `maxPages`, o hasta un error. */
export async function paginateStorage<T>(
  fetchPage: (cursor: string | undefined) => Promise<StorageResult<StoragePage<T>>>,
  consume: (items: T[]) => void | Promise<void>,
  options: { maxPages?: number } = {},
): Promise<PaginationOutcome> {
  const maxPages = Math.max(1, Math.floor(options.maxPages ?? STORAGE_PAGE_LIMIT))
  let cursor: string | undefined
  for (let page = 0; page < maxPages; page++) {
    const result = await fetchPage(cursor)
    if (!result.ok) return { status: 'error', error: result.error }
    await consume(result.value.items)
    cursor = result.value.cursor
    if (!cursor) return { status: 'done' }
  }
  return { status: 'capped' }
}

/** `J4n`: los nombres del ámbito de sesiones; `undefined` si el listado no terminó. */
async function listSessionKeyNames(storage: SessionKeyStorage, maxPages: number): Promise<string[] | undefined> {
  const names: string[] = []
  let outcome: PaginationOutcome
  try {
    outcome = await paginateStorage(
      cursor => storage.listEntries({ namespace: 'session' }, { cursor, skipKeyStats: true }),
      items => {
        for (const entry of items) if (entry.kind === 'key' && entry.key.namespace === 'session' && entry.key.file !== undefined) names.push(entry.key.file)
      },
      { maxPages },
    )
  } catch {
    return undefined
  }
  return outcome.status === 'done' ? names : undefined
}

/** `Ee`: el texto de una clave por el storage, o `null` si falta o excede el tope. */
async function readSessionKeyText(storage: SessionKeyStorage, file: string): Promise<string | null> {
  try {
    const result = await storage.readText([{ key: sessionKey(file), offset: 0, length: KEY_FILE_MAX_BYTES + 1 }])
    if (!result.ok) return null
    const item = result.value.items[0]
    if (item === undefined || !item.found || item.totalBytes > KEY_FILE_MAX_BYTES) return null
    return item.value
  } catch {
    return null
  }
}

/** `ye`: publica la clave por el storage, con escritura atómica y modo exacto 0600. */
async function publishThroughStorage(storage: SessionKeyStorage, address: string, peerToken: string, deps: InboxKeyDeps): Promise<string> {
  const file = inboxKeyFileName(deps.pid, address)
  const scope = await storage.ensureScope({ namespace: 'session' })
  if (!scope.ok) {
    logForDebugging(`[uds-auth] sessions scope unavailable: ${formatStorageError(scope.error)}`)
    throw new Error('messaging key folder could not be made through storage')
  }
  try {
    await storage.delete(sessionKey(file))
  } catch {
    // una clave anterior que no se puede borrar la reemplaza la escritura
  }
  const record = { peerToken, ...procStartFields(await deps.ownStartToken()), pidDomain: await deps.ownPidDomain() }
  const written = await storage.write(sessionKey(file), JSON.stringify(record), { publishDiscipline: 'atomic', mode: KEY_FILE_MODE, exactMode: KEY_FILE_MODE })
  if (!written.ok) {
    logForDebugging(`[uds-auth] key publish failed: ${formatStorageError(written.error)}`)
    throw new Error('messaging key could not be published through storage')
  }
  return join(deps.sessionsDir(), file)
}

/**
 * `be`: retira los temporales de clave que dejó un escritor ya muerto. Un
 * temporal que declara otro dominio de pids se conserva: su pid no es
 * comparable con los de este dominio.
 */
export async function sweepStaleKeyTemps(dir: string, permitted: boolean, deps: InboxKeyDeps = processInboxKeyDeps): Promise<void> {
  if (!permitted) return
  let names: string[]
  try {
    names = await readdir(dir)
  } catch {
    return
  }
  const ownDomain = await deps.ownPidDomain()
  await Promise.all(
    names.map(async name => {
      const match = INBOX_KEY_TEMP_FILE.exec(name)
      if (!match || !deps.isProcessGone(Number.parseInt(match[1]!, 10))) return
      const domain = await readKeyPidDomain(join(dir, name))
      if (domain !== undefined && domain !== ownDomain) return
      await unlink(join(dir, name)).catch(() => {})
    }),
  )
}

/** `XDo`: publica la clave de esta sesión para `address` y devuelve su ruta. */
export async function publishInboxKey(
  address: string,
  peerToken: string,
  { sweepPermitted, storage }: { sweepPermitted: boolean; storage?: SessionKeyStorage },
  deps: InboxKeyDeps = processInboxKeyDeps,
): Promise<string> {
  if (deps.storageBackendActive() && storage !== undefined) return publishThroughStorage(storage, address, peerToken, deps)
  const dir = deps.sessionsDir()
  await mkdir(dir, { recursive: true, mode: SESSIONS_DIR_MODE })
  await sweepStaleKeyTemps(dir, sweepPermitted, deps)
  const path = join(dir, inboxKeyFileName(deps.pid, address))
  await unlink(path).catch(() => {})
  const record = { peerToken, ...procStartFields(await deps.ownStartToken()), pidDomain: await deps.ownPidDomain() }
  await writeFileAtomicWithMode(path, JSON.stringify(record), { mode: KEY_FILE_MODE })
  return path
}

/** `JDo`: retira la clave publicada; que ya no exista no es un error. */
export async function removeInboxKey(path: string, storage?: SessionKeyStorage, deps: InboxKeyDeps = processInboxKeyDeps): Promise<void> {
  if (deps.storageBackendActive() && storage !== undefined) {
    try {
      await storage.delete(sessionKey(basename(path)))
    } catch {
      // la clave que no se puede borrar deja de valer cuando su dueño muere
    }
    return
  }
  await unlink(path).catch(() => {})
}

/**
 * Rango de una clave cuando hay varias para la misma dirección: 2 si su dueño
 * vive con el mismo inicio, 1 si su inicio no se puede comparar, 0 si el
 * dueño murió o su pid fue reciclado.
 */
async function ownerRank(pid: number, record: InboxKeyRecord, deps: InboxKeyDeps): Promise<number> {
  if (deps.isProcessGone(pid)) return 0
  const recorded = recordedStartToken(record)
  const current = recorded === undefined ? undefined : await deps.startTokenOf(pid)
  if (recorded === undefined || current === undefined) return 1
  return sameStartToken(recorded, current) ? 2 : 0
}

/** `QDo`: el token de par publicado para `address`, o por qué no hay uno usable. */
export async function readPeerToken(
  address: string,
  options: { requireLiveOwner?: boolean; storage?: SessionKeyStorage } | undefined,
  deps: InboxKeyDeps = processInboxKeyDeps,
): Promise<PeerTokenLookup> {
  const dir = deps.sessionsDir()
  const storage = deps.storageBackendActive() ? options?.storage : undefined
  let names: string[]
  if (storage !== undefined) {
    const listed = await listSessionKeyNames(storage, deps.storagePageLimit ?? STORAGE_PAGE_LIMIT)
    if (listed === undefined) return { kind: 'unusable' }
    names = listed
  } else {
    try {
      names = await readdir(dir)
    } catch (error) {
      return (error as { code?: string } | null)?.code === 'ENOENT' ? { kind: 'no-key' } : { kind: 'unusable' }
    }
  }
  const readRecord = async (file: string): Promise<InboxKeyRecord | undefined> => {
    if (storage === undefined) return readKeyRecord(join(dir, file))
    const text = await readSessionKeyText(storage, file)
    return text === null ? undefined : parseKeyRecord(text)
  }
  const suffix = inboxKeySuffix(address)
  if (suffix === undefined) return { kind: 'no-key' }
  const candidates = names
    .filter(name => name.endsWith(suffix))
    .flatMap(name => {
      const match = INBOX_KEY_FILE.exec(name)
      return match ? [{ file: name, pid: Number.parseInt(match[1]!, 10) }] : []
    })
  if (candidates.length === 0) return { kind: 'no-key' }
  const requireLiveOwner = options?.requireLiveOwner === true

  if (candidates.length === 1) {
    const { file, pid } = candidates[0]!
    if (requireLiveOwner && deps.isProcessGone(pid)) return { kind: 'dead-owner' }
    const record = await readRecord(file)
    if (record === undefined) return { kind: 'unusable' }
    if (requireLiveOwner) {
      const recorded = recordedStartToken(record)
      if (recorded !== undefined) {
        const current = await deps.startTokenOf(pid)
        if (current !== undefined && !sameStartToken(recorded, current)) return { kind: 'dead-owner' }
      }
    }
    return { kind: 'token', token: record.peerToken }
  }

  let best: { rank: number; peerToken: string } | undefined
  for (const { file, pid } of candidates) {
    const record = await readRecord(file)
    if (record === undefined) continue
    const rank = await ownerRank(pid, record, deps)
    if (best === undefined || rank > best.rank) best = { rank, peerToken: record.peerToken }
  }
  if (best === undefined) return { kind: 'unusable' }
  if (requireLiveOwner && best.rank === 0) return { kind: 'dead-owner' }
  return { kind: 'token', token: best.peerToken }
}
