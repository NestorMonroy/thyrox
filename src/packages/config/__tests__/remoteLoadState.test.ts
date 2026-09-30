/**
 * `remote/loadState.ts` porta `Ma`/`em`/`le()` de 2.1.283
 * (`chunk-379zyrv7.js`) entero, más la capa de accesores de una línea que la
 * fuente pone encima (`jye`, `sgn`, `P5n`, `B1r`, `f8e`, `$v`, `sft`, `j1r`,
 * `W1r`, `G1r`, `z1r`, `V1r`, `Ine`, `MUt`, `ign`, `jx`, `DUt`, `cUe`, `q1r`,
 * `S$o`). `remote/syncCache.ts` porta `_x` (la elegibilidad memoizada) y
 * `remote/syncCacheState.ts` porta `lgn` (el crudo: sesión o disco, sembrando
 * el estado).
 *
 * Los tres primeros `describe` prueban el contenedor y sus accesores con un
 * host instalado y sin fetch. Los dos siguientes prueban `_x` y `lgn`. El
 * último prueba el cableado de `remote/index.ts`: cada rama de
 * `fetchAndLoadRemoteManagedSettings()` que SÍ se puede alcanzar sin red.
 *
 * Ciega a: la rama `{state:'ok', ...}` de una descarga que SÍ tuvo éxito —
 * en este árbol `getSettingsSyncAuth` de las pruebas nunca da credenciales
 * reales, así que todo fetch cae por la rama de auth antes de tocar la red.
 * Esa rama llama a `replaceRemoteSessionCache`/`markRemotePayloadConsented`/
 * `setRemoteLoadStatus`, que las pruebas de los accesores ya cubren.
 */
import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { installConfigHostBindings } from '../host.js'
import { clearRemoteManagedSettingsCache, loadRemoteManagedSettings } from '../remote/index.js'
import {
  dropRemoteConsentDeferral,
  getConsentedRemotePayload,
  getRemoteEligibilityMemo,
  getRemoteIneligibleReason,
  getRemoteLoadState,
  getRemoteLoadStatus,
  getRemoteResetEpoch,
  getRemoteSettingsOverridePath,
  isEvalPolicySnapshotOnly,
  isPolicySettingsNotified,
  isRemoteSessionCacheConsented,
  isRemoteSessionCacheVerified,
  isServedSnapshot,
  markPolicySettingsNotified,
  markRemotePayloadConsented,
  recordRemoteEligibility,
  registerSyncCacheResetListener,
  RemoteLoadState,
  replaceRemoteSessionCache,
  resetRemoteLoadState,
  setEvalPolicySnapshotOnly,
  setRemoteLoadStatus,
  Signal,
  subscribeRemoteLoadStatus,
} from '../remote/loadState.js'
import { isRemoteManagedSettingsEligible, resetSyncCache } from '../remote/syncCache.js'
import { getRemoteManagedSettingsSyncFromCache, getSettingsPath, setEligibility } from '../remote/syncCacheState.js'
import { getSessionSettingsCache, setSessionSettingsCache } from '../settings/settingsCache.js'
import type { SettingsJson } from '../settings/types.js'
import { InMemoryConfig } from '../testing/index.js'

const home = mkdtempSync(join(tmpdir(), 'remote-load-state-'))

function installBindings(eligible: boolean, onCheck?: () => void): void {
  installConfigHostBindings({
    ...new InMemoryConfig({ configHomeDir: home }).bindings,
    checkRemoteSettingsEligibility: () => {
      onCheck?.()
      return eligible
    },
  })
}

beforeEach(() => {
  installBindings(true)
  resetSyncCache()
  rmSync(join(home, 'remote-settings.json'), { force: true })
  delete process.env.THYROX_CODE_EVAL_CONFINED
})

afterEach(async () => {
  await clearRemoteManagedSettingsCache()
})

afterAll(() => {
  rmSync(home, { recursive: true, force: true })
})

