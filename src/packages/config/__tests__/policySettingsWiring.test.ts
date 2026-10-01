/**
 * La fuente `policySettings` de `settings/settings.ts`, cableada a la
 * composición (`settings/policySettings.ts`), y la mitad de integración de
 * `remoteSettingsFirstHitFlush.test.ts`: con la capa remota en caché,
 * `getSettingsForSource('policySettings')` la muestra, y la fusión de todas
 * las fuentes la pone por encima de las demás.
 */
import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { installConfigHostBindings } from '../host.js'
import { getRemoteManagedSettingsSyncFromCache, getSettingsPath, resetSyncCache, setEligibility } from '../remote/syncCacheState.js'
import { getSettingsForSource, getSettingsWithErrors } from '../settings/settings.js'
import { resetSettingsCache } from '../settings/settingsCache.js'
import { getAdminAuthoredPolicy, getPolicyTiers, resetPolicyStoreForTesting } from '../settings/policySettings.js'
import { InMemoryConfig } from '../testing/index.js'

const home = mkdtempSync(join(tmpdir(), 'policy-wiring-'))

beforeEach(() => {
  installConfigHostBindings(new InMemoryConfig({ configHomeDir: home }).bindings)
  resetSyncCache()
  resetSettingsCache()
  resetPolicyStoreForTesting()
  rmSync(join(home, 'remote-settings.json'), { force: true })
})
afterEach(() => {
  resetSyncCache()
  resetSettingsCache()
})
afterAll(() => {
  rmSync(home, { recursive: true, force: true })
})

describe('policySettings cableada', () => {
  test('sin fuentes administradas la fuente es null', () => {
    expect(getSettingsForSource('policySettings')).toBeNull()
  })
  test('la capa remota en caché es la fuente policySettings', () => {
    writeFileSync(getSettingsPath(), JSON.stringify({ model: 'claude-opus-5', disableAllHooks: true }))
    setEligibility(true)
    expect(getSettingsForSource('policySettings')).toEqual({ model: 'claude-opus-5', disableAllHooks: true })
  })
  test('en la fusión de todas las fuentes, la política gana a las del usuario', () => {
    mkdirSync(home, { recursive: true })
    writeFileSync(join(home, 'settings.json'), JSON.stringify({ model: 'claude-sonnet-5', cleanupPeriodDays: 3 }))
    writeFileSync(getSettingsPath(), JSON.stringify({ model: 'claude-opus-5' }))
    setEligibility(true)
    const { settings } = getSettingsWithErrors()
    expect(settings.model).toBe('claude-opus-5')
    expect(settings.cleanupPeriodDays).toBe(3)
  })
  test('la primera lectura remota tras la elegibilidad hace visible la política a una fusión leída antes (gh-23085)', () => {
    writeFileSync(join(home, 'settings.json'), JSON.stringify({ model: 'claude-sonnet-5' }))
    writeFileSync(getSettingsPath(), JSON.stringify({ model: 'claude-opus-5' }))
    expect(getSettingsWithErrors().settings.model).toBe('claude-sonnet-5')
    setEligibility(true)
    getRemoteManagedSettingsSyncFromCache()
    expect(getSettingsWithErrors().settings.model).toBe('claude-opus-5')
  })
})

describe('los ajustes administrados del proceso padre', () => {
  test('el anfitrión los pasa por su binding y llegan como escalón de política', () => {
    installConfigHostBindings({ ...new InMemoryConfig({ configHomeDir: home }).bindings, getParentManagedSettings: () => ({ allowManagedHooksOnly: true }) })
    expect(getPolicyTiers()).toEqual([{ allowManagedHooksOnly: true }])
    expect(getAdminAuthoredPolicy()).toBeNull()
  })
  test('sin binding no hay escalones ni administrador', () => {
    expect(getPolicyTiers()).toEqual([])
    expect(getAdminAuthoredPolicy()).toBeNull()
  })
})
