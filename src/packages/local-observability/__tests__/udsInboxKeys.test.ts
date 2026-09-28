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
  publishInboxKey,
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
