/**
 * El saneo de `crossSessionInbound` en cada archivo de settings: `Oy`, `wy`,
 * `ud`, `cd`, `je` y `ye` (`chunk-379zyrv7.js`) de 2.1.283.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CROSS_SESSION_INBOUND_LEVELS, describeInvalidLevel, sanitizeCrossSessionInbound } from '../settings/crossSessionInbound.ts'
import { parseCommandOutputAsSettings } from '../settings/mdm/settings.ts'
import { parseSettingsFile } from '../settings/settings.ts'
import { loadSettings } from '../settings/load.ts'
import { readPolicyDocument } from '../settings/policySources.ts'

describe('describeInvalidLevel (ud)', () => {
  test('nombra los valores válidos y el recibido; una cadena rara o larga no se reproduce', () => {
    expect(CROSS_SESSION_INBOUND_LEVELS).toEqual(['accept', 'hold', 'refuse'])
    expect(describeInvalidLevel('maybe')).toBe('must be one of "accept", "hold", "refuse"; received "maybe"')
    expect(describeInvalidLevel('with space')).toBe('must be one of "accept", "hold", "refuse"; received "<value>"')
    expect(describeInvalidLevel('x'.repeat(41))).toBe('must be one of "accept", "hold", "refuse"; received "<value>"')
    expect(describeInvalidLevel(3)).toBe('must be one of "accept", "hold", "refuse"; received number')
    expect(describeInvalidLevel(null)).toBe('must be one of "accept", "hold", "refuse"; received null')
    expect(describeInvalidLevel([])).toBe('must be one of "accept", "hold", "refuse"; received array')
  })
})

describe('sanitizeCrossSessionInbound (Oy/wy)', () => {
  test('un valor válido o ausente no toca nada', () => {
    const data: Record<string, unknown> = { crossSessionInbound: 'hold' }
    expect(sanitizeCrossSessionInbound(data, 'f')).toEqual([])
    expect(data).toEqual({ crossSessionInbound: 'hold' })
    expect(sanitizeCrossSessionInbound({}, 'f')).toEqual([])
    expect(sanitizeCrossSessionInbound(null, 'f')).toEqual([])
    expect(sanitizeCrossSessionInbound([], 'f')).toEqual([])
  })

  test('fuera de managed settings, el valor inválido se retira y se avisa que retiene', () => {
    const data: Record<string, unknown> = { crossSessionInbound: 'maybe', model: 'm' }
    const [warning] = sanitizeCrossSessionInbound(data, 'user.json')
    expect(data).toEqual({ model: 'm' })
    expect(warning).toEqual({
      file: 'user.json',
      path: 'crossSessionInbound',
      message:
        '"crossSessionInbound" must be one of "accept", "hold", "refuse"; received "maybe". This value was ignored; while it is present, cross-session messages are held for your approval instead of being delivered. Set it to one of the values above.',
      severity: 'warning',
      expected: '"accept", "hold", "refuse"',
    })
  })

  test('en managed settings el valor inválido se trata como refuse, con un aviso sólo de estado', () => {
    const data: Record<string, unknown> = { crossSessionInbound: 7 }
    const [warning] = sanitizeCrossSessionInbound(data, 'managed', { policySource: true })
    expect(data).toEqual({ crossSessionInbound: 'refuse' })
    expect(warning?.statusOnly).toBe(true)
    expect(warning?.message).toContain('In managed settings an unrecognized value is treated as "refuse"')
  })
})

describe('el saneo en los sitios que parsean settings', () => {
  let dir: string
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'csi-'))
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  test('parseSettingsFile retira el valor y devuelve el aviso que la política lee', () => {
    const path = join(dir, 'settings.json')
    writeFileSync(path, JSON.stringify({ crossSessionInbound: 'maybe' }))
    const { settings, errors } = parseSettingsFile(path)
    expect(settings?.crossSessionInbound).toBeUndefined()
    expect(errors).toContainEqual(expect.objectContaining({ path: 'crossSessionInbound', severity: 'warning' }))
    expect(errors.find(error => error.path === 'crossSessionInbound')?.statusOnly).toBeUndefined()
  })

  test('los settings de un comando de MDM son managed: el valor inválido queda en refuse', () => {
    const { settings, errors } = parseCommandOutputAsSettings(JSON.stringify({ crossSessionInbound: 'maybe' }), 'mdm')
    expect(settings.crossSessionInbound).toBe('refuse')
    expect(errors).toContainEqual(expect.objectContaining({ path: 'crossSessionInbound', statusOnly: true }))
  })

  test('un documento de política con valor inválido carga con refuse y sin mutar el original', () => {
    const document = { crossSessionInbound: 'maybe' }
    const read = readPolicyDocument(document, 'managed-settings.json')
    expect(read.settings?.crossSessionInbound).toBe('refuse')
    expect(read.errors).toContainEqual(expect.objectContaining({ path: 'crossSessionInbound', statusOnly: true }))
    expect(document.crossSessionInbound).toBe('maybe')
  })

  test('loadSettings trata como managed sólo la fuente policySettings', () => {
    const user = join(dir, 'user.json')
    const policy = join(dir, 'policy.json')
    writeFileSync(user, JSON.stringify({ crossSessionInbound: 'maybe' }))
    writeFileSync(policy, JSON.stringify({ crossSessionInbound: 'maybe' }))
    const fromUser = loadSettings([{ source: 'userSettings', path: user }])
    expect(fromUser.settings.crossSessionInbound).toBeUndefined()
    expect(fromUser.errors.find(error => error.path === 'crossSessionInbound')?.statusOnly).toBeUndefined()
    const fromPolicy = loadSettings([{ source: 'policySettings', path: policy }])
    expect(fromPolicy.settings.crossSessionInbound).toBe('refuse')
    expect(fromPolicy.errors).toContainEqual(expect.objectContaining({ path: 'crossSessionInbound', statusOnly: true }))
  })
})
