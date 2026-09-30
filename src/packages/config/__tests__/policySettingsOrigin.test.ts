/** `Ysr`/`wS` de 2.1.275, acotados a la capa de archivo. */
import { afterAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getManagedFileSettingsPresence, getPolicySettingsOrigin } from '../settings/settings.ts'

const root = mkdtempSync(join(process.env.THYROX_CACHE ?? '/home/user/thyrox/.claude/cache', 'managed-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))
function dir(name: string) {
  const d = join(root, name)
  mkdirSync(d, { recursive: true })
  return d
}

describe('getManagedFileSettingsPresence', () => {
  test('vacío', () => {
    expect(getManagedFileSettingsPresence(dir('vacio'))).toEqual({ hasBase: false, hasDropIns: false })
  })
  test('base con claves', () => {
    const d = dir('base')
    writeFileSync(join(d, 'managed-settings.json'), '{"cleanupPeriodDays":7}')
    expect(getManagedFileSettingsPresence(d)).toEqual({ hasBase: true, hasDropIns: false })
  })
  test('una base vacía no cuenta; un drop-in .json sí; uno oculto no', () => {
    const d = dir('dropin')
    writeFileSync(join(d, 'managed-settings.json'), '{}')
    mkdirSync(join(d, 'managed-settings.d'))
    writeFileSync(join(d, 'managed-settings.d', '.oculto.json'), '{"cleanupPeriodDays":9}')
    expect(getManagedFileSettingsPresence(d)).toEqual({ hasBase: false, hasDropIns: false })
    writeFileSync(join(d, 'managed-settings.d', '10-a.json'), '{"cleanupPeriodDays":9}')
    expect(getManagedFileSettingsPresence(d)).toEqual({ hasBase: false, hasDropIns: true })
  })
})

describe('getPolicySettingsOrigin', () => {
  test('file si hay algo en el directorio, null si no', () => {
    expect(getPolicySettingsOrigin(dir('nada'))).toBeNull()
    const d = dir('algo')
    writeFileSync(join(d, 'managed-settings.json'), '{"cleanupPeriodDays":7}')
    expect(getPolicySettingsOrigin(d)).toBe('file')
  })
})
