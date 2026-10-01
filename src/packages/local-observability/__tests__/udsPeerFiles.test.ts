/**
 * Los adjuntos que un par manda por el buzón: la copia en el spool de
 * transferencia, su materialización en los uploads de la sesión que recibe,
 * y la bandera que activa la transferencia. `chunk-xqnw10c4.js` entero
 * (exportado por `chunk-yrfq0b3e.js`) y `nlt`/`Ws` de 2.1.283.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  MAX_FILES_PER_MESSAGE,
  MAX_TRANSFER_BYTES,
  SOURCE_UNREADABLE_REASON,
  TRANSFER_SPOOL_DIR_NAME,
  emitPeerFileReceiveTelemetry,
  injectPeerFilePrefix,
  isPeerFileTransferEnabled,
  isSessionMessagingEnabled,
  materializeLocalPeerFiles,
  mediaTypeFor,
  peerFileCountCapNote,
  peerFileFailureNote,
  readPeerFileBounded,
  sanitizePeerFileName,
  stageLocalPeerFile,
  sweepStaleSpoolEntries,
  verifyPeerFileIntegrity,
  type PeerFileDeps,
} from '../src/uds/peerFiles.ts'

const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex')

let root: string
let deps: PeerFileDeps
let logs: string[]
let uuids: number

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'peer-files-'))
  logs = []
  uuids = 0
  deps = {
    spoolDir: () => join(root, 'home', TRANSFER_SPOOL_DIR_NAME),
    uploadsDir: () => join(root, 'uploads', 'sess'),
    isUnsafeTransferPath: path => path.startsWith('/net/'),
    randomUUID: () => `${String(++uuids).padStart(8, '0')}-0000-0000-0000-000000000000`,
    log: message => logs.push(message),
  }
})

afterEach(() => rmSync(root, { recursive: true, force: true }))

describe('nombres y notas', () => {
  test('sanitizePeerFileName (DEt): basename, caracteres fuera de [A-Za-z0-9._-] a guion bajo, 200 como máximo', () => {
    expect(sanitizePeerFileName('/a/b/mi archivo?.txt')).toBe('mi_archivo_.txt')
    expect(sanitizePeerFileName('')).toBe('attachment')
    expect(sanitizePeerFileName('.bashrc')).toBe('.bashrc')
    const long = sanitizePeerFileName(`${'x'.repeat(300)}.pdf`)
    expect(long).toBe(`${'x'.repeat(196)}.pdf`)
    const longExtension = sanitizePeerFileName(`a.${'e'.repeat(300)}`)
    expect(longExtension).toBe(`a.${'e'.repeat(198)}`)
  })

  test('peerFileFailureNote (cYt) y peerFileCountCapNote (dYt)', () => {
    expect(peerFileFailureNote('a b.txt', 'razón')).toBe('[SendFile: "a_b.txt" was not delivered — razón]')
    expect(peerFileCountCapNote(3)).toBe(`[SendFile: 3 additional attachment(s) were dropped — max ${MAX_FILES_PER_MESSAGE} per message]`)
  })

  test('verifyPeerFileIntegrity (uYt): el tamaño cuando es número y el sha256', () => {
    const bytes = Buffer.from('hola')
    expect(verifyPeerFileIntegrity(bytes, { file_size: 4, sha256: sha(bytes) })).toBe(true)
    expect(verifyPeerFileIntegrity(bytes, { file_size: 5, sha256: sha(bytes) })).toBe(false)
    expect(verifyPeerFileIntegrity(bytes, { sha256: sha('otra') })).toBe(false)
    expect(verifyPeerFileIntegrity(bytes, { sha256: sha(bytes) })).toBe(true)
  })

  test('mediaTypeFor (met): por extensión en minúsculas', () => {
    expect(mediaTypeFor('A.PNG')).toBe('image/png')
    expect(mediaTypeFor('x.docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    expect(mediaTypeFor('x.exe')).toBeUndefined()
  })

  test('injectPeerFilePrefix (vxn): tras la apertura del sobre, o al principio', () => {
    expect(injectPeerFilePrefix('hola', '')).toBe('hola')
    expect(injectPeerFilePrefix('hola', 'P ')).toBe('P hola')
    expect(injectPeerFilePrefix('<cross-session-message from="x">\nhola', 'P ')).toBe('<cross-session-message from="x">\nP hola')
  })
})

describe('readPeerFileBounded (sze)', () => {
  test('lee hasta el límite y rehúsa lo que lo excede, lo que no es archivo o no existe', async () => {
    const file = join(root, 'f')
    writeFileSync(file, 'abcd')
    expect((await readPeerFileBounded(file, 4))?.toString()).toBe('abcd')
    expect(await readPeerFileBounded(file, 3)).toBeNull()
    expect(await readPeerFileBounded(root, 100)).toBeNull()
    expect(await readPeerFileBounded(join(root, 'nada'), 100)).toBeNull()
  })
})

describe('spool de transferencia', () => {
  test('stageLocalPeerFile (Our) copia al spool con modo 0600 y describe la copia', async () => {
    const source = join(root, 'informe final.pdf')
    writeFileSync(source, 'pdf')
    const staged = await stageLocalPeerFile(source, deps)
    expect(staged).toEqual({
      path: join(deps.spoolDir(), `${sha('pdf').slice(0, 8)}-00000001-informe_final.pdf`),
      file_name: 'informe final.pdf',
      file_size: 3,
      sha256: sha('pdf'),
      media_type: 'application/pdf',
    })
    expect(statSync(staged.path).mode & 0o777).toBe(0o600)
    expect(statSync(deps.spoolDir()).mode & 0o777).toBe(0o700)
  })

  test('stageLocalPeerFile rehúsa una fuente ilegible con el mensaje de la referencia', async () => {
    await expect(stageLocalPeerFile(join(root, 'nada'), deps)).rejects.toThrow(SOURCE_UNREADABLE_REASON)
    expect(SOURCE_UNREADABLE_REASON).toBe(`could not be read, is not a regular file, or exceeds the ${MAX_TRANSFER_BYTES / 1048576} MiB transfer limit`)
  })

  test('sweepStaleSpoolEntries (Hur) retira las copias de más de un día', async () => {
    mkdirSync(deps.spoolDir(), { recursive: true })
    const old = join(deps.spoolDir(), 'old')
    const fresh = join(deps.spoolDir(), 'fresh')
    writeFileSync(old, 'o')
    writeFileSync(fresh, 'f')
    const twoDaysAgo = (Date.now() - 2 * 86400000) / 1000
    utimesSync(old, twoDaysAgo, twoDaysAgo)
    await sweepStaleSpoolEntries(deps)
    expect(existsSync(old)).toBe(false)
    expect(existsSync(fresh)).toBe(true)
    rmSync(deps.spoolDir(), { recursive: true })
    await sweepStaleSpoolEntries(deps)
  })
})

describe('materializeLocalPeerFiles (o4o)', () => {
  async function staged(name: string, content = 'contenido') {
    const source = join(root, name)
    writeFileSync(source, content)
    return stageLocalPeerFile(source, deps)
  }

  test('copia al directorio de uploads, lo referencia y retira la copia del spool', async () => {
    const attachment = await staged('a.txt')
    const result = await materializeLocalPeerFiles([attachment], deps)
    const target = join(deps.uploadsDir(), `${attachment.sha256.slice(0, 8)}-00000002-a.txt`)
    expect(result).toEqual({ prefix: `@"${target}" `, received: 1, verified: 1 })
    expect(readFileSync(target, 'utf8')).toBe('contenido')
    expect(statSync(target).mode & 0o777).toBe(0o600)
    await Bun.sleep(5)
    expect(existsSync(attachment.path)).toBe(false)
  })

  test('una lista mal formada o vacía no entrega nada; la mal formada se registra', async () => {
    expect(await materializeLocalPeerFiles([{ path: 'x' }], deps)).toEqual({ prefix: '', received: 0, verified: 0 })
    expect(logs.some(line => line.startsWith('[peer-file-transfer] ignoring malformed file_attachments:'))).toBe(true)
    expect(await materializeLocalPeerFiles([], deps)).toEqual({ prefix: '', received: 0, verified: 0 })
    expect(await materializeLocalPeerFiles([{ path: '/a', file_name: 'a', file_size: 1, sha256: 'z'.repeat(64) }], deps)).toEqual({ prefix: '', received: 0, verified: 0 })
    expect(await materializeLocalPeerFiles([{ path: '/a', file_name: 'a', file_size: 1.5, sha256: 'a'.repeat(64) }], deps)).toEqual({ prefix: '', received: 0, verified: 0 })
  })

  test('más de dieciséis se recortan con su nota', async () => {
    const one = { path: 'relativa', file_name: 'r', file_size: 1, sha256: 'a'.repeat(64) }
    const result = await materializeLocalPeerFiles(Array.from({ length: 18 }, () => one), deps)
    expect(result.received).toBe(16)
    expect(result.prefix.startsWith(peerFileCountCapNote(2))).toBe(true)
  })

  test('cada rechazo deja su nota', async () => {
    const base = { file_name: 'n.txt', file_size: 1, sha256: sha('x') }
    const note = (reason: string) => peerFileFailureNote('n.txt', reason)
    const run = async (attachment: object) => (await materializeLocalPeerFiles([attachment], deps)).prefix
    expect(await run({ ...base, path: 'relativa' })).toBe(`${note('invalid transfer path')} `)
    expect(await run({ ...base, path: '/net/x' })).toBe(`${note('invalid transfer path')} `)
    expect(await run({ ...base, path: '//server/share/x' })).toBe(`${note('invalid transfer path')} `)
    expect(await run({ ...base, path: join(root, 'x') })).toBe(`${note('transfer path is outside the file-transfer spool')} `)
    expect(await run({ ...base, path: join(deps.spoolDir(), 'nada') })).toBe(`${note('the transfer copy could not be read (it may have expired)')} `)
    mkdirSync(deps.spoolDir(), { recursive: true })
    symlinkSync(join(root, 'x'), join(deps.spoolDir(), 'enlace'))
    expect(await run({ ...base, path: join(deps.spoolDir(), 'enlace') })).toBe(`${note('the transfer copy is not a regular file')} `)
    const good = await staged('n.txt', 'x')
    expect(await run({ ...good, sha256: sha('otra') })).toBe(`${note('it failed integrity verification')} `)
  })

  test('un fallo al escribir en uploads deja su nota y no cuenta como verificado', async () => {
    const attachment = await staged('b.txt')
    mkdirSync(join(root, 'uploads'), { recursive: true })
    writeFileSync(deps.uploadsDir(), 'no soy un directorio')
    const result = await materializeLocalPeerFiles([attachment], deps)
    expect(result).toEqual({ prefix: `${peerFileFailureNote('b.txt', 'it could not be written to the uploads directory')} `, received: 1, verified: 0 })
    expect(existsSync(attachment.path)).toBe(true)
  })

  test('no pisa un archivo que ya está en uploads con el mismo nombre', async () => {
    const attachment = await staged('c.txt')
    const target = join(deps.uploadsDir(), `${attachment.sha256.slice(0, 8)}-00000002-c.txt`)
    mkdirSync(deps.uploadsDir(), { recursive: true })
    writeFileSync(target, 'previo')
    const result = await materializeLocalPeerFiles([attachment], deps)
    expect(result.verified).toBe(0)
    expect(readFileSync(target, 'utf8')).toBe('previo')
  })
})

describe('telemetría y bandera', () => {
  test('emitPeerFileReceiveTelemetry (wxn): el evento y ok, sad o bad', () => {
    const events: Array<[string, Record<string, unknown>]> = []
    const sink = (name: string, metadata: Record<string, unknown>) => events.push([name, metadata])
    emitPeerFileReceiveTelemetry('uds', 2, 2, sink)
    emitPeerFileReceiveTelemetry('uds', 2, 1, sink)
    emitPeerFileReceiveTelemetry('bridge', 2, 0, sink)
    expect(events).toEqual([
      ['tengu_send_file_received', { transport: 'uds', file_count: 2, verified_count: 2 }],
      ['tengu_feature_ok', { feature_name: 'peer_file_receive' }],
      ['tengu_send_file_received', { transport: 'uds', file_count: 2, verified_count: 1 }],
      ['tengu_feature_sad', { feature_name: 'peer_file_receive', error_code: 'partial_failed' }],
      ['tengu_send_file_received', { transport: 'bridge', file_count: 2, verified_count: 0 }],
      ['tengu_feature_bad', { feature_name: 'peer_file_receive', error_code: 'all_failed' }],
    ])
  })

  test('isSessionMessagingEnabled (Ws): THYROX_CODE_HARBOR_KITE manda; si no, las banderas', () => {
    const flags = (values: Record<string, boolean>) => (name: string, fallback: boolean) => values[name] ?? fallback
    expect(isSessionMessagingEnabled({ env: { THYROX_CODE_HARBOR_KITE: '1' }, platform: 'linux', flag: flags({ tengu_harbor_kite: false }) })).toBe(true)
    expect(isSessionMessagingEnabled({ env: { THYROX_CODE_HARBOR_KITE: '0' }, platform: 'linux', flag: flags({}) })).toBe(false)
    expect(isSessionMessagingEnabled({ env: {}, platform: 'linux', flag: flags({}) })).toBe(true)
    expect(isSessionMessagingEnabled({ env: {}, platform: 'linux', flag: flags({ tengu_harbor_kite: false }) })).toBe(false)
    expect(isSessionMessagingEnabled({ env: {}, platform: 'windows', flag: flags({ tengu_harbor_kite_win: false }) })).toBe(false)
    expect(isSessionMessagingEnabled({ env: {}, platform: 'linux', flag: flags({ tengu_harbor_kite_win: false }) })).toBe(true)
  })

  test('isPeerFileTransferEnabled (nlt): mensajería y tengu_send_file, que por defecto está apagada', () => {
    const flags = (values: Record<string, boolean>) => (name: string, fallback: boolean) => values[name] ?? fallback
    expect(isPeerFileTransferEnabled({ env: {}, platform: 'linux', flag: flags({}) })).toBe(false)
    expect(isPeerFileTransferEnabled({ env: {}, platform: 'linux', flag: flags({ tengu_send_file: true }) })).toBe(true)
    expect(isPeerFileTransferEnabled({ env: { THYROX_CODE_HARBOR_KITE: 'false' }, platform: 'linux', flag: flags({ tengu_send_file: true }) })).toBe(false)
  })
})
