/**
 * La clave publicada del buzón: cada sesión deja en el directorio de sesiones
 * un archivo `<pid>.<sha256 de la dirección>.key` con su token de par, su
 * token de inicio y su dominio de pids. Quien quiere escribirle a esa
 * dirección lee ahí el token; el pid y el inicio le dicen si el dueño sigue
 * vivo y no fue reciclado.
 *
 * Porte de `XDo`, `sz`, `be`, `ifn`, `JDo`, `QDo`, `W`, `cl` y `x`
 * (`chunk-5mcqvwzx.js`, `chunk-q8a07cv0.js`) de 2.1.283, en la rama de
 * archivos locales.
 */
import { mkdir, readdir, readFile, stat, unlink } from 'node:fs/promises'
import { join } from 'node:path'

import { getConfigHomeDir } from '@thyrox/config/env/configHome'
import { getPlatform } from '@thyrox/config/platform'

import { writeFileAtomicWithMode } from './atomicWrite.ts'
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

export interface InboxKeyDeps {
  sessionsDir: () => string
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
  { sweepPermitted }: { sweepPermitted: boolean },
  deps: InboxKeyDeps = processInboxKeyDeps,
): Promise<string> {
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
export async function removeInboxKey(path: string): Promise<void> {
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
  options: { requireLiveOwner?: boolean } | undefined,
  deps: InboxKeyDeps = processInboxKeyDeps,
): Promise<PeerTokenLookup> {
  const dir = deps.sessionsDir()
  let names: string[]
  try {
    names = await readdir(dir)
  } catch (error) {
    return (error as { code?: string } | null)?.code === 'ENOENT' ? { kind: 'no-key' } : { kind: 'unusable' }
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
    const record = await readKeyRecord(join(dir, file))
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
    const record = await readKeyRecord(join(dir, file))
    if (record === undefined) continue
    const rank = await ownerRank(pid, record, deps)
    if (best === undefined || rank > best.rank) best = { rank, peerToken: record.peerToken }
  }
  if (best === undefined) return { kind: 'unusable' }
  if (requireLiveOwner && best.rank === 0) return { kind: 'dead-owner' }
  return { kind: 'token', token: best.peerToken }
}