describe('Signal (He)', () => {
  test('1. subscribe devuelve la baja; emit reparte a los suscritos vivos', () => {
    const signal = new Signal<[number]>()
    const seen: number[] = []
    const unsubscribe = signal.subscribe(value => seen.push(value))
    signal.emit(1)
    unsubscribe()
    signal.emit(2)
    expect(seen).toEqual([1])
  })

  test('2. un listener que lanza no impide a los demás; el error sale al final', () => {
    const signal = new Signal<[]>()
    const seen: string[] = []
    signal.subscribe(() => {
      throw new Error('first')
    })
    signal.subscribe(() => seen.push('second'))
    expect(() => signal.emit()).toThrow('first')
    expect(seen).toEqual(['second'])
  })

  test('3. dos listeners que lanzan salen como AggregateError; clear() vacía la lista', () => {
    const signal = new Signal<[]>()
    signal.subscribe(() => {
      throw new Error('a')
    })
    signal.subscribe(() => {
      throw new Error('b')
    })
    expect(() => signal.emit()).toThrow(AggregateError)
    signal.clear()
    expect(() => signal.emit()).not.toThrow()
  })
})

describe('RemoteLoadState (Ma)', () => {
  test('4. replaceSessionCache sin opciones sólo toca sessionCache', () => {
    const state = new RemoteLoadState<SettingsJson>()
    state.replaceSessionCache({ model: 'stale' })
    expect(state.sessionCache).toEqual({ model: 'stale' })
    expect(state.verifiedPayload).toBeNull()
    expect(state.deferredPayload).toBeNull()
  })

  test('5. replaceSessionCache con verified marca verifiedPayload; con consentDeferred, también deferredPayload', () => {
    const state = new RemoteLoadState<SettingsJson>()
    const verified = { model: 'verified' }
    state.replaceSessionCache(verified, { verified: true })
    expect(state.verifiedPayload).toBe(verified)
    expect(state.deferredPayload).toBeNull()
    const deferred = { model: 'deferred' }
    state.replaceSessionCache(deferred, { verified: true, consentDeferred: true })
    expect(state.verifiedPayload).toBe(deferred)
    expect(state.deferredPayload).toBe(deferred)
  })

  test('6. seedFromDisk siembra sessionCache y consiente sólo la primera vez, y sólo si la atestación lo permite', () => {
    const state = new RemoteLoadState<SettingsJson>()
    const first = { model: 'first' }
    state.seedFromDisk(first)
    expect(state.sessionCache).toBe(first)
    expect(state.consentedPayload).toBe(first)
    const second = { model: 'second' }
    state.seedFromDisk(second)
    expect(state.sessionCache).toBe(second)
    expect(state.consentedPayload).toBe(first)
    const fresh = new RemoteLoadState<SettingsJson>()
    fresh.seedFromDisk({ model: 'dangerous' }, () => false)
    expect(fresh.sessionCache).toEqual({ model: 'dangerous' })
    expect(fresh.consentedPayload).toBeNull()
  })

  test('7. markConsented y dropConsentDeferral', () => {
    const state = new RemoteLoadState<SettingsJson>()
    const payload = { model: 'a' }
    state.replaceSessionCache(payload, { verified: true, consentDeferred: true })
    state.markConsented(payload)
    expect(state.consentedPayload).toBe(payload)
    state.dropConsentDeferral()
    expect(state.deferredPayload).toBeNull()
  })

  test('8. recordEligibility sin memoize fija eligible y no el memo; con memoize fija memo y razón', () => {
    const state = new RemoteLoadState<SettingsJson>()
    state.recordEligibility(true, { memoize: false })
    expect(state.eligible).toBe(true)
    expect(state.eligibilityMemo).toBeUndefined()
    state.recordEligibility(false, { memoize: true, ineligibleReason: 'no auth' })
    expect(state.eligibilityMemo).toBe(false)
    expect(state.ineligibleReason).toBe('no auth')
    state.recordEligibility(true, { memoize: true, ineligibleReason: 'ignored' })
    expect(state.ineligibleReason).toBeUndefined()
  })

  test('9. registerResetListener rehúsa un segundo listener nombrando el motivo', () => {
    const state = new RemoteLoadState<SettingsJson>()
    state.registerResetListener(() => {})
    expect(() => state.registerResetListener(() => {})).toThrow(
      'registerSyncCacheResetListener: a listener is already registered; a second one would unhook the first',
    )
  })

  test('10. reset() vacía el estado, sube resetEpoch, conserva el listener y emite undefined', () => {
    const state = new RemoteLoadState<SettingsJson>()
    const emitted: unknown[] = []
    state.lastLoadStatusChanged.subscribe(status => emitted.push(status))
    const listener = () => {}
    state.registerResetListener(listener)
    state.replaceSessionCache({ model: 'a' }, { verified: true, consentDeferred: true })
    state.seedFromDisk({ model: 'a' })
    state.recordEligibility(true, { memoize: true })
    state.evalPolicySnapshotOnly = true
    state.lastLoadStatus = { state: 'ok', hasSettings: true }
    state.markPolicySettingsNotified()
    state.reset()
    expect(state.sessionCache).toBeNull()
    expect(state.eligible).toBeUndefined()
    expect(state.eligibilityMemo).toBeUndefined()
    expect(state.ineligibleReason).toBeUndefined()
    expect(state.evalPolicySnapshotOnly).toBe(false)
    expect(state.lastLoadStatus).toBeUndefined()
    expect(state.policySettingsNotified).toBe(false)
    expect(state.verifiedPayload).toBeNull()
    expect(state.unverifiedView).toBeNull()
    expect(state.projectedView).toBeNull()
    expect(state.consentedPayload).toBeNull()
    expect(state.deferredPayload).toBeNull()
    expect(state.resetEpoch).toBe(1)
    expect(state.resetListener).toBe(listener)
    expect(emitted).toEqual([undefined])
  })

  test('11. emitLoadStatusChanged traga el error de un listener y lo reporta al host', () => {
    const logged: string[] = []
    installConfigHostBindings({
      ...new InMemoryConfig({ configHomeDir: home }).bindings,
      logDebug: message => logged.push(message),
    })
    const state = new RemoteLoadState<SettingsJson>()
    state.lastLoadStatusChanged.subscribe(() => {
      throw new Error('listener boom')
    })
    expect(() => state.emitLoadStatusChanged({ state: 'ok', hasSettings: false })).not.toThrow()
    expect(logged.some(message => message.includes('load-status listener threw') && message.includes('listener boom'))).toBe(true)
  })
})

