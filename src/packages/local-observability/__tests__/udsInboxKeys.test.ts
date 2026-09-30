/**
 * La clave publicada del buzón: `XDo`, `be`, `ifn`, `JDo` y `QDo`
 * (`chunk-5mcqvwzx.js`) de 2.1.283, en la rama de archivos locales (`N()`
 * falso: sin backend de storage).
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { inboxKeyFileName } from '../src/uds/inboxAuth.ts'
import {
  type InboxKeyDeps,
  listSessionKeyNames,
  paginateStorage,
  publishInboxKey,
  type SessionKeyStorage,
  readKeyPidDomain,
  readPeerToken,
  removeInboxKey,
  sweepStaleKeyTemps,
} from '../src/uds/inboxKeys.ts'

const TOKEN = 'a'.repeat(32)
const OTHER = 'b'.repeat(32)
const ADDRESS = '/run/cc-socks/42.sock'

let root: string
let sessionsDir: string
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'uds-keys-'))
  sessionsDir = join(root, 'sessions')
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

function deps(overrides: Partial<InboxKeyDeps> = {}): InboxKeyDeps {
  return {
    sessionsDir: () => sessionsDir,
    storageBackendActive: () => false,
    pid: 4242,
    ownStartToken: async () => '1000',
    ownPidDomain: async () => 'linux:m:ns',
    isProcessGone: () => false,
    startTokenOf: async () => '1000',
    ...overrides,
  }
}

function keyFile(pid: number, record: Record<string, unknown>): string {
  mkdirSync(sessionsDir, { recursive: true })
  const path = join(sessionsDir, inboxKeyFileName(pid, ADDRESS))
  writeFileSync(path, JSON.stringify(record))
  return path
}

describe('publishInboxKey (XDo)', () => {
  test('crea el directorio de sesiones 0700 y la clave 0600 con token, inicio y dominio', async () => {
    const path = await publishInboxKey(ADDRESS, TOKEN, { sweepPermitted: false }, deps())
    expect(path).toBe(join(sessionsDir, inboxKeyFileName(4242, ADDRESS)))
    expect(statSync(sessionsDir).mode & 0o777).toBe(0o700)
    expect(lstatSync(path).mode & 0o777).toBe(0o600)
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({ peerToken: TOKEN, procStart: '1000', pidDomain: 'linux:m:ns' })
  })

  test('sin token de inicio legible la clave no lleva procStart', async () => {
    const path = await publishInboxKey(ADDRESS, TOKEN, { sweepPermitted: false }, deps({ ownStartToken: async () => undefined }))
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({ peerToken: TOKEN, pidDomain: 'linux:m:ns' })
  })

  test('reemplaza una clave anterior del mismo pid y dirección', async () => {
    const old = keyFile(4242, { peerToken: OTHER })
    await publishInboxKey(ADDRESS, TOKEN, { sweepPermitted: false }, deps())
    expect(JSON.parse(readFileSync(old, 'utf8')).peerToken).toBe(TOKEN)
  })

  test('rehúsa una dirección sin forma canónica', async () => {
    await expect(publishInboxKey('/a/../b.sock', TOKEN, { sweepPermitted: false }, deps())).rejects.toThrow(/non-canonical socket path/)
  })

  test('con barrido permitido retira los temporales de un escritor muerto antes de publicar', async () => {
    mkdirSync(sessionsDir, { recursive: true })
    const stale = join(sessionsDir, `${inboxKeyFileName(7, ADDRESS)}.tmp.deadbeef`)
    writeFileSync(stale, '{}')
    await publishInboxKey(ADDRESS, TOKEN, { sweepPermitted: true }, deps({ isProcessGone: pid => pid === 7 }))
    expect(existsSync(stale)).toBe(false)
  })
})

describe('sweepStaleKeyTemps (be) y readKeyPidDomain (ifn)', () => {
  test('sin permiso no toca nada', async () => {
    mkdirSync(sessionsDir, { recursive: true })
    const stale = join(sessionsDir, `${inboxKeyFileName(7, ADDRESS)}.tmp.deadbeef`)
    writeFileSync(stale, '{}')
    await sweepStaleKeyTemps(sessionsDir, false, deps({ isProcessGone: () => true }))
    expect(existsSync(stale)).toBe(true)
  })

  test('conserva el temporal de un escritor vivo', async () => {
    mkdirSync(sessionsDir, { recursive: true })
    const live = join(sessionsDir, `${inboxKeyFileName(7, ADDRESS)}.tmp.deadbeef`)
    writeFileSync(live, '{}')
    await sweepStaleKeyTemps(sessionsDir, true, deps({ isProcessGone: () => false }))
    expect(existsSync(live)).toBe(true)
  })

  test('conserva el temporal de un escritor muerto de OTRO dominio de pids', async () => {
    mkdirSync(sessionsDir, { recursive: true })
    const foreign = join(sessionsDir, `${inboxKeyFileName(7, ADDRESS)}.tmp.deadbeef`)
    writeFileSync(foreign, JSON.stringify({ peerToken: TOKEN, pidDomain: 'linux:otra:ns' }))
    await sweepStaleKeyTemps(sessionsDir, true, deps({ isProcessGone: () => true }))
    expect(existsSync(foreign)).toBe(true)
  })

  test('retira el temporal de un escritor muerto del mismo dominio, y no toca claves publicadas', async () => {
    const published = keyFile(7, { peerToken: TOKEN })
    const mine = join(sessionsDir, `${inboxKeyFileName(7, ADDRESS)}.tmp.deadbeef`)
    writeFileSync(mine, JSON.stringify({ peerToken: TOKEN, pidDomain: 'linux:m:ns' }))
    await sweepStaleKeyTemps(sessionsDir, true, deps({ isProcessGone: () => true }))
    expect(existsSync(mine)).toBe(false)
    expect(existsSync(published)).toBe(true)
  })

  test('un directorio ausente no falla', async () => {
    await sweepStaleKeyTemps(join(root, 'nada'), true, deps())
  })

  test('readKeyPidDomain lee el dominio sólo de un registro válido', async () => {
    mkdirSync(sessionsDir, { recursive: true })
    const good = join(sessionsDir, 'g')
    writeFileSync(good, JSON.stringify({ peerToken: TOKEN, pidDomain: 'd' }))
    const badToken = join(sessionsDir, 'b')
    writeFileSync(badToken, JSON.stringify({ peerToken: 'XYZ', pidDomain: 'd' }))
    const big = join(sessionsDir, 'big')
    writeFileSync(big, JSON.stringify({ peerToken: TOKEN, pidDomain: 'd', pad: 'x'.repeat(5000) }))
    expect(await readKeyPidDomain(good)).toBe('d')
    expect(await readKeyPidDomain(badToken)).toBeUndefined()
    expect(await readKeyPidDomain(big)).toBeUndefined()
    expect(await readKeyPidDomain(join(sessionsDir, 'ausente'))).toBeUndefined()
  })
})

describe('removeInboxKey (JDo)', () => {
  test('borra la clave y tolera que ya no exista', async () => {
    const path = keyFile(4242, { peerToken: TOKEN })
    await removeInboxKey(path)
    expect(existsSync(path)).toBe(false)
    await removeInboxKey(path)
  })
})

describe('readPeerToken (QDo)', () => {
  test('sin directorio de sesiones: no-key', async () => {
    expect(await readPeerToken(ADDRESS, undefined, deps())).toEqual({ kind: 'no-key' })
  })

  test('una dirección sin forma canónica: no-key', async () => {
    keyFile(9, { peerToken: TOKEN })
    expect(await readPeerToken('/a/../b.sock', undefined, deps())).toEqual({ kind: 'no-key' })
  })

  test('sin clave para esa dirección: no-key', async () => {
    mkdirSync(sessionsDir, { recursive: true })
    writeFileSync(join(sessionsDir, inboxKeyFileName(9, '/otra.sock')), JSON.stringify({ peerToken: TOKEN }))
    expect(await readPeerToken(ADDRESS, undefined, deps())).toEqual({ kind: 'no-key' })
  })

  test('una sola clave: su token', async () => {
    keyFile(9, { peerToken: TOKEN })
    expect(await readPeerToken(ADDRESS, undefined, deps())).toEqual({ kind: 'token', token: TOKEN })
  })

  test('una sola clave ilegible: unusable', async () => {
    keyFile(9, { peerToken: 'no-hex' })
    expect(await readPeerToken(ADDRESS, undefined, deps())).toEqual({ kind: 'unusable' })
  })

  test('una sola clave cuyo dueño murió, exigiendo dueño vivo: dead-owner', async () => {
    keyFile(9, { peerToken: TOKEN })
    expect(await readPeerToken(ADDRESS, { requireLiveOwner: true }, deps({ isProcessGone: () => true }))).toEqual({ kind: 'dead-owner' })
  })

  test('una sola clave cuyo pid se recicló (otro inicio), exigiendo dueño vivo: dead-owner', async () => {
    keyFile(9, { peerToken: TOKEN, procStart: '1000' })
    expect(await readPeerToken(ADDRESS, { requireLiveOwner: true }, deps({ startTokenOf: async () => '2000' }))).toEqual({ kind: 'dead-owner' })
  })

  test('sin exigir dueño vivo, una clave de dueño muerto sigue dando su token', async () => {
    keyFile(9, { peerToken: TOKEN })
    expect(await readPeerToken(ADDRESS, undefined, deps({ isProcessGone: () => true }))).toEqual({ kind: 'token', token: TOKEN })
  })

  test('varias claves: gana la de dueño vivo con el mismo inicio, luego la de inicio desconocido', async () => {
    keyFile(10, { peerToken: 'c'.repeat(32), procStart: '1' })
    keyFile(11, { peerToken: OTHER })
    keyFile(12, { peerToken: TOKEN, procStart: '5' })
    const startTokenOf = async (pid: number) => ({ 10: '999', 12: '5' })[pid as 10 | 12]
    expect(await readPeerToken(ADDRESS, undefined, deps({ startTokenOf }))).toEqual({ kind: 'token', token: TOKEN })
    rmSync(join(sessionsDir, inboxKeyFileName(12, ADDRESS)))
    expect(await readPeerToken(ADDRESS, undefined, deps({ startTokenOf }))).toEqual({ kind: 'token', token: OTHER })
  })

  test('varias claves, todas de dueños muertos, exigiendo dueño vivo: dead-owner', async () => {
    keyFile(10, { peerToken: TOKEN })
    keyFile(11, { peerToken: OTHER })
    expect(await readPeerToken(ADDRESS, { requireLiveOwner: true }, deps({ isProcessGone: () => true }))).toEqual({ kind: 'dead-owner' })
  })

  test('varias claves ilegibles: unusable', async () => {
    keyFile(10, { peerToken: 'x' })
    keyFile(11, { other: 1 })
    expect(await readPeerToken(ADDRESS, undefined, deps())).toEqual({ kind: 'unusable' })
  })

  test('un nombre con el sufijo de la dirección pero sin pid numérico no cuenta como clave', async () => {
    mkdirSync(sessionsDir, { recursive: true })
    writeFileSync(join(sessionsDir, inboxKeyFileName(9, ADDRESS).replace(/^9/, 'x')), JSON.stringify({ peerToken: TOKEN }))
    expect(await readPeerToken(ADDRESS, undefined, deps())).toEqual({ kind: 'no-key' })
  })

  test('los temporales y archivos ajenos del directorio no cuentan como clave', async () => {
    mkdirSync(sessionsDir, { recursive: true })
    writeFileSync(join(sessionsDir, `${inboxKeyFileName(9, ADDRESS)}.tmp.deadbeef`), JSON.stringify({ peerToken: TOKEN }))
    expect(readdirSync(sessionsDir)).toHaveLength(1)
    expect(await readPeerToken(ADDRESS, undefined, deps())).toEqual({ kind: 'no-key' })
  })
})

type StorageCall = { op: string; args: unknown[] }

/** Un storage en memoria con la forma de resultados de la referencia. */
function memoryStorage(overrides: Partial<SessionKeyStorage> = {}, pageSize = 2) {
  const files = new Map<string, string>()
  const calls: StorageCall[] = []
  const storage: SessionKeyStorage = {
    async ensureScope(scope) {
      calls.push({ op: 'ensureScope', args: [scope] })
      return { ok: true, value: undefined }
    },
    async write(key, text, options) {
      calls.push({ op: 'write', args: [key, text, options] })
      files.set(key.file, text)
      return { ok: true, value: undefined }
    },
    async delete(key) {
      calls.push({ op: 'delete', args: [key] })
      files.delete(key.file)
    },
    async listEntries(scope, page) {
      calls.push({ op: 'listEntries', args: [scope, page] })
      const names = [...files.keys()].sort()
      const start = page.cursor === undefined ? 0 : Number(page.cursor)
      const slice = names.slice(start, start + pageSize)
      const next = start + pageSize < names.length ? String(start + pageSize) : undefined
      return { ok: true, value: { items: slice.map(file => ({ kind: 'key', key: { namespace: 'session', file } })), cursor: next } }
    },
    async readText(requests) {
      calls.push({ op: 'readText', args: [requests] })
      return {
        ok: true,
        value: {
          items: requests.map(({ key }) => {
            const text = files.get(key.file)
            return text === undefined ? { found: false, totalBytes: 0, value: '' } : { found: true, totalBytes: Buffer.byteLength(text), value: text }
          }),
        },
      }
    },
    ...overrides,
  }
  return { storage, files, calls }
}

