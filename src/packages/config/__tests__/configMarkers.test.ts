/**
 * `global/configMarkers.ts` — marcadores y lectores de claves concretas del
 * registro global (2.1.275: `Frr`, `j6r`, `$3`/`qEn`). Cada caso lee y
 * escribe un archivo real a través del parámetro de ruta.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { _setGlobalConfigCacheForTesting } from '../global/config.ts'
import { installConfigHostBindings } from '../host.ts'
import {
  getCustomApiKeyStatus,
  getRemoteControlAtStartup,
  markHasUsedAgentsFleet,
  recordFirstStartTime,
  resolveRemoteControlAtStartup,
} from '../global/configMarkers.ts'

let file: string

function seed(config: Record<string, unknown>): void {
  writeFileSync(file, JSON.stringify(config))
  _setGlobalConfigCacheForTesting(null)
}
function onDisk(): Record<string, unknown> {
  return JSON.parse(readFileSync(file, 'utf8'))
}

beforeEach(() => {
  installConfigHostBindings({})
  file = join(mkdtempSync(join(tmpdir(), 'config-markers-')), '.claude.json')
  seed({})
})
afterEach(() => _setGlobalConfigCacheForTesting(null))

describe('recordFirstStartTime (Frr)', () => {
  test('escribe la hora la primera vez', () => {
    recordFirstStartTime(file)
    expect(typeof onDisk().firstStartTime).toBe('string')
  })
  test('no pisa una hora ya guardada', () => {
    seed({ firstStartTime: '2020-01-01T00:00:00.000Z' })
    recordFirstStartTime(file)
    expect(onDisk().firstStartTime).toBe('2020-01-01T00:00:00.000Z')
  })
})

describe('markHasUsedAgentsFleet', () => {
  test('marca la flota como usada', () => {
    markHasUsedAgentsFleet(file)
    expect(onDisk().hasUsedAgentsFleet).toBe(true)
  })
})

describe('getCustomApiKeyStatus (j6r)', () => {
  test('aprobada, rechazada o nueva según la respuesta guardada', () => {
    seed({ customApiKeyResponses: { approved: ['abc'], rejected: ['xyz'] } })
    expect(getCustomApiKeyStatus('abc', file)).toBe('approved')
    expect(getCustomApiKeyStatus('xyz', file)).toBe('rejected')
    expect(getCustomApiKeyStatus('nnn', file)).toBe('new')
  })
})

describe('getRemoteControlAtStartup ($3)', () => {
  test('sin declaración en settings, cae al registro global heredado', () => {
    seed({ remoteControlAtStartup: true })
    expect(resolveRemoteControlAtStartup(file)).toEqual({ value: true, source: 'legacy_global_config' })
    expect(getRemoteControlAtStartup(file)).toBe(true)
  })
  test('sin nada declarado, el defecto de auto-conexión (apagado aquí)', () => {
    expect(resolveRemoteControlAtStartup(file).source).toBe('none')
    expect(getRemoteControlAtStartup(file)).toBe(false)
  })
})