describe('los accesores sobre le()', () => {
  test('12. con el mismo host instalado, getRemoteLoadState devuelve siempre la misma instancia', () => {
    expect(getRemoteLoadState()).toBe(getRemoteLoadState())
  })

  test('13. un host nuevo obtiene una instancia nueva (se clava por identidad, no por una llave fija)', () => {
    const first = getRemoteLoadState()
    installConfigHostBindings(new InMemoryConfig({ configHomeDir: home }).bindings)
    expect(getRemoteLoadState()).not.toBe(first)
  })

  test('14. setRemoteLoadStatus (ign) guarda y emite; subscribeRemoteLoadStatus (DUt) recibe hasta darse de baja', () => {
    const seen: unknown[] = []
    const unsubscribe = subscribeRemoteLoadStatus(status => seen.push(status))
    setRemoteLoadStatus({ state: 'ineligible', reason: 'x' })
    expect(getRemoteLoadStatus()).toEqual({ state: 'ineligible', reason: 'x' })
    const failure = { errorKind: 'ruled_empty', message: 'boom', rulings: [] }
    setRemoteLoadStatus({ state: 'stale_cache', failure, transportEnvWithheld: true })
    setRemoteLoadStatus({ state: 'failed', failure })
    unsubscribe()
    setRemoteLoadStatus({ state: 'ok', hasSettings: true })
    expect(seen).toEqual([
      { state: 'ineligible', reason: 'x' },
      { state: 'stale_cache', failure, transportEnvWithheld: true },
      { state: 'failed', failure },
    ])
    expect(getRemoteLoadStatus()).toEqual({ state: 'ok', hasSettings: true })
  })

  test('15. replaceRemoteSessionCache (f8e) invalida la caché de settings fusionados', () => {
    setSessionSettingsCache({ settings: {}, errors: [] })
    replaceRemoteSessionCache({ model: 'a' })
    expect(getSessionSettingsCache()).toBeNull()
    expect(getRemoteLoadState().sessionCache).toEqual({ model: 'a' })
  })

  test('16. $v y sft: verificado exige identidad con verifiedPayload; consentido, además con consented o deferred', () => {
    const payload = { model: 'a' }
    expect(isRemoteSessionCacheVerified()).toBe(false)
    replaceRemoteSessionCache(payload)
    expect(isRemoteSessionCacheVerified()).toBe(false)
    replaceRemoteSessionCache(payload, { verified: true })
    expect(isRemoteSessionCacheVerified()).toBe(true)
    expect(isRemoteSessionCacheConsented()).toBe(false)
    markRemotePayloadConsented(payload)
    expect(getConsentedRemotePayload()).toBe(payload)
    expect(isRemoteSessionCacheConsented()).toBe(true)
    const deferred = { model: 'b' }
    replaceRemoteSessionCache(deferred, { verified: true, consentDeferred: true })
    expect(isRemoteSessionCacheConsented()).toBe(true)
    dropRemoteConsentDeferral()
    expect(isRemoteSessionCacheConsented()).toBe(false)
  })

  test('17. resetRemoteLoadState (W1r) resetea, sube la época y llama al listener registrado (j1r)', () => {
    let calls = 0
    registerSyncCacheResetListener(() => calls++)
    replaceRemoteSessionCache({ model: 'a' })
    const epoch = getRemoteResetEpoch()
    resetRemoteLoadState()
    expect(calls).toBe(1)
    expect(getRemoteResetEpoch()).toBe(epoch + 1)
    expect(getRemoteLoadState().sessionCache).toBeNull()
  })

  test('18. recordRemoteEligibility (V1r) memoiza y devuelve el valor; Ine y MUt lo leen', () => {
    expect(recordRemoteEligibility(false, 'no auth')).toBe(false)
    expect(getRemoteEligibilityMemo()).toBe(false)
    expect(getRemoteIneligibleReason()).toBe('no auth')
    expect(recordRemoteEligibility(true)).toBe(true)
    expect(getRemoteIneligibleReason()).toBeUndefined()
  })

  test('19. cUe/q1r y G1r/z1r hacen ida y vuelta', () => {
    expect(isEvalPolicySnapshotOnly()).toBe(false)
    setEvalPolicySnapshotOnly(true)
    expect(isEvalPolicySnapshotOnly()).toBe(true)
    expect(isPolicySettingsNotified()).toBe(false)
    markPolicySettingsNotified()
    expect(isPolicySettingsNotified()).toBe(true)
  })

  test('20. isServedSnapshot (S$o) es verdadero sólo para la vista proyectada servida', () => {
    const raw = { model: 'a' }
    expect(isServedSnapshot(null)).toBe(false)
    expect(isServedSnapshot(raw)).toBe(false)
    getRemoteLoadState().projectedView = { raw, view: raw }
    expect(isServedSnapshot(raw)).toBe(true)
    expect(isServedSnapshot({ model: 'a' })).toBe(false)
  })

  test('21. JE está compilado a nada en 2.1.283: no hay archivo de anulación', () => {
    expect(getRemoteSettingsOverridePath()).toBeUndefined()
  })
})

