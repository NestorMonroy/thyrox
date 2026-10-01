/**
 * Guardas de red de la pasarela — contrato de 2.1.283:
 * `chunk-379zyrv7.js` `m6` y ayudantes; `chunk-wg7ts4cy.js` `ph`, `ir`,
 * `$_`, y la validación de cabeceras de upstream (`xre`, `Mre`, `jre`, `Ure`).
 */
import { describe, expect, test } from 'bun:test'
import {
  isBlockedHost,
  isLoopbackListenHost,
  isSafeUpstreamUrl,
  parseIPv6Bytes,
  validateUpstreamHeaders,
} from '../src/proxy/netGuards.js'

describe('parseIPv6Bytes (dr)', () => {
  test('expande :: y acepta la cola IPv4', () => {
    expect(parseIPv6Bytes('::1')).toEqual([...Array(15).fill(0), 1])
    expect(parseIPv6Bytes('::ffff:1.2.3.4')!.slice(10)).toEqual([255, 255, 1, 2, 3, 4])
  })
  test('rechaza dos :: y grupos inválidos', () => {
    expect(parseIPv6Bytes('1::2::3')).toBeUndefined()
    expect(parseIPv6Bytes('12345::1')).toBeUndefined()
  })
})

describe('isBlockedHost (m6)', () => {
  const blocked = [
    '', 'localhost', 'app.localhost', 'LOCALHOST.', 'metadata.google.internal', 'ip6-loopback',
    'instance-data.us-east-1.compute.internal', '127.0.0.1', '169.254.169.254', '0.0.0.0',
    '100.100.100.200', '168.63.129.16', '::', '::1', 'fd00:ec2::254', 'fe80::1',
    '::ffff:127.0.0.1', '64:ff9b::a9fe:a9fe', '2002:7f00:1::',
  ]
  const allowed = ['api.anthropic.com', '8.8.8.8', '10.0.0.1', '2001:4860:4860::8888']
  test.each(blocked)('bloquea %p', h => expect(isBlockedHost(h)).toBe(true))
  test.each(allowed)('permite %p', h => expect(isBlockedHost(h)).toBe(false))
  test('lo que net.isIPv6 rechaza se trata como nombre y no se bloquea', () => {
    expect(isBlockedHost('1::2::3')).toBe(false)
  })
})

describe('isSafeUpstreamUrl (ir + ph)', () => {
  test('sólo http y https', () => {
    expect(isSafeUpstreamUrl('ftp://api.example.com')).toBe(false)
    expect(isSafeUpstreamUrl('https://api.example.com/v1')).toBe(true)
  })
  test('metadatos y etiquetas vacías se rehúsan', () => {
    expect(isSafeUpstreamUrl('http://metadata.goog/')).toBe(false)
    expect(isSafeUpstreamUrl('http://a..b/')).toBe(false)
    expect(isSafeUpstreamUrl('http://169.254.169.254/')).toBe(false)
    expect(isSafeUpstreamUrl('no es url')).toBe(false)
  })
  test('loopback es un destino válido sin ninguna variable: el Ollama gestionado vive ahí', () => {
    expect(isSafeUpstreamUrl('http://127.0.0.1:51434/v1')).toBe(true)
    expect(isSafeUpstreamUrl('http://127.5.6.7:8317')).toBe(true)
    expect(isSafeUpstreamUrl('http://[::1]:8317')).toBe(true)
    expect(isSafeUpstreamUrl('http://[::ffff:127.0.0.1]:8317')).toBe(true)
  })
  test('la dirección no especificada sigue rehusada, junto con enlace local y metadatos', () => {
    expect(isSafeUpstreamUrl('http://0.0.0.0/')).toBe(false)
    expect(isSafeUpstreamUrl('http://[::]/')).toBe(false)
    expect(isSafeUpstreamUrl('http://[::ffff:0.0.0.0]/')).toBe(false)
    expect(isSafeUpstreamUrl('http://169.254.169.254/')).toBe(false)
  })
  test('las redes privadas RFC1918 conservan la conducta heredada: su apertura es otra decisión', () => {
    expect(isSafeUpstreamUrl('http://10.0.0.20:8317')).toBe(true)
    expect(isSafeUpstreamUrl('http://192.168.1.1:8317')).toBe(true)
  })
  test('un nombre que no es IP sólo se juzga contra la lista de metadatos (ph)', () => {
    expect(isSafeUpstreamUrl('http://localhost:8317')).toBe(true)
  })
})

describe('isLoopbackListenHost ($_)', () => {
  test('sólo las cuatro formas literales', () => {
    for (const h of ['localhost', '127.0.0.1', '::1', '[::1]']) expect(isLoopbackListenHost(h)).toBe(true)
    expect(isLoopbackListenHost('0.0.0.0')).toBe(false)
    expect(isLoopbackListenHost('127.0.0.2')).toBe(false)
  })
})

describe('validateUpstreamHeaders', () => {
  test('una cabecera propia válida no da avisos', () => {
    expect(validateUpstreamHeaders({ 'X-Team': 'infra' })).toEqual([])
  })
  test('nombre inválido, repetida, reservada y valor inválido', () => {
    expect(
      validateUpstreamHeaders({
        'mal nombre': 'x',
        'X-Team': 'a',
        'x-team': 'b',
        Authorization: 'k',
        'anthropic-beta': 'z',
        'X-Pad': ' x',
      }),
    ).toEqual([
      "header 'mal nombre' is not a valid HTTP header name",
      "header 'x-team' is listed twice (header names ignore case)",
      "header 'Authorization' is reserved (the gateway or the provider's SDK sets or signs it). Remove it from this upstream's headers.",
      "header 'anthropic-beta' is reserved (the gateway or the provider's SDK sets or signs it). Remove it from this upstream's headers.",
      "header 'X-Pad' has an empty or invalid value: use printable ASCII with no space at either end (if it comes from a ${VAR}, check that variable's value)",
    ])
  })
})
