/**
 * La primera lectura con éxito del caché de ajustes gestionados remotos
 * vacía el caché de ajustes FUSIONADOS, y sólo la primera.
 *
 * Es la mitad unitaria del control que `remote/syncCacheState.ts` cita. El
 * caso de la fuente (gh-23085): una lectura de `getSettings()` hecha ANTES de que la
 * sesión supiera si era elegible para ajustes remotos quedaba en caché sin la
 * capa `policySettings`, y ninguna lectura posterior la veía. La corrección es
 * vaciar ese caché cuando la capa remota aparece por primera vez.
 *
 * La mitad de integración —que una fusión leída antes de la elegibilidad
 * muestre la capa tras esa primera lectura— es
 * `policySettingsWiring.test.ts`.
 *
 * Qué haría fallar a este control: retirar `resetSettingsCache()` del camino
 * de la primera lectura (anulado, medido: cae el caso 2), o vaciar también
 * en las lecturas siguientes (caso 3).
 */
import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { installConfigHostBindings } from '../host.js'
import {
  getRemoteManagedSettingsSyncFromCache,
  getSettingsPath,
  resetSyncCache,
  setEligibility,
} from '../remote/syncCacheState.js'
import { getSessionSettingsCache, setSessionSettingsCache } from '../settings/settingsCache.js'
import { InMemoryConfig } from '../testing/index.js'

const home = mkdtempSync(join(tmpdir(), 'remote-settings-'))
const staleMerged = { settings: { model: 'stale' }, errors: [] } as never

beforeEach(() => {
  installConfigHostBindings(new InMemoryConfig({ configHomeDir: home }).bindings)
  resetSyncCache()
  rmSync(join(home, 'remote-settings.json'), { force: true })
})

afterEach(() => {
  resetSyncCache()
})

afterAll(() => {
  rmSync(home, { recursive: true, force: true })
})

describe('getRemoteManagedSettingsSyncFromCache', () => {
  test('1. sin elegibilidad no lee el archivo ni toca el caché fusionado', () => {
    writeFileSync(getSettingsPath(), JSON.stringify({ model: 'remote' }))
    setSessionSettingsCache(staleMerged)
    expect(getRemoteManagedSettingsSyncFromCache()).toBeNull()
    expect(getSessionSettingsCache()).toBe(staleMerged)
  })

  test('2. la primera lectura con éxito devuelve la capa y vacía el caché fusionado', () => {
    writeFileSync(getSettingsPath(), JSON.stringify({ model: 'remote' }))
    setEligibility(true)
    setSessionSettingsCache(staleMerged)
    expect(getRemoteManagedSettingsSyncFromCache()).toEqual({ model: 'remote' })
    expect(getSessionSettingsCache()).toBeNull()
  })

  test('3. las lecturas siguientes sirven la sesión y ya no vacían nada', () => {
    writeFileSync(getSettingsPath(), JSON.stringify({ model: 'remote' }))
    setEligibility(true)
    getRemoteManagedSettingsSyncFromCache()
    setSessionSettingsCache(staleMerged)
    expect(getRemoteManagedSettingsSyncFromCache()).toEqual({ model: 'remote' })
    expect(getSessionSettingsCache()).toBe(staleMerged)
  })

  test('4. elegible pero sin archivo: null, y el caché fusionado intacto', () => {
    setEligibility(true)
    setSessionSettingsCache(staleMerged)
    expect(getRemoteManagedSettingsSyncFromCache()).toBeNull()
    expect(getSessionSettingsCache()).toBe(staleMerged)
  })
})
