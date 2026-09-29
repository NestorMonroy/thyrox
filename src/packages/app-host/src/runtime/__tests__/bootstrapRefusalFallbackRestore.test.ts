/**
 * `installRuntimeSkeletonBindings` suscribe la restauración del modelo de
 * respaldo (`Pyt`/`subscribeRefusalFallbackReset`) al store interactivo justo
 * tras crearlo — en 2.1.283, `Pyt(Z.setState)` corre pegado a
 * `Me.engineStore.adopt(Z)` (`chunk-fa2jy0nf.js`), antes de resolver
 * permisos. Aquí se mide la función que hace ese cableado, sin levantar la
 * cadena entera de `installRuntimeSkeletonBindings` (que exige
 * `@thyrox/agent` con sus dependencias de host completas).
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import {
  getMainLoopModelOverride,
  latchRefusalFallbackModel,
  resetStateForTests,
  setMainLoopModelOverride,
  switchSession,
  type RefusalFallbackRestore,
} from '../../bootstrap/state.js'
import { wireRefusalFallbackRestoreForInteractiveStore } from '../bootstrap.js'
import type { SessionId } from '@thyrox/agent/idTypes'

type FakeAppState = {
  mainLoopModel: RefusalFallbackRestore['appStateModel']
  mainLoopModelForSession: RefusalFallbackRestore['forSessionValue']
  fastMode?: boolean
}

function fakeStore(initial: FakeAppState) {
  let state = initial
  return {
    getState: () => state,
    setState: (updater: (prev: FakeAppState) => FakeAppState) => void (state = updater(state)),
    subscribe: () => () => {},
  }
}

let unsubscribers: Array<() => void> = []
const originalDisableFastMode = process.env.THYROX_CODE_DISABLE_FAST_MODE

beforeEach(() => {
  resetStateForTests()
  // `isFastModeEnabled` exige credenciales reales para consultar la
  // suscripción cuando el modo rápido está encendido; se apaga aquí para
  // medir sólo la reescritura de `mainLoopModel`/`mainLoopModelForSession`.
  process.env.THYROX_CODE_DISABLE_FAST_MODE = '1'
})
afterEach(() => {
  for (const unsubscribe of unsubscribers) unsubscribe()
  unsubscribers = []
  if (originalDisableFastMode === undefined) delete process.env.THYROX_CODE_DISABLE_FAST_MODE
  else process.env.THYROX_CODE_DISABLE_FAST_MODE = originalDisableFastMode
})

describe('wireRefusalFallbackRestoreForInteractiveStore', () => {
  test('una restauración de sesión reescribe el estado del store interactivo', () => {
    const store = fakeStore({ mainLoopModel: 'claude-sonnet-5', mainLoopModelForSession: null, fastMode: false })
    unsubscribers.push(wireRefusalFallbackRestoreForInteractiveStore(store as never))

    latchRefusalFallbackModel({
      fallbackModel: 'claude-sonnet-5',
      previousOverride: 'claude-opus-5',
      previousAppStateModel: 'claude-opus-5',
      previousModelForSession: null,
    })
    setMainLoopModelOverride('claude-sonnet-5')

    switchSession('otra' as SessionId, 'resume')

    expect(store.getState().mainLoopModel).toBe('claude-opus-5')
    expect(getMainLoopModelOverride()).toBe('claude-opus-5')
  })

  test('sin restauración no toca el store', () => {
    const store = fakeStore({ mainLoopModel: 'm', mainLoopModelForSession: null })
    unsubscribers.push(wireRefusalFallbackRestoreForInteractiveStore(store as never))
    switchSession('nueva' as SessionId, 'resume')
    expect(store.getState().mainLoopModel).toBe('m')
  })
})

