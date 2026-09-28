/**
 * Lo que el buzón deja en el log de una línea ajena: `TB`, `Bf`, `se`, `pn`
 * y `Kr` (`chunk-qcy58j4w.js`, `chunk-xn8f4n02.js`, `chunk-vq0drrah.js`), y
 * la telemetría de funcionalidad `_`, `m`, `p` con `qde`
 * (`chunk-d09a8ccq.js`, `chunk-ern0s5ks.js`) de 2.1.283.
 */
import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'

import { featureErrorCode, reportFeatureBad, reportFeatureOk, reportFeatureSad } from '../src/uds/featureTelemetry.ts'
import { maskHexRuns, redactLogFragment, truncateCodePoints, withholdTokenText } from '../src/uds/logRedaction.ts'

describe('truncateCodePoints (Kr)', () => {
  test('corta por puntos de código, no por unidades UTF-16', () => {
    expect(truncateCodePoints('abc', 5)).toBe('abc')
    expect(truncateCodePoints('abcdef', 3)).toBe('abc')
    expect(truncateCodePoints('😀😀😀', 2)).toBe('😀😀')
  })
})

describe('maskHexRuns (se/pn)', () => {
  test('una racha hex de 32 o más se sustituye por los 12 primeros hex de su sha256', () => {
    const run = 'A'.repeat(32)
    const digest = createHash('sha256').update(run).digest('hex').slice(0, 12)
    expect(maskHexRuns(`x ${run} y`)).toBe(`x <hex:${digest}> y`)
    expect(maskHexRuns('f'.repeat(31))).toBe('f'.repeat(31))
  })
})

describe('redactLogFragment (TB) y withholdTokenText (Bf)', () => {
  test('un fragmento que menciona token no se registra', () => {
    expect(redactLogFragment('{"Token":"x"}')).toBe('(redacted: fragment may carry an auth token)')
    expect(withholdTokenText('my_token')).toBe('(withheld)')
  })

  test('el resto se enmascara y se corta: 200 para un fragmento, 120 por omisión para un texto', () => {
    expect(redactLogFragment('x'.repeat(300))).toHaveLength(200)
    expect(withholdTokenText('z'.repeat(300))).toHaveLength(120)
    expect(withholdTokenText('z'.repeat(300), 10)).toHaveLength(10)
    expect(redactLogFragment(`id ${'0'.repeat(40)}`)).toStartWith('id <hex:')
  })
})

describe('telemetría de funcionalidad', () => {
  test('featureErrorCode (qde): un código conforme pasa; otro es nonconforming; un no-texto no hay código', () => {
    expect(featureErrorCode('unauthed_drop')).toBe('unauthed_drop')
    expect(featureErrorCode('1bad')).toBe('nonconforming')
    expect(featureErrorCode(`a${'b'.repeat(64)}`)).toBe('nonconforming')
    expect(featureErrorCode(3)).toBeUndefined()
  })

  test('ok, bad y sad emiten su evento con feature_name y error_code', () => {
    const events: Array<[string, Record<string, unknown>]> = []
    const sink = (name: string, metadata: Record<string, unknown>) => void events.push([name, metadata])
    reportFeatureOk('cross_session_inbox_auth', undefined, sink)
    reportFeatureBad('cross_session_inbox_auth', 'unauthed_drop', undefined, sink)
    reportFeatureSad('cross_session_inbox_auth', 'silent connection', { extra: 1 }, sink)
    expect(events).toEqual([
      ['tengu_feature_ok', { feature_name: 'cross_session_inbox_auth' }],
      ['tengu_feature_bad', { feature_name: 'cross_session_inbox_auth', error_code: 'unauthed_drop' }],
      ['tengu_feature_sad', { extra: 1, feature_name: 'cross_session_inbox_auth', error_code: 'nonconforming' }],
    ])
  })
})
