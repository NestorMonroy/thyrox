/**
 * La ruta del buzón por socket de cada sesión: `W1o`, `p9r`, `IL` y `qce` de
 * 2.1.283 (`chunk-yg53q7yp.js`, `chunk-q8a07cv0.js`).
 */
import { describe, expect, test } from 'bun:test'

import {
  MAX_SOCKET_PATH_BYTES,
  defaultUdsSocketPath,
  isUsableLocalSocketAddress,
  localPipeName,
  perUidFallbackSocketPath,
} from '../src/uds/socketPath.ts'

describe('defaultUdsSocketPath (W1o)', () => {
  test('usa XDG_RUNTIME_DIR y nombra el socket por el pid', () => {
    expect(defaultUdsSocketPath({ env: { XDG_RUNTIME_DIR: '/run/user/1000' }, pid: 42, uid: 1000, tmpdir: '/tmp' }))
      .toBe('/run/user/1000/cc-socks/42.sock')
  })

  test('sin XDG_RUNTIME_DIR cae en THYROX_CODE_TMPDIR y luego en el tmpdir del sistema', () => {
    expect(defaultUdsSocketPath({ env: { THYROX_CODE_TMPDIR: '/var/tmp/t' }, pid: 7, uid: 0, tmpdir: '/tmp' }))
      .toBe('/var/tmp/t/cc-socks/7.sock')
    expect(defaultUdsSocketPath({ env: {}, pid: 7, uid: 0, tmpdir: '/tmp' })).toBe('/tmp/cc-socks/7.sock')
  })

  test('una ruta que excede el límite de bytes cae en el respaldo por uid', () => {
    const long = `/${'d'.repeat(MAX_SOCKET_PATH_BYTES)}`
    expect(defaultUdsSocketPath({ env: { XDG_RUNTIME_DIR: long }, pid: 9, uid: 1000, tmpdir: '/tmp' }))
      .toBe('/tmp/cc-socks-1000/9.sock')
  })

  test('el límite cuenta bytes, no caracteres', () => {
    // 'ñ' ocupa dos bytes: una ruta de caracteres dentro del límite lo excede en bytes.
    const dir = `/${'ñ'.repeat(46)}`
    const candidate = `${dir}/cc-socks/9.sock`
    expect(candidate.length).toBeLessThanOrEqual(MAX_SOCKET_PATH_BYTES)
    expect(Buffer.byteLength(candidate)).toBeGreaterThan(MAX_SOCKET_PATH_BYTES)
    expect(defaultUdsSocketPath({ env: { XDG_RUNTIME_DIR: dir }, pid: 9, uid: 5, tmpdir: '/tmp' }))
      .toBe('/tmp/cc-socks-5/9.sock')
  })

  test('el límite es 103 bytes, el de la referencia', () => {
    expect(MAX_SOCKET_PATH_BYTES).toBe(103)
  })
})

describe('perUidFallbackSocketPath (p9r)', () => {
  test('va a /tmp/cc-socks-<uid>/<pid>.sock', () => {
    expect(perUidFallbackSocketPath({ env: {}, pid: 3, uid: 1001 })).toBe('/tmp/cc-socks-1001/3.sock')
  })

  test('en Termux usa $PREFIX/tmp', () => {
    expect(perUidFallbackSocketPath({ env: { TERMUX_VERSION: '0.118', PREFIX: '/data/usr' }, pid: 3, uid: 10 }))
      .toBe('/data/usr/tmp/cc-socks-10/3.sock')
  })
})

describe('isUsableLocalSocketAddress (IL)', () => {
  test('una ruta local es utilizable', () => {
    expect(isUsableLocalSocketAddress('/tmp/cc-socks/1.sock')).toBe(true)
    expect(isUsableLocalSocketAddress('relative/1.sock')).toBe(true)
  })

  test('una ruta UNC remota no lo es', () => {
    expect(isUsableLocalSocketAddress('//server/share/1.sock')).toBe(false)
    expect(isUsableLocalSocketAddress('\\\\server\\share\\1.sock')).toBe(false)
  })

  test('un pipe con un solo segmento sí lo es; con segmentos de más o punto final, no', () => {
    expect(isUsableLocalSocketAddress('\\\\.\\pipe\\inbox')).toBe(true)
    expect(isUsableLocalSocketAddress('\\\\.\\pipe\\a\\b')).toBe(false)
    expect(isUsableLocalSocketAddress('\\\\.\\pipe\\inbox.')).toBe(false)
    expect(isUsableLocalSocketAddress('\\\\.\\pipe\\inbox ')).toBe(false)
  })
})

describe('localPipeName (qce)', () => {
  test('devuelve el nombre del pipe, con LOCAL si lo lleva', () => {
    expect(localPipeName('\\\\.\\pipe\\inbox')).toBe('inbox')
    expect(localPipeName('\\\\?\\pipe\\LOCAL\\inbox')).toBe('LOCAL\\inbox')
  })

  test('rehúsa . y .. y la mezcla de separadores tras \\\\?\\', () => {
    expect(localPipeName('\\\\.\\pipe\\..')).toBeUndefined()
    expect(localPipeName('\\\\?\\pipe/inbox')).toBeUndefined()
  })
})

describe('getDefaultUdsSocketPath, la superficie que llama setup.ts', () => {
  test('ya no es el sustituto vacío: nombra el socket de este proceso', async () => {
    const { getDefaultUdsSocketPath } = await import('../src/uds/udsMessaging.ts')
    expect(getDefaultUdsSocketPath().endsWith(`${process.pid}.sock`)).toBe(true)
  })
})
