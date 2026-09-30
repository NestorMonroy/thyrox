/**
 * Tokens y marcos de autenticación del buzón: `ofn`, `YDo`, `zFr`, `eLo`,
 * `tLo`, `Iv`, `J`, `Q` (`chunk-5mcqvwzx.js`) y `v0` (`chunk-t0sp7zte.js`) de 2.1.283.
 */
import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'

import {
  AUTH_FRAME_TYPE,
  authFrameLine,
  authRequiredByDefault,
  canonicalSocketAddress,
  createInboxTokens,
  inboxKeyFileName,
  isAuthFrame,
  matchInboxToken,
  timingSafeTokenEquals,
} from '../src/uds/inboxAuth.ts'

describe('authRequiredByDefault (ofn)', () => {
  test('sólo Windows exige la línea de autenticación por defecto', () => {
    expect(authRequiredByDefault('windows')).toBe(true)
    expect(authRequiredByDefault('linux')).toBe(false)
    expect(authRequiredByDefault('macos')).toBe(false)
  })
})

describe('createInboxTokens (YDo)', () => {
  test('dos tokens de 16 bytes en hexadecimal, distintos entre sí y entre llamadas', () => {
    const a = createInboxTokens()
    const b = createInboxTokens()
    expect(a.peerToken).toMatch(/^[0-9a-f]{32}$/)
    expect(a.childToken).toMatch(/^[0-9a-f]{32}$/)
    expect(a.peerToken).not.toBe(a.childToken)
    expect(a.peerToken).not.toBe(b.peerToken)
  })
})

describe('marcos de autenticación (zFr, eLo)', () => {
  test('la línea es un JSON de tipo auth terminado en salto de línea', () => {
    expect(authFrameLine('abc')).toBe('{"type":"auth","token":"abc"}\n')
    expect(AUTH_FRAME_TYPE).toBe('auth')
  })

  test('un objeto de tipo auth es un marco de autenticación; lo demás no', () => {
    expect(isAuthFrame({ type: 'auth', token: 'x' })).toBe(true)
    expect(isAuthFrame({ type: 'user' })).toBe(false)
    expect(isAuthFrame(null)).toBe(false)
    expect(isAuthFrame('auth')).toBe(false)
  })
})

describe('matchInboxToken (tLo) y timingSafeTokenEquals (v0)', () => {
  const tokens = { peerToken: 'a'.repeat(32), childToken: 'b'.repeat(32) }

  test('distingue el token de par del token de hijo', () => {
    expect(matchInboxToken('a'.repeat(32), tokens)).toBe('peer')
    expect(matchInboxToken('b'.repeat(32), tokens)).toBe('child')
    expect(matchInboxToken('c'.repeat(32), tokens)).toBeUndefined()
    expect(matchInboxToken('a'.repeat(32), undefined)).toBeUndefined()
  })

  test('la comparación rechaza longitudes distintas, vacíos y no cadenas', () => {
    expect(timingSafeTokenEquals('abc', 'abc')).toBe(true)
    expect(timingSafeTokenEquals('abc', 'abd')).toBe(false)
    expect(timingSafeTokenEquals('abc', 'abcd')).toBe(false)
    expect(timingSafeTokenEquals('', '')).toBe(false)
    expect(timingSafeTokenEquals(42, '42')).toBe(false)
  })
})

describe('canonicalSocketAddress (Iv) e inboxKeyFileName (J, Q)', () => {
  test('una ruta se resuelve; un pipe se escribe en minúsculas bajo \\\\.\\pipe\\', () => {
    expect(canonicalSocketAddress('/run/./b//1.sock')).toBe('/run/b/1.sock')
    expect(canonicalSocketAddress('/run/a/../b/1.sock')).toBeUndefined()
    expect(canonicalSocketAddress('\\\\?\\pipe\\LOCAL\\Inbox')).toBe('\\\\.\\pipe\\local\\inbox')
  })

  test('una ruta con .. sin resolver en un segmento no tiene forma canónica', () => {
    expect(canonicalSocketAddress('rel/../x.sock')).toBeUndefined()
  })

  test('el archivo de clave lleva el pid y el sha256 de la dirección canónica', () => {
    const digest = createHash('sha256').update('/run/b/1.sock').digest('hex')
    expect(inboxKeyFileName(42, '/run/b/1.sock')).toBe(`42.${digest}.key`)
    expect(() => inboxKeyFileName(42, 'rel/../x.sock')).toThrow('non-canonical socket path')
  })
})
