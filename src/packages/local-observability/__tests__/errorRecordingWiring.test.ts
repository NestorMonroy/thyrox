/**
 * Los productores llegan a la base: `logEvent` alimenta las acciones y
 * `logError` registra el error con el contexto HTTP que Sentry recibía.
 *
 * Qué lo haría fallar: que `logEvent` deje de alimentar el registro de acciones,
 * o que `logError` deje de llamar al registrador.
 */
import { SQL } from 'bun'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, describe, expect, test } from 'bun:test'

import { logEvent } from '../src/core.ts'
import { disableErrorRecording, enableErrorRecording, flushErrorRecording } from '../src/errorStore/errorRecorder.ts'
import { openErrorStoreOn } from '../src/errorStore/errorStoreHome.ts'
import { httpErrorContext } from '../src/logging/httpErrorContext.ts'
import { logError } from '../src/logging/error-log.ts'

const AT = '2026-09-28T17:45:00.000Z'

async function enabledStore() {
  const store = await openErrorStoreOn(new SQL('sqlite://:memory:'), 'sqlite')
  enableErrorRecording({ store, sessionId: () => 's-1', version: '1.0.0', now: () => AT })
  return store
}

afterEach(() => disableErrorRecording())

describe('productores de la base de errores', () => {
  test('logError registra el error con las acciones previas de logEvent', async () => {
    const store = await enabledStore()
    logEvent('tengu_before_failure', { step: 1 })
    logError(new Error('upstream exploded'))
    await flushErrorRecording()
    const [row] = await store.list({ limit: 1 })
    expect(row).toMatchObject({ source: 'log_error', message: 'upstream exploded', sessionId: 's-1' })
    expect(row!.actions.map(action => action.name)).toEqual(['tengu_before_failure'])
  })

  test('el contexto HTTP de un error de axios viaja con el error', async () => {
    const request = { url: 'https://api.example/v1/messages', headers: new AxiosHeaders() }
    const error = new AxiosError('bad', 'ERR_BAD_RESPONSE', request, undefined, {
      status: 529, statusText: 'Overloaded', headers: {}, config: request, data: { error: { message: 'overloaded' } },
    })
    expect(httpErrorContext(error)).toEqual({ url: 'https://api.example/v1/messages', status: 529, body: 'overloaded' })
    const store = await enabledStore()
    logError(error)
    await flushErrorRecording()
    const [row] = await store.list({ limit: 1 })
    expect(row!.errorType).toBe('server')
    expect(row!.context).toEqual({ url: 'https://api.example/v1/messages', status: 529, body: 'overloaded' })
  })

  test('un error que no es HTTP no lleva contexto', () => {
    expect(httpErrorContext(new Error('plain'))).toEqual({})
  })
})
