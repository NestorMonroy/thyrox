/**
 * El enclavamiento del modelo de respaldo por rechazo de 2.1.283
 * (`chunk-nvht7ckf.js`, `modelSelection`): la marca de que ocurrió, la
 * cabecera armada, el carril silencioso, el enclavamiento con el modelo
 * previo (`Imt`, `a2r`, `fre`, `n7`, `l2r`) y su restauración (`mn`), que
 * `mh` y `vzr` pasan a los oyentes como tercer argumento de `fn`.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import {
  armRefusalFallbackHeader,
  armSilentLaneFromServer,
  forgetRefusalFallbackOccurred,
  getMainLoopModelOverride,
  getRefusalFallbackLatchOriginRequestId,
  getRefusalFallbackModelLatch,
  hasRefusalFallbackOccurred,
  isRefusalFallbackHeaderArmed,
  isSilentLaneServerArmed,
  latchRefusalFallbackModel,
  markRefusalFallbackOccurred,
  onSessionSwitch,
  regenerateSessionId,
  resetStateForTests,
  restoreRefusalFallbackModel,
  setMainLoopModelOverride,
  setRefusalFallbackPreviousOverride,
  switchSession,
  unlatchRefusalFallbackModel,
  type RefusalFallbackModelLatch,
} from '../state.js'
import type { SessionId } from '@thyrox/agent/idTypes'

const id = (value: string) => value as SessionId

const latch = (overrides: Partial<RefusalFallbackModelLatch> = {}): RefusalFallbackModelLatch => ({
  fallbackModel: 'claude-opus-5',
  previousOverride: 'claude-fable-5-1',
  previousAppStateModel: 'claude-fable-5-1',
  previousModelForSession: null,
  ...overrides,
})

let unsubscribers: Array<() => void> = []
beforeEach(() => resetStateForTests())
afterEach(() => {
  for (const unsubscribe of unsubscribers) unsubscribe()
  unsubscribers = []
})

function recordArguments(): unknown[][] {
  const seen: unknown[][] = []
  unsubscribers.push(onSessionSwitch((...args: unknown[]) => void seen.push(args)))
  return seen
}

describe('las marcas del rechazo (o2r, xmt, s2r, l2r)', () => {
  test('el primer id de petición queda como origen y forget lo borra todo', () => {
    expect([hasRefusalFallbackOccurred(), isRefusalFallbackHeaderArmed(), isSilentLaneServerArmed()]).toEqual([false, false, false])
    markRefusalFallbackOccurred('req_1')
    armRefusalFallbackHeader('req_2')
    armSilentLaneFromServer()
    expect([hasRefusalFallbackOccurred(), isRefusalFallbackHeaderArmed(), isSilentLaneServerArmed()]).toEqual([true, true, true])
    expect(getRefusalFallbackLatchOriginRequestId()).toBe('req_1')
    forgetRefusalFallbackOccurred()
    expect([hasRefusalFallbackOccurred(), isRefusalFallbackHeaderArmed(), isSilentLaneServerArmed()]).toEqual([false, false, false])
    expect(getRefusalFallbackLatchOriginRequestId()).toBeUndefined()
  })

  test('armar la cabecera fija el origen si nadie lo fijó', () => {
    armRefusalFallbackHeader('req_h')
    markRefusalFallbackOccurred('req_m')
    expect(getRefusalFallbackLatchOriginRequestId()).toBe('req_h')
    expect(hasRefusalFallbackOccurred()).toBe(true)
  })

  test('forget no suelta el enclavamiento del modelo', () => {
    latchRefusalFallbackModel(latch())
    forgetRefusalFallbackOccurred()
    expect(getRefusalFallbackModelLatch()).toEqual(latch())
  })
})

describe('el enclavamiento del modelo (Imt, a2r, fre, n7)', () => {
  test('enclava, se lee y se suelta', () => {
    expect(getRefusalFallbackModelLatch()).toBeUndefined()
    latchRefusalFallbackModel(latch())
    expect(getRefusalFallbackModelLatch()).toEqual(latch())
    unlatchRefusalFallbackModel()
    expect(getRefusalFallbackModelLatch()).toBeUndefined()
  })

  test('un segundo respaldo sobre el primero conserva el modelo previo original', () => {
    latchRefusalFallbackModel(latch())
    setMainLoopModelOverride('claude-opus-5')
    latchRefusalFallbackModel(latch({ fallbackModel: 'claude-sonnet-5', previousOverride: 'claude-opus-5', previousAppStateModel: 'claude-opus-5' }))
    expect(getRefusalFallbackModelLatch()).toEqual(latch({ fallbackModel: 'claude-sonnet-5' }))
  })

  test('si el modelo vigente ya no es el de respaldo, el enclavamiento se reemplaza', () => {
    latchRefusalFallbackModel(latch())
    setMainLoopModelOverride('claude-haiku-4-5')
    const next = latch({ fallbackModel: 'claude-sonnet-5', previousOverride: 'claude-haiku-4-5' })
    latchRefusalFallbackModel(next)
    expect(getRefusalFallbackModelLatch()).toEqual(next)
  })

  test('setRefusalFallbackPreviousOverride sólo actúa con enclavamiento', () => {
    setRefusalFallbackPreviousOverride('claude-sonnet-5')
    expect(getRefusalFallbackModelLatch()).toBeUndefined()
    latchRefusalFallbackModel(latch())
    setRefusalFallbackPreviousOverride(undefined)
    expect(getRefusalFallbackModelLatch()).toEqual(latch({ previousOverride: undefined }))
  })
})

describe('restoreRefusalFallbackModel (mn)', () => {
  test('con el modelo de respaldo vigente devuelve el previo y lo fija', () => {
    latchRefusalFallbackModel(latch())
    setMainLoopModelOverride('claude-opus-5')
    expect(restoreRefusalFallbackModel()).toEqual({
      appStateModel: 'claude-fable-5-1',
      forSessionValue: null,
      overrideValue: 'claude-fable-5-1',
      restoredToExplicitOverride: true,
      fallbackModel: 'claude-opus-5',
    })
    expect(getMainLoopModelOverride()).toBe('claude-fable-5-1')
    expect(getRefusalFallbackModelLatch()).toBeUndefined()
  })

  test('sin override previo no es una restauración explícita', () => {
    latchRefusalFallbackModel(latch({ previousOverride: undefined }))
    setMainLoopModelOverride('claude-opus-5')
    expect(restoreRefusalFallbackModel()?.restoredToExplicitOverride).toBe(false)
    expect(getMainLoopModelOverride()).toBeUndefined()
  })

  test('si el usuario cambió de modelo, suelta sin restaurar', () => {
    latchRefusalFallbackModel(latch())
    setMainLoopModelOverride('claude-haiku-4-5')
    expect(restoreRefusalFallbackModel()).toBeUndefined()
    expect(getMainLoopModelOverride()).toBe('claude-haiku-4-5')
    expect(getRefusalFallbackModelLatch()).toBeUndefined()
  })

  test('sin enclavamiento no hay nada que restaurar', () => {
    setMainLoopModelOverride('claude-opus-5')
    expect(restoreRefusalFallbackModel()).toBeUndefined()
    expect(getMainLoopModelOverride()).toBe('claude-opus-5')
  })
})

describe('el tercer argumento de la señal de sesión (fn)', () => {
  test('switchSession a otra sesión olvida el rechazo y pasa la restauración', () => {
    const seen = recordArguments()
    markRefusalFallbackOccurred('req')
    latchRefusalFallbackModel(latch())
    setMainLoopModelOverride('claude-opus-5')
    switchSession(id('otra'), 'resume')
    expect(seen).toHaveLength(1)
    expect(seen[0]).toEqual([id('otra'), 'resume', expect.objectContaining({ fallbackModel: 'claude-opus-5', overrideValue: 'claude-fable-5-1' })])
    expect(hasRefusalFallbackOccurred()).toBe(false)
    expect(getMainLoopModelOverride()).toBe('claude-fable-5-1')
  })

  test('la misma sesión no toca el enclavamiento y avisa con dos argumentos', () => {
    switchSession(id('igual'), 'resume')
    const seen = recordArguments()
    markRefusalFallbackOccurred('req')
    latchRefusalFallbackModel(latch())
    setMainLoopModelOverride('claude-opus-5')
    switchSession(id('igual'), 'cd')
    expect(seen).toEqual([[id('igual'), 'cd']])
    expect(seen[0]).toHaveLength(2)
    expect(hasRefusalFallbackOccurred()).toBe(true)
    expect(getRefusalFallbackModelLatch()).toEqual(latch())
  })

  test('sin restauración el oyente recibe dos argumentos', () => {
    const seen = recordArguments()
    switchSession(id('nueva'), 'resume')
    expect(seen).toEqual([[id('nueva'), 'resume']])
    expect(seen[0]).toHaveLength(2)
  })

  test('regenerateSessionId olvida, restaura y avisa clear con la restauración', () => {
    const seen = recordArguments()
    armRefusalFallbackHeader('req')
    latchRefusalFallbackModel(latch())
    setMainLoopModelOverride('claude-opus-5')
    const next = regenerateSessionId()
    expect(seen).toEqual([[next, 'clear', expect.objectContaining({ restoredToExplicitOverride: true })]])
    expect(isRefusalFallbackHeaderArmed()).toBe(false)
    expect(getMainLoopModelOverride()).toBe('claude-fable-5-1')
  })

  test('regenerateSessionId sin enclavamiento avisa con dos argumentos', () => {
    const seen = recordArguments()
    const next = regenerateSessionId()
    expect(seen).toEqual([[next, 'clear']])
    expect(seen[0]).toHaveLength(2)
  })
})
