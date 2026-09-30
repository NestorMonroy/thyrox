/**
 * Las direcciones de un par: `R`, `vye`, `M1`, `E`, `fJ`, `cLo`, `ZFr`, `lh`,
 * `ffn`, `T`, `Vce`, `mJ`, `eUr`, `D` y `dLo` (`chunk-q8a07cv0.js`), con `Wh`
 * y `zF` (`chunk-yqm14hey.js`) de 2.1.283.
 */
import { describe, expect, test } from 'bun:test'

import {
  MAX_BARE_ADDRESS_LENGTH,
  REPLY_ACROSS_DEFAULT_DIRS,
  bridgeAddress,
  compareSocketAddresses,
  decodeAddressTarget,
  encodeAddressTarget,
  hasParentSegment,
  isBareAddress,
  isDefaultDirSocket,
  isPeerAddress,
  isReplyableSocket,
  isSameSocket,
  looksLikeSocketPath,
  mayBeSameSocket,
  mayReplyTo,
  parseAddress,
  stripDataVolumePrefix,
  udsAddress,
  validateSendTarget,
} from '../src/uds/peerAddress.ts'

describe('formas de una dirección', () => {
  test('encodeAddressTarget (R) codifica en UTF-8 lo que no es de ruta', () => {
    expect(encodeAddressTarget('/tmp/a b.sock')).toBe('/tmp/a%20b.sock')
    expect(encodeAddressTarget('C:\\x-y_z.sock')).toBe('C:\\x-y_z.sock')
    expect(encodeAddressTarget('ñ')).toBe('%C3%B1')
    expect(udsAddress('/tmp/a b.sock')).toBe('uds:/tmp/a%20b.sock')
    expect(bridgeAddress('id#1')).toBe('bridge:id%231')
  })

  test('decodeAddressTarget (E) decodifica, o deja el texto si no es codificación válida', () => {
    expect(decodeAddressTarget('/tmp/a%20b.sock')).toBe('/tmp/a b.sock')
    expect(decodeAddressTarget('%E0%A4%A')).toBe('%E0%A4%A')
  })

  test('isPeerAddress (fJ) exige esquema y hasta 200 caracteres de dirección', () => {
    expect(isPeerAddress('uds:/tmp/a.sock')).toBe(true)
    expect(isPeerAddress('did:x')).toBe(true)
    expect(isPeerAddress('http:x')).toBe(false)
    expect(isPeerAddress(`uds:${'a'.repeat(201)}`)).toBe(false)
    expect(isPeerAddress('uds:/tmp/a b.sock')).toBe(false)
  })

  test('isBareAddress (cLo), looksLikeSocketPath (ZFr)', () => {
    expect(isBareAddress('a'.repeat(300))).toBe(true)
    expect(isBareAddress('a'.repeat(301))).toBe(false)
    expect(looksLikeSocketPath('/tmp/x.sock')).toBe(true)
    expect(looksLikeSocketPath('tmp/x.sock')).toBe(false)
  })

  test('parseAddress (lh) separa esquema y destino', () => {
    expect(parseAddress('uds:/tmp/a%20b.sock')).toEqual({ scheme: 'uds', target: '/tmp/a b.sock' })
    expect(parseAddress('bridge:id%231')).toEqual({ scheme: 'bridge', target: 'id#1' })
    expect(parseAddress('did:web:x')).toEqual({ scheme: 'did', target: 'did:web:x' })
    expect(parseAddress('/tmp/a.sock')).toEqual({ scheme: 'uds', target: '/tmp/a.sock' })
    expect(parseAddress('\\\\.\\pipe\\cc')).toEqual({ scheme: 'uds', target: '\\\\.\\pipe\\cc' })
    expect(parseAddress('ana')).toEqual({ scheme: 'other', target: 'ana' })
  })

  test('validateSendTarget (ffn) nombra por qué no se puede enviar', () => {
    expect(validateSendTarget('  ', 'ListAgents')).toBe('to must not be empty')
    expect(validateSendTarget('uds:', 'ListAgents')).toBe('address target must not be empty')
    expect(validateSendTarget('uds://server/share/a.sock', 'ListAgents')).toBe("'uds://server/share/a.sock' is not a local socket address. Use an address from ListAgents.")
    expect(validateSendTarget('uds:/tmp/a.sock', 'ListAgents')).toBeUndefined()
  })
})

