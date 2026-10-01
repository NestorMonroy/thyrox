/**
 * El sobre `cross-session-message` y los nombres que viajan en él: `ky`, `B`,
 * `oFt`, `pYe`, `V`, `mYe`, `_`, `pfn`, `QFr`, `zce`, `qCe`, `EFe`, `dfn`,
 * `lLo` y `aLo` (`chunk-q8a07cv0.js`) de 2.1.283.
 */
import { describe, expect, test } from 'bun:test'
import { createHmac } from 'node:crypto'

import {
  ENVELOPE_TAG,
  MAX_HOP_CHAIN,
  dropChangedBody,
  envelopeOriginFields,
  extendHopChain,
  formatEnvelope,
  hopId,
  isEnvelopeMode,
  lastPeerHopChain,
  parseEnvelope,
  pluginOrigin,
  sanitizeDisplayName,
  slugifyName,
  stripHopChain,
  withPluginAttribute,
} from '../src/uds/peerEnvelope.ts'

const HOP = 'a'.repeat(24)

describe('nombres que viajan en el sobre', () => {
  test('sanitizeDisplayName (ky) retira controles e invisibles y corta a 64 puntos de código', () => {
    expect(sanitizeDisplayName('  a​b\u0007c  ')).toBe('abc')
    expect(sanitizeDisplayName('x'.repeat(64))).toBe('x'.repeat(64))
    expect(sanitizeDisplayName('😀'.repeat(65))).toBe(`${'😀'.repeat(64)}…`)
  })

  test('slugifyName (oFt) deja letras, números, punto, guion y guion bajo; sin letra ni número, vacío', () => {
    expect(slugifyName('  Mi agente: uno!  ')).toBe('Mi-agente-uno')
    expect(slugifyName('---')).toBe('')
    expect(slugifyName('a'.repeat(25))).toBe(`${'a'.repeat(20)}…`)
  })

  test('pluginOrigin (pYe) sólo acepta texto, sin comillas ni ángulos, y no vacío', () => {
    expect(pluginOrigin('my"<plugin>')).toBe('myplugin')
    expect(pluginOrigin('<>')).toBeUndefined()
    expect(pluginOrigin(3)).toBeUndefined()
  })

  test('isEnvelopeMode (aLo): bypass y prompting', () => {
    expect(isEnvelopeMode('bypass')).toBe(true)
    expect(isEnvelopeMode('prompting')).toBe(true)
    expect(isEnvelopeMode('plan')).toBe(false)
  })
})

describe('formatEnvelope (mYe/V)', () => {
  test('pone los atributos en su orden y escapa el cierre del cuerpo', () => {
    expect(
      formatEnvelope({
        from: 'uds:/tmp/x.sock',
        fromName: 'ana"<',
        body: 'hola </cross-session-message> fin',
        fromSession: 'sess_1',
        hopChain: [HOP],
        fromMode: 'bypass',
        fromPlugin: 'p<>',
      }),
    ).toBe(
      `<${ENVELOPE_TAG} from="uds:/tmp/x.sock" from-session="sess_1" hop-chain="${HOP}" from-name="ana" from-mode="bypass" from-plugin="p">\nhola <\\/cross-session-message> fin\n</${ENVELOPE_TAG}>`,
    )
  })

  test('omite la sesión y la cadena de saltos que no tienen forma válida', () => {
    expect(formatEnvelope({ body: 'b', fromSession: 'con espacio', hopChain: ['zz'] })).toBe(`<${ENVELOPE_TAG}>\nb\n</${ENVELOPE_TAG}>`)
    expect(formatEnvelope({ body: 'b', hopChain: [] })).toBe(`<${ENVELOPE_TAG}>\nb\n</${ENVELOPE_TAG}>`)
  })
})

