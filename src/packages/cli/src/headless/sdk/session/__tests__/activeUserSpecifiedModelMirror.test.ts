/**
 * Porte de `b8r` (`chunk-ycnq45th.js`, runner headless de 2.1.283): el
 * espejo local `_r`/`activeUserSpecifiedModel` de `run-streaming.ts` se
 * olvida cuando un cambio de sesión deshace el modelo de respaldo por
 * rechazo, para que el runner no vuelva a aplicar el override que la
 * restauración acaba de deshacer.
 */
import { describe, expect, test } from 'bun:test'

import { readFileSync } from 'fs'
import { resolve } from 'path'

import {
  latchRefusalFallbackModel,
  resetStateForTests,
  setMainLoopModelOverride,
  switchSession,
} from '@thyrox/app-host/bootstrap/state.js'
import { onRefusalFallbackRestored } from '@thyrox/app-host/state/refusalFallbackRestore.js'
import type { SessionId } from '@thyrox/agent/idTypes'

const source = readFileSync(
  resolve(__dirname, '..', 'run-streaming.ts'),
  'utf-8',
)

describe('activeUserSpecifiedModel se suscribe a onRefusalFallbackRestored (b8r)', () => {
  test('la declaración y la suscripción viven en runHeadlessStreaming, en ese orden', () => {
    const fnStart = source.indexOf('export function runHeadlessStreaming')
    expect(fnStart).toBeGreaterThan(-1)
    const fnEnd = source.indexOf('\nexport function', fnStart + 1)
    const body = source.slice(fnStart, fnEnd === -1 ? undefined : fnEnd)

    const declIndex = body.indexOf('let activeUserSpecifiedModel = options.userSpecifiedModel')
    expect(declIndex).toBeGreaterThan(-1)

    const subscribeIndex = body.indexOf('onRefusalFallbackRestored(')
    expect(subscribeIndex).toBeGreaterThan(declIndex)

    const callbackSlice = body.slice(subscribeIndex, subscribeIndex + 200)
    expect(callbackSlice).toMatch(/activeUserSpecifiedModel\s*=\s*undefined/)
  })

  test('la desuscripción se registra con registerCleanup', () => {
    const subscribeIndex = source.indexOf('onRefusalFallbackRestored(')
    expect(subscribeIndex).toBeGreaterThan(-1)
    const around = source.slice(Math.max(0, subscribeIndex - 200), subscribeIndex + 200)
    expect(around).toMatch(/registerCleanup\(/)
  })
})

describe('conducta: el mirror se olvida cuando la sesión restaura el respaldo', () => {
  test('un callback registrado con onRefusalFallbackRestored corre tras switchSession con restore', () => {
    resetStateForTests()
    let activeUserSpecifiedModel: string | undefined = 'claude-opus-5'
    const unsubscribe = onRefusalFallbackRestored(() => {
      activeUserSpecifiedModel = undefined
    })
    try {
      switchSession('nueva' as SessionId, 'resume')
      expect(activeUserSpecifiedModel).toBe('claude-opus-5')

      latchRefusalFallbackModel({
        fallbackModel: 'claude-sonnet-5',
        previousOverride: 'claude-opus-5',
        previousAppStateModel: 'claude-opus-5',
        previousModelForSession: null,
      })
      setMainLoopModelOverride('claude-sonnet-5')
      switchSession('otra' as SessionId, 'resume')

      expect(activeUserSpecifiedModel).toBeUndefined()
    } finally {
      unsubscribe()
    }
  })
})
