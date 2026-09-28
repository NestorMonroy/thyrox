/**
 * Los adjuntos que una sesión manda a otra por el buzón. El emisor copia cada
 * archivo a un spool de transferencia (`file-transfers` bajo el directorio de
 * configuración) y manda su ruta, tamaño y sha256; el receptor comprueba que
 * la ruta vive en ese spool, relee la copia con tope de tamaño, verifica su
 * integridad y la escribe en los uploads de su sesión, donde el mensaje la
 * referencia con `@"<ruta>"`.
 *
 * Porte de `chunk-xqnw10c4.js` (con los nombres que exporta
 * `chunk-yrfq0b3e.js`), `ZOe` y `Dur` de `chunk-d6ekr2rh.js`, `met` de
 * `chunk-k1ds5bv1.js`, `G3` de `chunk-c98zkdh2.js` y `nlt`/`Ws` de 2.1.283.
 * El predicado de ruta insegura (`Mur`) vive en `@thyrox/permission`, que
 * depende de este paquete, así que entra como dependencia.
 */
import { createHash, randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, mkdir, open, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import type { FileHandle } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join, resolve } from 'node:path'

import { getSessionId } from '@thyrox/app-host/bootstrap/state.js'
import { getConfigHomeDir } from '@thyrox/config/env/configHome'
import { isEnvTruthy } from '@thyrox/config/env/utils'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import { getPlatform } from '@thyrox/config/platform'

import { logForDebugging } from '../debug.ts'
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../errorHelpers.ts'
import { reportFeatureBad, reportFeatureOk, reportFeatureSad } from './featureTelemetry.ts'
import { logEvent } from '../core.ts'
import type { EventMetadata } from '../contracts.ts'
import { isUncLikePath } from './socketPath.ts'

/** `dan`: días que una copia puede quedar en el spool. */
export const SPOOL_TTL_DAYS = 1
/** `XD`. */
export const MAX_FILES_PER_MESSAGE = 16
/** `qV`: 30 MiB. */
export const MAX_TRANSFER_BYTES = 31457280
/** `can`. */
export const SOURCE_UNREADABLE_REASON = `could not be read, is not a regular file, or exceeds the ${MAX_TRANSFER_BYTES / 1048576} MiB transfer limit`
/** `H`. */
export const TRANSFER_SPOOL_DIR_NAME = 'file-transfers'

const SPOOL_TTL_MS = SPOOL_TTL_DAYS * 24 * 60 * 60 * 1000
const SWEEP_LIMIT = 200
const MAX_NAME_LENGTH = 200
const MAX_EXTENSION_LENGTH = 16
const PRIVATE_DIR_MODE = 0o700
const PRIVATE_FILE_MODE = 0o600
/** `vd`: `O_CLOEXEC`, que `fs.constants` no expone. */
const OPEN_CLOEXEC = 524288
const EXPIRED_REASON = 'the transfer copy could not be read (it may have expired)'
const SHA256_HEX = /^[0-9a-f]{64}$/
const ENVELOPE_OPENING = /^<cross-session-message\b[^>]*>\n?/

/** `j` de `chunk-k1ds5bv1.js`. */
const MEDIA_TYPES: Readonly<Record<string, string>> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.avif': 'image/avif',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.mp4': 'video/mp4',
  '.m4v': 'video/x-m4v',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.log': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.xml': 'application/xml',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip',
}

export type PeerFileAttachment = {
  path: string
  file_name: string
  file_size: number
  sha256: string
  media_type?: string
}

export type MaterializeResult = { prefix: string; received: number; verified: number }

export interface PeerFileDeps {
  /** `LEt`. */
  spoolDir: () => string
  /** `G3`: los uploads de la sesión que recibe. */
  uploadsDir: () => string
  /** `Mur`. */
  isUnsafeTransferPath: (path: string) => boolean
  randomUUID: () => string
  log: (message: string) => void
}

/** `LEt`. */
export function peerTransferSpoolDir(): string {
  return join(getConfigHomeDir(), TRANSFER_SPOOL_DIR_NAME)
}

/** `G3`, con `override` en el papel de `ujt`. */
export function sessionUploadsDir(override?: string): string {
  return override ?? join(getConfigHomeDir(), 'uploads', getSessionId())
}