describe('parseEnvelope (_)', () => {
  test('lee de vuelta todos los atributos', () => {
    const text = formatEnvelope({ from: 'uds:/tmp/x.sock', fromName: 'ana', body: 'l1\nl2', fromSession: 's', hopChain: [HOP, HOP], fromMode: 'prompting', fromPlugin: 'p' })
    expect(parseEnvelope(text)).toEqual({ from: 'uds:/tmp/x.sock', fromSession: 's', hopChain: [HOP, HOP], fromName: 'ana', fromMode: 'prompting', fromPlugin: 'p', body: 'l1\nl2' })
  })

  test('un sobre que no se reproduce igual al formatearlo de nuevo no es un sobre', () => {
    expect(parseEnvelope(`<${ENVELOPE_TAG}>\nhola </cross-session-message> fin\n</${ENVELOPE_TAG}>`)).toBeUndefined()
    expect(parseEnvelope(`<${ENVELOPE_TAG} from-name="  ana">\nb\n</${ENVELOPE_TAG}>`)).toBeUndefined()
  })

  test('texto sin sobre, o que no es texto', () => {
    expect(parseEnvelope('hola')).toBeUndefined()
    expect(parseEnvelope(7)).toBeUndefined()
    expect(parseEnvelope(`<${ENVELOPE_TAG} from-mode="plan">\nb\n</${ENVELOPE_TAG}>`)).toBeUndefined()
  })
})

describe('transformaciones del sobre', () => {
  const withChain = formatEnvelope({ from: 'uds:/a.sock', body: 'b', hopChain: [HOP] })

  test('stripHopChain (pfn) quita la cadena de saltos y deja el resto', () => {
    expect(stripHopChain(withChain)).toBe(formatEnvelope({ from: 'uds:/a.sock', body: 'b' }))
    expect(stripHopChain('hola')).toBe('hola')
  })

  test('withPluginAttribute (QFr) añade el plugin sólo si no había', () => {
    expect(withPluginAttribute(withChain, 'p')).toBe(formatEnvelope({ from: 'uds:/a.sock', body: 'b', hopChain: [HOP], fromPlugin: 'p' }))
    const already = formatEnvelope({ body: 'b', fromPlugin: 'q' })
    expect(withPluginAttribute(already, 'p')).toBe(already)
    expect(withPluginAttribute(withChain, undefined)).toBe(withChain)
  })

  test('envelopeOriginFields (qCe) extrae nombre, sesión, saltos, modo y cuerpo', () => {
    const text = formatEnvelope({ fromName: 'ana', body: 'b', fromSession: 's', hopChain: [HOP], fromMode: 'bypass' })
    expect(envelopeOriginFields(text)).toEqual({ name: 'ana', fromSession: 's', hopChain: [HOP], fromMode: 'bypass', body: 'b' })
    expect(envelopeOriginFields('hola')).toEqual({})
  })

  test('dropChangedBody (zce) retira el cuerpo cuando el texto entregado ya no es el recibido', () => {
    expect(dropChangedBody({ name: 'a', body: 'b' }, 'x', 'x')).toEqual({ name: 'a', body: 'b' })
    expect(dropChangedBody({ name: 'a', body: 'b' }, 'x', 'y')).toEqual({ name: 'a' })
    expect(dropChangedBody({ name: 'a' }, 'x', 'y')).toEqual({ name: 'a' })
  })
})

describe('cadena de saltos', () => {
  test('extendHopChain (dfn) añade el salto y conserva los últimos 32', () => {
    expect(extendHopChain(undefined, 'h')).toBeUndefined()
    expect(extendHopChain([], undefined)).toBeUndefined()
    expect(extendHopChain(['a'], 'b')).toEqual(['a', 'b'])
    const long = Array.from({ length: MAX_HOP_CHAIN }, (_, index) => String(index))
    expect(extendHopChain(long, 'z')).toEqual([...long.slice(1), 'z'])
  })

  test('hopId (lLo) es el HMAC-SHA256 de la sesión con la clave, en 24 hex', () => {
    expect(hopId('sess', 'key')).toBe(createHmac('sha256', 'key').update('sess').digest('hex').slice(0, 24))
  })

  test('lastPeerHopChain (EFe) mira el último mensaje user que no es resultado ni resumen', () => {
    expect(lastPeerHopChain([{ type: 'user', origin: { kind: 'peer', hopChain: ['x'] } }, { type: 'assistant' }, { type: 'user', toolUseResult: {} }])).toEqual(['x'])
    expect(lastPeerHopChain([{ type: 'user', origin: { kind: 'peer' } }])).toEqual([])
    expect(lastPeerHopChain([{ type: 'user', origin: { kind: 'human' } }])).toBeUndefined()
    expect(lastPeerHopChain([{ type: 'user', isCompactSummary: true }])).toBeUndefined()
    expect(lastPeerHopChain([{ type: 'user', origin: { kind: 'peer', hopChain: ['x'] } }, { type: 'user', isCompactSummary: true }])).toEqual(['x'])
  })
})