describe('rama de storage: ye, JDo con N(), J4n y Ee', () => {
  const active = (overrides: Partial<InboxKeyDeps> = {}) => deps({ storageBackendActive: () => true, ...overrides })

  test('publica por el storage: asegura el ámbito, borra la anterior y escribe atómica con modo exacto 0600', async () => {
    const { storage, files, calls } = memoryStorage()
    const path = await publishInboxKey(ADDRESS, TOKEN, { sweepPermitted: true, storage }, active())
    const name = inboxKeyFileName(4242, ADDRESS)
    expect(path).toBe(join(sessionsDir, name))
    expect(existsSync(sessionsDir)).toBe(false)
    expect(calls.map(call => call.op)).toEqual(['ensureScope', 'delete', 'write'])
    expect(calls[0]!.args[0]).toEqual({ namespace: 'session' })
    expect(calls[2]!.args[0]).toEqual({ namespace: 'session', file: name })
    expect(calls[2]!.args[2]).toEqual({ publishDiscipline: 'atomic', mode: 0o600, exactMode: 0o600 })
    expect(JSON.parse(files.get(name)!)).toEqual({ peerToken: TOKEN, procStart: '1000', pidDomain: 'linux:m:ns' })
  })

  test('un storage presente con el backend inactivo usa archivos locales', async () => {
    const { storage, calls } = memoryStorage()
    const path = await publishInboxKey(ADDRESS, TOKEN, { sweepPermitted: false, storage }, deps())
    expect(calls).toEqual([])
    expect(existsSync(path)).toBe(true)
  })

  test('sin ámbito o sin escritura, la publicación falla con el mensaje de la referencia; un delete que falla no', async () => {
    const noScope = memoryStorage({ ensureScope: async () => ({ ok: false, error: { code: 'EUNAVAIL', cause: new Error('down') } }) })
    await expect(publishInboxKey(ADDRESS, TOKEN, { sweepPermitted: false, storage: noScope.storage }, active())).rejects.toThrow(
      'messaging key folder could not be made through storage',
    )
    const noWrite = memoryStorage({ write: async () => ({ ok: false, error: { code: 'EIO' } }) })
    await expect(publishInboxKey(ADDRESS, TOKEN, { sweepPermitted: false, storage: noWrite.storage }, active())).rejects.toThrow(
      'messaging key could not be published through storage',
    )
    const badDelete = memoryStorage({ delete: async () => { throw new Error('x') } })
    await publishInboxKey(ADDRESS, TOKEN, { sweepPermitted: false, storage: badDelete.storage }, active())
    expect(badDelete.files.size).toBe(1)
  })

  test('removeInboxKey por el storage borra por el nombre base y tolera el fallo', async () => {
    const { storage, files, calls } = memoryStorage()
    const path = await publishInboxKey(ADDRESS, TOKEN, { sweepPermitted: false, storage }, active())
    await removeInboxKey(path, storage, active())
    expect(files.size).toBe(0)
    expect(calls.at(-1)).toEqual({ op: 'delete', args: [{ namespace: 'session', file: inboxKeyFileName(4242, ADDRESS) }] })
    await removeInboxKey(path, memoryStorage({ delete: async () => { throw new Error('x') } }).storage, active())
  })

  test('readPeerToken por el storage recorre todas las páginas y lee la clave', async () => {
    const { storage, files } = memoryStorage({}, 1)
    files.set('a', '{}')
    files.set('b', '{}')
    files.set(inboxKeyFileName(9, ADDRESS), JSON.stringify({ peerToken: TOKEN }))
    expect(await readPeerToken(ADDRESS, { storage }, active())).toEqual({ kind: 'token', token: TOKEN })
  })

  test('un listado que falla, o que se corta en el tope de páginas, deja la clave inusable', async () => {
    const failing = memoryStorage({ listEntries: async () => ({ ok: false, error: { code: 'EIO' } }) })
    expect(await readPeerToken(ADDRESS, { storage: failing.storage }, active())).toEqual({ kind: 'unusable' })
    const throwing = memoryStorage({ listEntries: async () => { throw new Error('x') } })
    expect(await readPeerToken(ADDRESS, { storage: throwing.storage }, active())).toEqual({ kind: 'unusable' })
    const endless = memoryStorage({
      listEntries: async () => ({ ok: true, value: { items: [], cursor: 'otra' } }),
    })
    expect(await readPeerToken(ADDRESS, { storage: endless.storage }, active({ storagePageLimit: 3 }))).toEqual({ kind: 'unusable' })
  })

  test('Ee: una clave ausente, demasiado grande o ilegible por el storage es inusable', async () => {
    const name = inboxKeyFileName(9, ADDRESS)
    const big = memoryStorage()
    big.files.set(name, JSON.stringify({ peerToken: TOKEN, pad: 'x'.repeat(5000) }))
    expect(await readPeerToken(ADDRESS, { storage: big.storage }, active())).toEqual({ kind: 'unusable' })
    const missing = memoryStorage({ readText: async () => ({ ok: true, value: { items: [{ found: false, totalBytes: 0, value: '' }] } }) })
    missing.files.set(name, '{}')
    expect(await readPeerToken(ADDRESS, { storage: missing.storage }, active())).toEqual({ kind: 'unusable' })
    const failing = memoryStorage({ readText: async () => ({ ok: false, error: { code: 'EIO' } }) })
    failing.files.set(name, '{}')
    expect(await readPeerToken(ADDRESS, { storage: failing.storage }, active())).toEqual({ kind: 'unusable' })
  })

  test('la lectura por el storage pide un byte más que el tope para detectar el exceso', async () => {
    const { storage, files, calls } = memoryStorage()
    files.set(inboxKeyFileName(9, ADDRESS), JSON.stringify({ peerToken: TOKEN }))
    await readPeerToken(ADDRESS, { storage }, active())
    const read = calls.find(call => call.op === 'readText')!
    expect((read.args[0] as Array<{ offset: number; length: number }>)[0]).toMatchObject({ offset: 0, length: 4097 })
  })
})