/** Las dependencias de proceso; el predicado de ruta lo pone quien tiene `@thyrox/permission`. */
export function processPeerFileDeps(isUnsafeTransferPath: (path: string) => boolean): PeerFileDeps {
  return {
    spoolDir: peerTransferSpoolDir,
    uploadsDir: () => sessionUploadsDir(),
    isUnsafeTransferPath,
    randomUUID,
    log: message => logForDebugging(message),
  }
}

function logTransfer(deps: Pick<PeerFileDeps, 'log'>, message: string): void {
  deps.log(`[peer-file-transfer] ${message}`)
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/** `DEt`: un nombre de archivo seguro, conservando una extensión corta. */
export function sanitizePeerFileName(name: string): string {
  const safe = basename(name).replace(/[^a-zA-Z0-9._-]/g, '_') || 'attachment'
  const dot = safe.lastIndexOf('.')
  const extension = dot > 0 && safe.length - dot <= MAX_EXTENSION_LENGTH ? safe.slice(dot) : ''
  const stem = extension ? safe.slice(0, dot) : safe
  const room = MAX_NAME_LENGTH - extension.length
  return (stem.length > room ? stem.slice(0, room) : stem) + extension
}

/** `cYt`. */
export function peerFileFailureNote(fileName: string, reason: string): string {
  return `[SendFile: "${sanitizePeerFileName(fileName)}" was not delivered — ${reason}]`
}

/** `dYt`. */
export function peerFileCountCapNote(dropped: number): string {
  return `[SendFile: ${dropped} additional attachment(s) were dropped — max ${MAX_FILES_PER_MESSAGE} per message]`
}

/** `uYt`: el tamaño, cuando viene, y el sha256. */
export function verifyPeerFileIntegrity(bytes: Uint8Array, attachment: { file_size?: unknown; sha256: string }): boolean {
  if (typeof attachment.file_size === 'number' && bytes.length !== attachment.file_size) return false
  return sha256Hex(bytes) === attachment.sha256
}

/** `met`. */
export function mediaTypeFor(fileName: string): string | undefined {
  return MEDIA_TYPES[extname(fileName).toLowerCase()]
}

/** `wxn`. */
export function emitPeerFileReceiveTelemetry(
  transport: string,
  fileCount: number,
  verifiedCount: number,
  sink: (name: string, metadata: Record<string, unknown>) => void = (name, metadata) => logEvent(name, metadata as EventMetadata),
): void {
  sink('tengu_send_file_received', { transport, file_count: fileCount, verified_count: verifiedCount })
  if (verifiedCount === fileCount) reportFeatureOk('peer_file_receive', undefined, sink)
  else if (verifiedCount > 0) reportFeatureSad('peer_file_receive', 'partial_failed', undefined, sink)
  else reportFeatureBad('peer_file_receive', 'all_failed', undefined, sink)
}

/** `ZOe`: lee hasta `max + 1` bytes para saber si el archivo excede el límite. */
async function readUpTo(handle: FileHandle, max: number, sizeHint: number | undefined): Promise<{ bytes: Buffer; overLimit: boolean }> {
  const limit = max + 1
  let buffer = Buffer.alloc(sizeHint === undefined ? limit : Math.min(Math.max(Number(sizeHint) + 1, 1), limit))
  let filled = 0
  while (filled < limit) {
    if (filled === buffer.length) {
      const grown = Buffer.alloc(limit)
      buffer.copy(grown)
      buffer = grown
    }
    const { bytesRead } = await handle.read(buffer, filled, buffer.length - filled, filled)
    if (bytesRead === 0) break
    filled += bytesRead
  }
  return { bytes: buffer.subarray(0, Math.min(filled, max)), overLimit: filled > max }
}

/** `sze`: el contenido de un archivo regular de hasta `max` bytes, o `null`. */
export async function readPeerFileBounded(path: string, max: number): Promise<Buffer | null> {
  try {
    const info = await stat(path)
    if (!info.isFile() || info.size > max) return null
  } catch {
    return null
  }
  let handle: FileHandle
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NONBLOCK | OPEN_CLOEXEC)
  } catch {
    return null
  }
  try {
    const info = await handle.stat()
    if (!info.isFile() || info.size > max) return null
    const read = await readUpTo(handle, max, info.size)
    return read.overLimit ? null : read.bytes
  } catch {
    return null
  } finally {
    await handle.close().catch(() => {})
  }
}