describe('isRemoteManagedSettingsEligible (_x)', () => {
  test('22. memoiza en el estado: la segunda llamada no vuelve al host, y la razón queda registrada', () => {
    let checks = 0
    installBindings(false, () => checks++)
    expect(isRemoteManagedSettingsEligible()).toBe(false)
    expect(isRemoteManagedSettingsEligible()).toBe(false)
    expect(checks).toBe(1)
    expect(getRemoteEligibilityMemo()).toBe(false)
    expect(getRemoteIneligibleReason()).toBe('user is not eligible for remote managed settings')
    expect(isEvalPolicySnapshotOnly()).toBe(false)
  })

  test('23. el hijo confinado (THYROX_CODE_EVAL_CONFINED) sin elegibilidad sirve sólo la instantánea y cuenta como elegible', () => {
    installBindings(false)
    process.env.THYROX_CODE_EVAL_CONFINED = '1'
    expect(isRemoteManagedSettingsEligible()).toBe(true)
    expect(isEvalPolicySnapshotOnly()).toBe(true)
    expect(getRemoteIneligibleReason()).toBeUndefined()
  })

  test('24. un elegible de verdad no queda en modo instantánea aunque esté confinado', () => {
    process.env.THYROX_CODE_EVAL_CONFINED = '1'
    expect(isRemoteManagedSettingsEligible()).toBe(true)
    expect(isEvalPolicySnapshotOnly()).toBe(false)
  })

  test('25. resetSyncCache resetea el estado (W1r): la elegibilidad se vuelve a consultar', () => {
    let checks = 0
    installBindings(true, () => checks++)
    isRemoteManagedSettingsEligible()
    resetSyncCache()
    isRemoteManagedSettingsEligible()
    expect(checks).toBe(2)
  })
})