describe('compareSocketAddresses (T)', () => {
  test('en Linux, la misma ruta resuelta es la misma; un .. sólo da quizá', () => {
    expect(compareSocketAddresses('/tmp/a.sock', '/tmp/./a.sock', 'linux')).toBe('same')
    expect(compareSocketAddresses('/tmp/x/../a.sock', '/tmp/a.sock', 'linux')).toBe('maybe')
    expect(compareSocketAddresses('/tmp/A.sock', '/tmp/a.sock', 'linux')).toBe('different')
    expect(isSameSocket('/tmp/a.sock', '/tmp/a.sock', 'linux')).toBe(true)
    expect(mayBeSameSocket('/tmp/x/../a.sock', '/tmp/a.sock', 'linux')).toBe(true)
  })

  test('en macOS, mayúsculas y /private dan quizá o lo mismo', () => {
    expect(compareSocketAddresses('/tmp/A.sock', '/tmp/a.sock', 'macos')).toBe('maybe')
    expect(compareSocketAddresses('/private/tmp/a.sock', '/tmp/a.sock', 'macos')).toBe('same')
    expect(compareSocketAddresses('/private/tmp/a.sock', '/tmp/a.sock', 'linux')).toBe('different')
    expect(compareSocketAddresses('/System/Volumes/Data/Users/a.sock', '/Users/a.sock', 'macos')).toBe('same')
    expect(compareSocketAddresses('/tmp/e\u0301.sock', '/tmp/\u00e9.sock', 'macos')).toBe('maybe')
  })

  test('en Windows, sólo las mayúsculas dan quizá', () => {
    expect(compareSocketAddresses('/tmp/A.sock', '/tmp/a.sock', 'windows')).toBe('maybe')
  })

  test('pipes: el nombre en minúsculas ASCII decide; un pipe y una ruta son distintos', () => {
    expect(compareSocketAddresses('\\\\.\\pipe\\CC', '\\\\.\\pipe\\cc', 'windows')).toBe('same')
    expect(compareSocketAddresses('\\\\.\\pipe\\\u00c9', '\\\\.\\pipe\\\u00e9', 'windows')).toBe('maybe')
    expect(compareSocketAddresses('\\\\.\\pipe\\a', '\\\\.\\pipe\\b', 'windows')).toBe('different')
    expect(compareSocketAddresses('\\\\.\\pipe\\a', '/tmp/a.sock', 'windows')).toBe('different')
  })

  test('stripDataVolumePrefix (zF) quita /System/Volumes/Data ante una raíz conocida', () => {
    expect(stripDataVolumePrefix('/System/Volumes/Data/Users/ana/x.sock')).toBe('/Users/ana/x.sock')
    expect(stripDataVolumePrefix('/system/volumes/data/usr/local/x')).toBe('/usr/local/x')
    expect(stripDataVolumePrefix('/System/Volumes/Data/otro/x')).toBe('/System/Volumes/Data/otro/x')
    expect(stripDataVolumePrefix('/Users/x')).toBe('/Users/x')
  })

  test('hasParentSegment (Wh)', () => {
    expect(hasParentSegment('/a/../b')).toBe(true)
    expect(hasParentSegment('..')).toBe(true)
    expect(hasParentSegment('/a/..b')).toBe(false)
  })
})

