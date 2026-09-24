/**
 * `hasSkipDangerousModePermissionPrompt` y `hasAutoModeOptIn`: ¿aceptó el
 * usuario el aviso? Reimplementación de `sU` (2.1.275, `chunk-v49f6nqy.js`)
 * y de su hermana de la misma forma sobre `skipAutoPermissionPrompt`, la
 * clave que escribe `AutoModeOptInDialog`.
 *
 * La mitad que discrimina: `projectSettings` NO cuenta. Un repositorio clonado
 * no puede aceptar el aviso por quien lo abre; las cuatro fuentes que sí
 * cuentan son las del usuario, las locales, las de flag y las de política.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { installConfigHostBindings } from '../host.ts'
import {
  hasAutoModeOptIn,
  hasSkipDangerousModePermissionPrompt,
  updateSettingsForSource,
} from '../settings/settings.ts'

let cwd: string

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), 'opt-in-'))
  installConfigHostBindings({ getOriginalCwd: () => cwd, getFlagSettingsPath: () => undefined } as never)
})
afterEach(() => rmSync(cwd, { recursive: true, force: true }))

describe.each([
  ['hasSkipDangerousModePermissionPrompt', hasSkipDangerousModePermissionPrompt, 'skipDangerousModePermissionPrompt'],
  ['hasAutoModeOptIn', hasAutoModeOptIn, 'skipAutoPermissionPrompt'],
] as const)('%s', (_name, predicate, key) => {
  test('sin declaración en ninguna fuente: false', () => {
    updateSettingsForSource('localSettings', {})
    expect(predicate()).toBe(false)
  })
  test('declarada en localSettings: true', () => {
    updateSettingsForSource('localSettings', { [key]: true } as never)
    expect(predicate()).toBe(true)
  })
  test('declarada SOLO en projectSettings: false — un repo no acepta por el usuario', () => {
    updateSettingsForSource('localSettings', {})
    updateSettingsForSource('projectSettings', { [key]: true } as never)
    expect(predicate()).toBe(false)
  })
})