describe('getRemoteManagedSettingsSyncFromCache (lgn)', () => {
  test('26. sin elegibilidad registrada da null aunque haya disco', () => {
    writeFileSync(getSettingsPath(), JSON.stringify({ model: 'cached' }))
    expect(getRemoteManagedSettingsSyncFromCache()).toBeNull()
  })

  test('27. elegible: sirve la caché de sesión si la hay, sin tocar el disco', () => {
    setEligibility(true)
    replaceRemoteSessionCache({ model: 'session' })
    writeFileSync(getSettingsPath(), JSON.stringify({ model: 'disk' }))
    expect(getRemoteManagedSettingsSyncFromCache()).toEqual({ model: 'session' })
  })

  test('28. elegible sin sesión: siembra el estado desde disco (seedFromDisk) y vacía la caché fusionada', () => {
    setEligibility(true)
    writeFileSync(getSettingsPath(), JSON.stringify({ model: 'disk' }))
    setSessionSettingsCache({ settings: {}, errors: [] })
    const first = getRemoteManagedSettingsSyncFromCache()
    expect(first).toEqual({ model: 'disk' })
    expect(getRemoteLoadState().sessionCache).toBe(first)
    expect(getRemoteLoadState().consentedPayload).toBe(first)
    expect(getRemoteLoadState().verifiedPayload).toBeNull()
    expect(getSessionSettingsCache()).toBeNull()
    expect(getRemoteManagedSettingsSyncFromCache()).toBe(first)
  })
})

describe('remote/index.ts registra el desenlace de cada carga en el estado', () => {
  test('29. sin elegibilidad, la carga deja lastLoadStatus "ineligible" con la razón registrada (MUt)', async () => {
    installBindings(false)
    await loadRemoteManagedSettings()
    expect(getRemoteLoadStatus()).toEqual({
      state: 'ineligible',
      reason: 'user is not eligible for remote managed settings',
    })
  })

  test('30. elegible, sin auth instalada y sin caché en disco: "failed" y sessionCache intacto', async () => {
    await loadRemoteManagedSettings()
    expect(getRemoteLoadStatus()?.state).toBe('failed')
    expect(getRemoteLoadState().sessionCache).toBeNull()
  })

  test('31. elegible, sin auth instalada, con caché en disco: "stale_cache", sessionCache servido sin verificar y transporte retenido', async () => {
    writeFileSync(getSettingsPath(), JSON.stringify({ model: 'cached' }))
    await loadRemoteManagedSettings()
    const status = getRemoteLoadStatus()
    expect(status?.state).toBe('stale_cache')
    expect(status?.state === 'stale_cache' && status.transportEnvWithheld).toBe(true)
    expect(getRemoteLoadState().sessionCache).toEqual({ model: 'cached' })
    expect(getRemoteLoadState().verifiedPayload).toBeNull()
    expect(getRemoteLoadState().projectedView).toBeNull()
  })

  test('32. clearRemoteManagedSettingsCache() también resetea el estado de carga remota', async () => {
    replaceRemoteSessionCache({ model: 'a' }, { verified: true })
    setRemoteLoadStatus({ state: 'ok', hasSettings: true })
    await clearRemoteManagedSettingsCache()
    expect(getRemoteLoadState().sessionCache).toBeNull()
    expect(getRemoteLoadStatus()).toBeUndefined()
  })
})