describe('a quién se puede responder', () => {
  test('isDefaultDirSocket (D): nombre de socket y directorio por defecto, con uid propio', () => {
    expect(isDefaultDirSocket('/tmp/cc-socks/12.sock', [])).toBe(true)
    expect(isDefaultDirSocket('/tmp/cc-socks-1000/12-0123abcd.sock', [1000])).toBe(true)
    expect(isDefaultDirSocket('/tmp/cc-socks-1000/12.sock', [0])).toBe(false)
    expect(isDefaultDirSocket('/run/user/1000/cc-socks/ff.sock', [1000])).toBe(true)
    expect(isDefaultDirSocket('/tmp/cc-socks/nombre.sock', [])).toBe(false)
    expect(isDefaultDirSocket('/tmp/otro/12.sock', [])).toBe(false)
  })

  test('isReplyableSocket (eUr): mismo directorio y .sock, o directorio por defecto con par verificado', () => {
    expect(isReplyableSocket('/run/a/2.sock', '/run/a/1.sock')).toBe(true)
    expect(isReplyableSocket('/run/a/2.sockx', '/run/a/1.sock')).toBe(false)
    expect(isReplyableSocket('/run/a/../a/2.sock', '/run/a/1.sock')).toBe(false)
    expect(isReplyableSocket('/tmp/cc-socks-7/2.sock', '/run/a/1.sock')).toBe(false)
    expect(isReplyableSocket('/tmp/cc-socks-7/2.sock', '/run/a/1.sock', { verifiedPeerPid: 9, ownerUids: [7] })).toBe(true)
    expect(isReplyableSocket('/tmp/cc-socks-7/2.sock', '/run/a/1.sock', { ownerUids: [7] })).toBe(false)
  })

  test('isReplyableSocket (eUr) con pipe propio: sólo otro pipe con nombre de buzón', () => {
    const own = '\\\\.\\pipe\\cc-msg-' + '0'.repeat(32)
    expect(isReplyableSocket('\\\\.\\pipe\\cc-msg-' + 'a'.repeat(32), own)).toBe(true)
    expect(isReplyableSocket('\\\\.\\pipe\\LOCAL\\cc-msg-' + 'a'.repeat(32), own)).toBe(true)
    expect(isReplyableSocket('\\\\.\\pipe\\otro', own)).toBe(false)
    expect(isReplyableSocket('/tmp/a.sock', own)).toBe(false)
  })

  test('mayReplyTo (dLo): un pipe global no responde a uno LOCAL; la capacidad abre los directorios por defecto', () => {
    const global = '\\\\.\\pipe\\cc-msg-' + '0'.repeat(32)
    const local = '\\\\.\\pipe\\LOCAL\\cc-msg-' + 'a'.repeat(32)
    expect(mayReplyTo(local, global)).toBe(false)
    expect(mayReplyTo('/run/a/2.sock', '/run/a/1.sock')).toBe(true)
    expect(mayReplyTo('/tmp/cc-socks/2.sock', '/run/a/1.sock')).toBe(false)
    expect(mayReplyTo('/tmp/cc-socks/2.sock', '/run/a/1.sock', [REPLY_ACROSS_DEFAULT_DIRS])).toBe(true)
    expect(mayReplyTo('/tmp/cc-socks-5/2.sock', '/run/a/1.sock', [REPLY_ACROSS_DEFAULT_DIRS], [6])).toBe(false)
  })
})

describe('MAX_BARE_ADDRESS_LENGTH (JFr)', () => {
  test('es el tope que exporta la referencia', () => {
    expect(MAX_BARE_ADDRESS_LENGTH).toBe(300)
  })
  test('una dirección desnuda de exactamente el tope pasa; una más larga, no', () => {
    expect(isBareAddress('a'.repeat(MAX_BARE_ADDRESS_LENGTH))).toBe(true)
    expect(isBareAddress('a'.repeat(MAX_BARE_ADDRESS_LENGTH + 1))).toBe(false)
  })
})
