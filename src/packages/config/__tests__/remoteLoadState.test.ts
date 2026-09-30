/**
 * `remote/loadState.ts` porta `Ma`/`em`/`le()` de 2.1.283
 * (`chunk-379zyrv7.js`), recortado a los cuatro campos que un consumidor
 * futuro (`readRemotePolicy`, hoy sin este estado) necesita: `sessionCache`,
 * `verifiedPayload`, `projectedView` y `lastLoadStatus`.
 *
 * Los primeros dos `describe` prueban el contenedor solo, sin `host`
 * instalado ni fetch de por medio. El bloque de `remote/index.ts` prueba el
 * cableado: cada rama de `fetchAndLoadRemoteManagedSettings()` que SÍ se
 * puede alcanzar sin red real.
 *
 * Ciega a: la rama `{state:'ok', ...}` de una descarga que SÍ tuvo éxito —
 * en este árbol `getSettingsSyncAuth` de las pruebas nunca da credenciales
 * reales, así que todo fetch cae por la rama de auth antes de tocar la red.
 * Esa rama llama exactamente a los mismos tres métodos
 * (`recordSessionCache`/`recordProjectedView`/`setLastLoadStatus`) que las
 * pruebas 1-5 ya cubren con el estado 'ok' pasado directamente.
 */
import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { installConfigHostBindings } from '../host.js'
import { clearRemoteManagedSettingsCache, loadRemoteManagedSettings } from '../remote/index.js'
import { getRemoteLoadState, RemoteLoadState } from '../remote/loadState.js'
import { resetSyncCache } from '../remote/syncCache.js'
import { getSettingsPath } from '../remote/syncCacheState.js'
import type { SettingsJson } from '../settings/types.js'
import { InMemoryConfig } from '../testing/index.js'

const home = mkdtempSync(join(tmpdir(), 'remote-load-state-'))

function installBindings(eligible: boolean): void {
  installConfigHostBindings({
    ...new InMemoryConfig({ configHomeDir: home }).bindings,
    checkRemoteSettingsEligibility: () => eligible,
  })
}

beforeEach(() => {
  installBindings(true)
  resetSyncCache()
  getRemoteLoadState().reset()
  rmSync(join(home, 'remote-settings.json'), { force: true })
})

afterEach(async () => {
  await clearRemoteManagedSettingsCache()
})

afterAll(() => {
  rmSync(home, { recursive: true, force: true })
})

describe('RemoteLoadState', () => {
  test('1. recordSessionCache(valor, true) marca sessionCache y verifiedPayload', () => {
    const state = new RemoteLoadState<SettingsJson>()
    state.recordSessionCache({ model: 'a' }, true)
    expect(state.sessionCache).toEqual({ model: 'a' })
    expect(state.verifiedPayload).toEqual({ model: 'a' })
  })

  test('2. recordSessionCache(valor, false) sólo toca sessionCache', () => {
    const state = new RemoteLoadState<SettingsJson>()
    state.recordSessionCache({ model: 'verified' }, true)
    state.recordSessionCache({ model: 'stale' }, false)
    expect(state.sessionCache).toEqual({ model: 'stale' })
    expect(state.verifiedPayload).toEqual({ model: 'verified' })
  })

  test('3. recordProjectedView memoiza por identidad del crudo, como Xk()', () => {
    const state = new RemoteLoadState<SettingsJson>()
    const raw = { model: 'a' }
    const first = state.recordProjectedView(raw)
    const second = state.recordProjectedView(raw)
    expect(second).toBe(first)
    const third = state.recordProjectedView({ model: 'a' })
    expect(third).not.toBe(first)
  })

  test('4. setLastLoadStatus/lastLoadStatus hacen ida y vuelta con las cuatro variantes', () => {
    const state = new RemoteLoadState<SettingsJson>()
    state.setLastLoadStatus({ state: 'ineligible', reason: 'x' })
    expect(state.lastLoadStatus).toEqual({ state: 'ineligible', reason: 'x' })
    state.setLastLoadStatus({ state: 'ok', hasSettings: true })
    expect(state.lastLoadStatus).toEqual({ state: 'ok', hasSettings: true })
    const failure = { errorKind: 'fetch_failed', message: 'boom' }
    state.setLastLoadStatus({ state: 'stale_cache', failure, transportEnvWithheld: false })
    expect(state.lastLoadStatus).toEqual({ state: 'stale_cache', failure, transportEnvWithheld: false })
    state.setLastLoadStatus({ state: 'failed', failure })
    expect(state.lastLoadStatus).toEqual({ state: 'failed', failure })
  })

  test('5. reset() vacía los cuatro campos', () => {
    const state = new RemoteLoadState<SettingsJson>()
    state.recordSessionCache({ model: 'a' }, true)
    state.recordProjectedView({ model: 'a' })
    state.setLastLoadStatus({ state: 'ok', hasSettings: true })
    state.reset()
    expect(state.sessionCache).toBeNull()
    expect(state.verifiedPayload).toBeNull()
    expect(state.projectedView).toBeNull()
    expect(state.lastLoadStatus).toBeUndefined()
  })
})

describe('getRemoteLoadState', () => {
  test('6. con el mismo host instalado, devuelve siempre la misma instancia', () => {
    expect(getRemoteLoadState()).toBe(getRemoteLoadState())
  })

  test('7. un host nuevo obtiene una instancia nueva (se clava por identidad, no por una llave fija)', () => {
    const first = getRemoteLoadState()
    installConfigHostBindings(new InMemoryConfig({ configHomeDir: home }).bindings)
    const second = getRemoteLoadState()
    expect(second).not.toBe(first)
  })
})

describe('remote/index.ts registra el desenlace de cada carga en getRemoteLoadState()', () => {
  test('8. sin elegibilidad, la carga deja lastLoadStatus "ineligible"', async () => {
    installBindings(false)
    await loadRemoteManagedSettings()
    expect(getRemoteLoadState().lastLoadStatus).toEqual({
      state: 'ineligible',
      reason: 'user is not eligible for remote managed settings',
    })
  })

  test('9. elegible, sin auth instalada y sin caché en disco: "failed" y sessionCache intacto', async () => {
    await loadRemoteManagedSettings()
    const status = getRemoteLoadState().lastLoadStatus
    expect(status?.state).toBe('failed')
    expect(getRemoteLoadState().sessionCache).toBeNull()
  })

  test('10. elegible, sin auth instalada, con caché en disco: "stale_cache" y sessionCache servido', async () => {
    writeFileSync(getSettingsPath(), JSON.stringify({ model: 'cached' }))
    await loadRemoteManagedSettings()
    const status = getRemoteLoadState().lastLoadStatus
    expect(status?.state).toBe('stale_cache')
    expect(getRemoteLoadState().sessionCache).toEqual({ model: 'cached' })
    expect(getRemoteLoadState().verifiedPayload).toBeNull()
  })

  test('11. clearRemoteManagedSettingsCache() también resetea el estado de carga remota', async () => {
    getRemoteLoadState().recordSessionCache({ model: 'a' }, true)
    getRemoteLoadState().setLastLoadStatus({ state: 'ok', hasSettings: true })
    await clearRemoteManagedSettingsCache()
    expect(getRemoteLoadState().sessionCache).toBeNull()
    expect(getRemoteLoadState().lastLoadStatus).toBeUndefined()
  })
})