/** `vxn`: el prefijo va tras la apertura del sobre, si la hay. */
export function injectPeerFilePrefix(text: string, prefix: string): string {
  if (!prefix) return text
  const opening = ENVELOPE_OPENING.exec(text)
  return opening ? opening[0] + prefix + text.slice(opening[0].length) : prefix + text
}

function storedName(sha256: string, uuid: string, fileName: string): string {
  return `${sha256.slice(0, 8)}-${uuid.slice(0, 8)}-${sanitizePeerFileName(fileName)}`
}

/** `Our`: copia un archivo local al spool y describe la copia. */
export async function stageLocalPeerFile(source: string, deps: Pick<PeerFileDeps, 'spoolDir' | 'randomUUID'>): Promise<PeerFileAttachment> {
  const bytes = await readPeerFileBounded(source, MAX_TRANSFER_BYTES)
  if (bytes === null) throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(SOURCE_UNREADABLE_REASON, 'peer file transfer: source unreadable or over the size limit')
  const sha256 = sha256Hex(bytes)
  const spool = deps.spoolDir()
  await mkdir(spool, { recursive: true, mode: PRIVATE_DIR_MODE })
  const fileName = basename(source)
  const path = join(spool, storedName(sha256, deps.randomUUID(), fileName))
  await writeFile(path, bytes, { mode: PRIVATE_FILE_MODE })
  return { path, file_name: fileName, file_size: bytes.length, sha256, media_type: mediaTypeFor(fileName) }
}

/** `Hur`: retira del spool las copias vencidas, hasta doscientas por pasada. */
export async function sweepStaleSpoolEntries(deps: Pick<PeerFileDeps, 'spoolDir'>): Promise<void> {
  const spool = deps.spoolDir()
  try {
    const entries = await readdir(spool)
    const cutoff = Date.now() - SPOOL_TTL_MS
    for (const entry of entries.slice(0, SWEEP_LIMIT)) {
      const path = join(spool, entry)
      try {
        const info = await stat(path)
        if (info.isFile() && info.mtimeMs < cutoff) await unlink(path)
      } catch {}
    }
  } catch {}
}

/** `V`/`Z`: el esquema de la lista; un elemento inválido invalida la lista entera. */
function parseAttachments(value: unknown): { ok: true; data: PeerFileAttachment[] } | { ok: false; message: string } {
  if (!Array.isArray(value)) return { ok: false, message: 'expected an array' }
  const data: PeerFileAttachment[] = []
  for (const [index, item] of value.entries()) {
    const problem = attachmentProblem(item)
    if (problem !== undefined) return { ok: false, message: `[${index}] ${problem}` }
    const { path, file_name, file_size, sha256, media_type } = item as PeerFileAttachment
    data.push(media_type === undefined ? { path, file_name, file_size, sha256 } : { path, file_name, file_size, sha256, media_type })
  }
  return { ok: true, data }
}

function attachmentProblem(item: unknown): string | undefined {
  if (typeof item !== 'object' || item === null) return 'expected an object'
  const record = item as Record<string, unknown>
  for (const key of ['path', 'file_name', 'sha256'] as const) {
    if (typeof record[key] !== 'string') return `${key}: expected a string`
  }
  if (typeof record.file_size !== 'number' || !Number.isInteger(record.file_size) || record.file_size < 0) return 'file_size: expected a non-negative integer'
  if (!SHA256_HEX.test(record.sha256 as string)) return 'sha256: invalid format'
  if (record.media_type !== undefined && typeof record.media_type !== 'string') return 'media_type: expected a string'
  return undefined
}

function isRejectedPath(path: string, deps: PeerFileDeps): boolean {
  return isUncLikePath(path) || deps.isUnsafeTransferPath(path)
}

