/**
 * El límite de errores del REPL guarda en la base local lo que atrapa.
 *
 * Qué lo haría fallar: que `componentDidCatch` deje de llamar al registrador, o
 * que pierda el nombre del límite o la pila de componentes.
 */
import { Database } from 'bun:sqlite'
import { afterEach, expect, test } from 'bun:test'

import { disableErrorRecording, enableErrorRecording } from '@thyrox/local-observability/errorRecorder.js'
import { createErrorStore } from '@thyrox/local-observability/errorStoreDb.js'

import { ErrorBoundary } from '../components/ErrorBoundary.ts'

afterEach(() => disableErrorRecording())

test('lo que atrapa queda como component_boundary con su pila de componentes', () => {
  const store = createErrorStore(new Database(':memory:'))
  enableErrorRecording({ store, sessionId: () => 's-r', version: null, now: () => '2026-09-28T18:00:00.000Z' })
  const boundary = new ErrorBoundary({ children: null, name: 'Notifications' })
  boundary.componentDidCatch(new Error('render failed'), { componentStack: '\n    at Notifications' })
  expect(store.list({ limit: 1 })[0]).toMatchObject({
    source: 'component_boundary',
    message: 'render failed',
    context: { componentBoundary: 'Notifications', componentStack: '\n    at Notifications' },
  })
})
