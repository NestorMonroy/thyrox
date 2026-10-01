/**
 * `installCliBindings` cablea `b8r`/`onRefusalFallbackRestored` al store
 * headless que crea `createHeadlessStore`. En 2.1.283, `b8r(() => {_r =
 * void 0})` limpia, en el runner headless (`chunk-ycnq45th.js`), un espejo
 * local del override de sesión que este árbol no porta todavía (vive en el
 * subsistema SDK headless de `cli`, fuera del alcance de este ítem — ver
 * docstring de `installCliBindings.ts`). El espejo equivalente que este
 * árbol SÍ tiene es `mainLoopModelForSession` en el propio `AppState` del
 * store headless, así que el callback lo limpia ahí.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { latchRefusalFallbackModel, resetStateForTests, setMainLoopModelOverride, switchSession } from '../../bootstrap/state.js'
import { wireRefusalFallbackRestoreForHeadlessStore } from '../installCliBindings.js'
import type { SessionId } from '@thyrox/agent/idTypes'

type FakeHeadlessState = { mainLoopModel: string | null; mainLoopModelForSession: string | null }

function fakeStore(initial: FakeHeadlessState) {
  let state = initial
  return {
    getState: () => state,
    setState: (updater: (prev: FakeHeadlessState) => FakeHeadlessState) => void (state = updater(state)),
  }
}

let unsubscribers: Array<() => void> = []
beforeEach(() => resetStateForTests())
afterEach(() => {
  for (const unsubscribe of unsubscribers) unsubscribe()
  unsubscribers = []
})

describe('wireRefusalFallbackRestoreForHeadlessStore', () => {
  test('una restauración de sesión dispara el callback y limpia el override de sesión', () => {
    const store = fakeStore({ mainLoopModel: 'claude-opus-5', mainLoopModelForSession: 'claude-opus-5' })
    unsubscribers.push(wireRefusalFallbackRestoreForHeadlessStore(store as never))

    latchRefusalFallbackModel({
      fallbackModel: 'claude-sonnet-5',
      previousOverride: 'claude-opus-5',
      previousAppStateModel: 'claude-opus-5',
      previousModelForSession: 'claude-opus-5',
    })
    setMainLoopModelOverride('claude-sonnet-5')

    switchSession('otra' as SessionId, 'resume')

    expect(store.getState().mainLoopModelForSession).toBeNull()
  })

  test('sin restauración no toca el store', () => {
    const store = fakeStore({ mainLoopModel: 'm', mainLoopModelForSession: 'm' })
    unsubscribers.push(wireRefusalFallbackRestoreForHeadlessStore(store as never))
    switchSession('nueva' as SessionId, 'resume')
    expect(store.getState().mainLoopModelForSession).toBe('m')
  })
})
