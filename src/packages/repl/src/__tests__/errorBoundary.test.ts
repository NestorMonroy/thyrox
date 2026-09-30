/**
 * El límite de errores del REPL guarda en la base local lo que atrapa.
 *
 * Qué lo haría fallar: que `componentDidCatch` deje de llamar al registrador, o
 * que pierda el nombre del límite o la pila de componentes.
 */
import { SQL } from 'bun'
import { afterEach, expect, test } from 'bun:test'

import { disableErrorRecording, enableErrorRecording, flushErrorRecording } from '@thyrox/local-observability/errorRecorder.js'
import { openErrorStoreOn } from '@thyrox/local-observability/errorStore.js'

import { ErrorBoundary } from '../components/ErrorBoundary.ts'

afterEach(() => disableErrorRecording())

test('lo que atrapa queda como component_boundary con su pila de componentes', async () => {
  const store = await openErrorStoreOn(new SQL('sqlite://:memory:'), 'sqlite')
  enableErrorRecording({ store, sessionId: () => 's-r', version: null, now: () => '2026-09-28T18:00:00.000Z' })
  const boundary = new ErrorBoundary({ children: null, name: 'Notifications' })
  boundary.componentDidCatch(new Error('render failed'), { componentStack: '\n    at Notifications' })
  await flushErrorRecording()
  expect((await store.list({ limit: 1 }))[0]).toMatchObject({
    source: 'component_boundary',
    errorType: 'render',
    message: 'render failed',
    context: { componentBoundary: 'Notifications', componentStack: '\n    at Notifications' },
  })
})
