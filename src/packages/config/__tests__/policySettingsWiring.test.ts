/**
 * La fuente `policySettings` de `settings/settings.ts`, cableada a la
 * composición (`settings/policySettings.ts`). Es la mitad de integración que
 * `remoteSettingsFirstHitFlush.test.ts` declaraba pendiente: con la capa
 * remota en caché, `getSettingsForSource('policySettings')` la muestra, y la
 * fusión de todas las fuentes la pone por encima de las demás.
 */
import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { installConfigHostBindings } from '../host.js'
import { getSettingsPath, resetSyncCache, setEligibility } from '../remote/syncCacheState.js'
import { getSettingsForSource, getSettingsWithErrors } from '../settings/settings.js'
import { resetSettingsCache } from '../settings/settingsCache.js'
import { resetPolicyStoreForTesting } from '../settings/policySettings.js'
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
})
