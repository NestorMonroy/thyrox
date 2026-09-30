/**
 * Los oyentes de la restauración del modelo de respaldo de 2.1.283
 * (`chunk-6ff16z73.js`): `wt` lleva lo restaurado al estado de la
 * aplicación, `sA` avisa del cambio de modo rápido, `Pyt` suscribe `wt` a la
 * señal de sesión con su evento y `b8r` avisa sólo cuando hubo restauración.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import {
  getMainLoopModelOverride,
  latchRefusalFallbackModel,
  regenerateSessionId,
  resetStateForTests,
  setMainLoopModelOverride,
  switchSession,
  type RefusalFallbackRestore,
} from '../../bootstrap/state.js'
import {
  applyRefusalFallbackRestore,
  onRefusalFallbackRestored,
  reportFastModeToggle,
  subscribeRefusalFallbackReset,
  type RefusalFallbackRestoreDeps,
  type RestorableAppState,
} from '../refusalFallbackRestore.js'
import type { SessionId } from '@thyrox/agent/idTypes'

type Event = [string, Record<string, unknown>]

function harness(overrides: Partial<RefusalFallbackRestoreDeps> = {}) {
  const events: Event[] = []
  const overrides_: unknown[] = []
  const deps: RefusalFallbackRestoreDeps = {
    fastModeEnabled: () => true,
    resolveFastMode: (model, fastMode) => model === 'claude-opus-5' && !!fastMode,
    hasRemoteControlChannel: () => false,
    logEvent: (name, metadata) => void events.push([name, metadata]),
    overrideMainLoopModel: model => void overrides_.push(model),
    modelScope: () => 'catalog_flag',
    ...overrides,
  }
  return { deps, events, overrides: overrides_ }
}

function store(initial: RestorableAppState & { other?: number }) {
  let state = initial
  const setAppState = (updater: (previous: typeof state) => typeof state) => void (state = updater(state))
  return { setAppState, get: () => state }
}

const restore = (overrides: Partial<RefusalFallbackRestore> = {}): RefusalFallbackRestore => ({
  appStateModel: 'claude-opus-5',
  forSessionValue: null,
  overrideValue: 'claude-opus-5',
  restoredToExplicitOverride: true,
  fallbackModel: 'claude-sonnet-5',
  ...overrides,
})

let unsubscribers: Array<() => void> = []
beforeEach(() => resetStateForTests())
afterEach(() => {
  for (const unsubscribe of unsubscribers) unsubscribe()
  unsubscribers = []
})

describe('reportFastModeToggle (sA)', () => {
  test('avisa sólo si el modo rápido cambió, con su origen', () => {
    const { deps, events } = harness({ hasRemoteControlChannel: () => true })
    reportFastModeToggle(true, true, deps)
    reportFastModeToggle(undefined, false, deps)
    reportFastModeToggle(false, true, deps)
    reportFastModeToggle(true, false, deps)
    expect(events).toEqual([
      ['tengu_fast_mode_toggled', { enabled: true, source: 'model_switch_restore', remote: true }],
      ['tengu_fast_mode_toggled', { enabled: false, source: 'model_switch_downgrade', remote: true }],
    ])
  })
})

describe('applyRefusalFallbackRestore (wt)', () => {
  test('lleva el modelo previo al estado, resuelve el modo rápido y fija el override', () => {
    const { deps, events, overrides } = harness()
    const app = store({ mainLoopModel: 'claude-sonnet-5', mainLoopModelForSession: 'x', fastMode: true, other: 1 })
    applyRefusalFallbackRestore(restore(), app.setAppState, deps)
    expect(app.get()).toEqual({ mainLoopModel: 'claude-opus-5', mainLoopModelForSession: null, fastMode: true, other: 1 })
    expect(events).toEqual([])
    expect(overrides).toEqual(['claude-opus-5'])
  })

  test('el modelo para resolver es override, luego el de sesión, luego el del estado', () => {
    const seen: unknown[] = []
    const { deps } = harness({ resolveFastMode: model => (seen.push(model), false) })
    const app = store({ mainLoopModel: null, mainLoopModelForSession: null, fastMode: false })
    applyRefusalFallbackRestore(restore(), app.setAppState, deps)
    applyRefusalFallbackRestore(restore({ overrideValue: undefined, forSessionValue: 'sesion' }), app.setAppState, deps)
    applyRefusalFallbackRestore(restore({ overrideValue: undefined, forSessionValue: null, appStateModel: 'estado' }), app.setAppState, deps)
    expect(seen).toEqual(['claude-opus-5', 'sesion', 'estado'])
  })

  test('sin modo rápido habilitado conserva el valor del estado', () => {
    const { deps } = harness({ fastModeEnabled: () => false, resolveFastMode: () => false })
    const app = store({ mainLoopModel: 'a', mainLoopModelForSession: null, fastMode: true })
    applyRefusalFallbackRestore(restore(), app.setAppState, deps)
    expect(app.get().fastMode).toBe(true)
  })

  test('si nada cambia devuelve el mismo estado', () => {
    const { deps } = harness()
    const initial = { mainLoopModel: 'claude-opus-5', mainLoopModelForSession: null, fastMode: true }
    const app = store(initial)
    applyRefusalFallbackRestore(restore(), app.setAppState, deps)
    expect(app.get()).toBe(initial)
  })

  test('un cambio de modo rápido se avisa', () => {
    const { deps, events } = harness()
    const app = store({ mainLoopModel: 'a', mainLoopModelForSession: null, fastMode: true })
    applyRefusalFallbackRestore(restore({ appStateModel: 'b', overrideValue: 'b' }), app.setAppState, deps)
    expect(app.get().fastMode).toBe(false)
    expect(events).toEqual([['tengu_fast_mode_toggled', { enabled: false, source: 'model_switch_downgrade', remote: false }]])
  })

  test('un setAppState que no llama al actualizador no avisa, pero fija el override', () => {
    const { deps, events, overrides } = harness()
    applyRefusalFallbackRestore(restore({ overrideValue: undefined }), () => {}, deps)
    expect(events).toEqual([])
    expect(overrides).toEqual([undefined])
  })
})

describe('subscribeRefusalFallbackReset (Pyt) y onRefusalFallbackRestored (b8r)', () => {
  function latchAndDiverge() {
    latchRefusalFallbackModel({
      fallbackModel: 'claude-sonnet-5',
      previousOverride: 'claude-opus-5',
      previousAppStateModel: 'claude-opus-5',
      previousModelForSession: null,
    })
    setMainLoopModelOverride('claude-sonnet-5')
  }

  test('al restaurarse aplica al estado y emite el evento de reinicio', () => {
    const { deps, events } = harness({ overrideMainLoopModel: setMainLoopModelOverride })
    const app = store({ mainLoopModel: 'claude-sonnet-5', mainLoopModelForSession: null, fastMode: false })
    unsubscribers.push(subscribeRefusalFallbackReset(app.setAppState, deps))
    latchAndDiverge()
    switchSession('otra' as SessionId, 'resume')
    expect(app.get().mainLoopModel).toBe('claude-opus-5')
    expect(getMainLoopModelOverride()).toBe('claude-opus-5')
    expect(events).toEqual([
      ['tengu_refusal_fallback_latch_reset', { source: 'resume', restored_to_explicit_override: true, model_scope: 'catalog_flag' }],
    ])
  })

  test('sin override previo el reinicio no es explícito', () => {
    const { deps, events } = harness()
    unsubscribers.push(subscribeRefusalFallbackReset(store({ mainLoopModel: null, mainLoopModelForSession: null }).setAppState, deps))
    latchRefusalFallbackModel({
      fallbackModel: 'claude-sonnet-5',
      previousOverride: undefined,
      previousAppStateModel: null,
      previousModelForSession: null,
    })
    setMainLoopModelOverride('claude-sonnet-5')
    regenerateSessionId()
    expect(events.at(-1)).toEqual(['tengu_refusal_fallback_latch_reset', { source: 'clear', restored_to_explicit_override: false, model_scope: 'catalog_flag' }])
  })

  test('el alcance del modelo se pide sobre el modelo de respaldo', () => {
    const asked: unknown[] = []
    const { deps } = harness({ modelScope: model => (asked.push(model), 'other') })
    unsubscribers.push(subscribeRefusalFallbackReset(store({ mainLoopModel: null, mainLoopModelForSession: null }).setAppState, deps))
    latchAndDiverge()
    regenerateSessionId()
    expect(asked).toEqual(['claude-sonnet-5'])
  })

  test('sin restauración no hace nada; desuscrito tampoco', () => {
    const { deps, events } = harness()
    const app = store({ mainLoopModel: 'm', mainLoopModelForSession: null })
    const unsubscribe = subscribeRefusalFallbackReset(app.setAppState, deps)
    switchSession('nueva' as SessionId, 'resume')
    expect(events).toEqual([])
    unsubscribe()
    latchAndDiverge()
    switchSession('otra' as SessionId, 'resume')
    expect(events).toEqual([])
    expect(app.get().mainLoopModel).toBe('m')
  })

  test('onRefusalFallbackRestored avisa sólo cuando hubo restauración', () => {
    let calls = 0
    unsubscribers.push(onRefusalFallbackRestored(() => void calls++))
    switchSession('nueva' as SessionId, 'resume')
    expect(calls).toBe(0)
    latchAndDiverge()
    switchSession('otra' as SessionId, 'resume')
    expect(calls).toBe(1)
  })
})