describe('paginateStorage (Ks)', () => {
  test('recorre hasta que no hay cursor, se corta en maxPages y propaga el error', async () => {
    const seen: number[] = []
    const pages = [{ items: [1], cursor: 'a' }, { items: [2], cursor: undefined }]
    let index = 0
    expect(await paginateStorage(async () => ({ ok: true, value: pages[index++]! }), items => void seen.push(...items))).toEqual({ status: 'done' })
    expect(seen).toEqual([1, 2])
    expect(await paginateStorage(async () => ({ ok: true, value: { items: [], cursor: 'x' } }), () => {}, { maxPages: 2 })).toEqual({ status: 'capped' })
    const error = { code: 'EIO' }
    expect(await paginateStorage(async () => ({ ok: false, error }), () => {})).toEqual({ status: 'error', error })
  })
})

describe('listSessionKeyNames (J4n)', () => {
  const entry = (file: string, kind = 'key', namespace = 'session') => ({ kind, key: { namespace, file } })
  const listing = (pages: Array<{ items: ReturnType<typeof entry>[]; cursor?: string }>) => {
    let index = 0
    return { listEntries: async () => ({ ok: true as const, value: pages[index++]! }) } as unknown as Parameters<typeof listSessionKeyNames>[0]
  }

  test('junta los nombres de claves del ámbito de sesiones de todas las páginas', async () => {
    const storage = listing([{ items: [entry('1.json'), entry('d', 'dir'), entry('x', 'key', 'other')], cursor: 'c' }, { items: [entry('2.json')] }])
    expect(await listSessionKeyNames(storage)).toEqual(['1.json', '2.json'])
  })

  test('en el tope avisa; devuelve lo visto sólo con partialOnCap', async () => {
    const issues: Array<[string, string | undefined]> = []
    const onIssue = (message: string, level?: string) => void issues.push([message, level])
    const capped = () => listing([{ items: [entry('1.json')], cursor: 'c' }])
    expect(await listSessionKeyNames(capped(), { maxPages: 1, onIssue })).toBeUndefined()
    expect(await listSessionKeyNames(capped(), { maxPages: 1, partialOnCap: true, onIssue })).toEqual(['1.json'])
    expect(issues).toEqual([
      ['truncated at 1 pages; 1 names seen', 'warn'],
      ['truncated at 1 pages; 1 names seen', 'warn'],
    ])
  })

  test('un error o una excepción del listado se avisan y dan undefined', async () => {
    const issues: string[] = []
    const onIssue = (message: string) => void issues.push(message)
    const failing = { listEntries: async () => ({ ok: false, error: { code: 'EIO' } }) } as unknown as Parameters<typeof listSessionKeyNames>[0]
    const throwing = {
      listEntries: async () => {
        throw new Error('down')
      },
    } as unknown as Parameters<typeof listSessionKeyNames>[0]
    expect(await listSessionKeyNames(failing, { onIssue })).toBeUndefined()
    expect(await listSessionKeyNames(throwing, { onIssue })).toBeUndefined()
    expect(issues).toEqual(['failed: EIO', 'failed: down'])
  })
})
