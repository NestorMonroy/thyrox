// Puerto fiel de `ccnmt: packages/daemon/src/__tests__/peerUid.test.ts`.
import { describe, expect, test } from 'bun:test'
import type { Socket } from 'node:net'

import { checkPeerUid, getPeerUid } from '../peerUid.js'

/**
 * La búsqueda FFI real se ejercita por rutas de integración (un proceso
 * supervisor de verdad atando el socket de control). Aquí se prueba el
 * contrato público:
 * - getPeerUid devuelve null en win32 / handle-sin-fd / sockets no-net
 *   sin lanzar
 * - checkPeerUid devuelve null cuando la verificación no es posible
 *   (coincide con el fall-through best-effort de ant 5163 RFK)
 * - checkPeerUid devuelve null cuando peer == uid propio (ruta de permiso)
 */

function fakeSocket(handle?: { fd?: number }): Socket {
  return { _handle: handle } as unknown as Socket
}

describe('getPeerUid', () => {
  test('returns null when handle is missing', () => {
    expect(getPeerUid(fakeSocket(undefined))).toBeNull()
  })

  test('returns null when fd is not a number', () => {
    expect(getPeerUid(fakeSocket({}))).toBeNull()
  })

  test('returns null when fd is negative (closed socket)', () => {
    expect(getPeerUid(fakeSocket({ fd: -1 }))).toBeNull()
  })

  test('does not throw on platform-unsupported branch', () => {
    expect(() => getPeerUid(fakeSocket({ fd: 99999 }))).not.toThrow()
  })
})

describe('checkPeerUid', () => {
  test('returns null when peer cannot be verified', () => {
    // Sin handle → getPeerUid devuelve null → checkPeerUid devuelve null
    // (permiso best-effort). Es el mismo retorno-null que en Windows,
    // donde la búsqueda de peer-uid no está soportada. Verifica el
    // contrato ant RFK.
    expect(checkPeerUid(fakeSocket(undefined))).toBeNull()
  })

  test('null fd path is treated as "cannot verify, allow"', () => {
    expect(checkPeerUid(fakeSocket({}))).toBeNull()
  })

  test('does not throw even when getuid is unavailable', () => {
    // process.getuid existe en POSIX pero no en Windows. Este test sólo
    // confirma que checkPeerUid es seguro de llamar en cualquier plataforma.
    expect(() => checkPeerUid(fakeSocket(undefined))).not.toThrow()
  })
})