/** `o4o`: lleva los adjuntos del spool a los uploads de la sesión y compone el prefijo del mensaje. */
export async function materializeLocalPeerFiles(value: unknown, deps: PeerFileDeps): Promise<MaterializeResult> {
  const parsed = parseAttachments(value)
  if (!parsed.ok || parsed.data.length === 0) {
    if (!parsed.ok) logTransfer(deps, `ignoring malformed file_attachments: ${parsed.message}`)
    return { prefix: '', received: 0, verified: 0 }
  }
  const notes: string[] = []
  let attachments = parsed.data
  if (attachments.length > MAX_FILES_PER_MESSAGE) {
    notes.push(peerFileCountCapNote(attachments.length - MAX_FILES_PER_MESSAGE))
    attachments = attachments.slice(0, MAX_FILES_PER_MESSAGE)
  }
  const uploads = deps.uploadsDir()
  const spool = deps.spoolDir()
  let uploadsReady = false
  const references: string[] = []
  let verified = 0
  for (const attachment of attachments) {
    const reject = (reason: string) => {
      logTransfer(deps, `${attachment.file_name}: ${reason}`)
      notes.push(peerFileFailureNote(attachment.file_name, reason))
    }
    if (isRejectedPath(attachment.path, deps) || !isAbsolute(attachment.path)) {
      reject('invalid transfer path')
      continue
    }
    const resolved = resolve(attachment.path)
    const parent = dirname(resolved)
    if (isRejectedPath(resolved, deps) || basename(parent) !== TRANSFER_SPOOL_DIR_NAME) {
      reject('transfer path is outside the file-transfer spool')
      continue
    }
    try {
      if (!(await lstat(parent)).isDirectory() || !(await lstat(resolved)).isFile()) {
        reject('the transfer copy is not a regular file')
        continue
      }
    } catch {
      reject(EXPIRED_REASON)
      continue
    }
    const bytes = await readPeerFileBounded(resolved, MAX_TRANSFER_BYTES)
    if (bytes === null) {
      reject(EXPIRED_REASON)
      continue
    }
    if (!verifyPeerFileIntegrity(bytes, attachment)) {
      reject('it failed integrity verification')
      continue
    }
    const target = join(uploads, storedName(attachment.sha256, deps.randomUUID(), attachment.file_name))
    try {
      if (!uploadsReady) {
        await mkdir(uploads, { recursive: true, mode: PRIVATE_DIR_MODE })
        uploadsReady = true
      }
      await writeFile(target, bytes, { mode: PRIVATE_FILE_MODE, flag: 'wx' })
    } catch (error) {
      reject('it could not be written to the uploads directory')
      logTransfer(deps, `write ${target} failed: ${error}`)
      continue
    }
    verified++
    references.push(`@"${target}"`)
    if (parent === spool) unlink(resolved).catch(() => {})
  }
  const parts = [...references, ...notes]
  return { prefix: parts.length > 0 ? `${parts.join(' ')} ` : '', received: attachments.length, verified }
}

export interface MessagingFlagReaders {
  env: Record<string, string | undefined>
  platform: string
  flag: (name: string, fallback: boolean) => boolean
}

const processMessagingFlagReaders = (): MessagingFlagReaders => ({
  env: process.env,
  platform: getPlatform(),
  flag: (name, fallback) => getFeatureValue_CACHED_MAY_BE_STALE(name, fallback),
})

/** `Ws`: si la mensajería entre sesiones está activa; `THYROX_CODE_HARBOR_KITE` manda sobre las banderas. */
export function isSessionMessagingEnabled(readers: MessagingFlagReaders = processMessagingFlagReaders()): boolean {
  const declared = readers.env.THYROX_CODE_HARBOR_KITE
  if (declared !== undefined) return isEnvTruthy(declared)
  if (readers.platform === 'windows' && !readers.flag('tengu_harbor_kite_win', true)) return false
  return readers.flag('tengu_harbor_kite', true)
}

/** `nlt`: la transferencia de archivos exige la mensajería y su propia bandera, apagada por defecto. */
export function isPeerFileTransferEnabled(readers: MessagingFlagReaders = processMessagingFlagReaders()): boolean {
  return isSessionMessagingEnabled(readers) && readers.flag('tengu_send_file', false)
}
