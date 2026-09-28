/**
 * Los errores y las acciones que Sentry recibía quedan en una base local.
 *
 * Sentry recibía dos cosas: cada error capturado (con su contexto) y, junto a
 * él, las últimas 20 acciones previas (`maxBreadcrumbs: 20`). Este control
 * verifica las dos en la base, la redacción de las claves sensibles que el
 * `beforeSend` de Sentry quitaba, y que registrar nunca rompe a quien registra.
 */
import { Database } from 'bun:sqlite'
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createActionTrail, ACTION_TRAIL_CAPACITY } from '../src/errorStore/actionTrail.ts'
import { createErrorStore, REDACTED } from '../src/errorStore/errorStore.ts'
import { ERRORS_DB_FILE, openErrorStore, openLazyErrorStore, resolveObservabilityDataDir } from '../src/errorStore/errorStoreHome.ts'
import { existsSync } from 'node:fs'
import { disableErrorRecording, enableErrorRecording, recordAction, recordError } from '../src/errorStore/errorRecorder.ts'

const AT = '2026-09-28T17:40:00.000Z'

describe('registro de acciones', () => {
  test('conserva sólo las últimas, en orden', () => {
    const trail = createActionTrail(3)
    for (const name of ['a', 'b', 'c', 'd']) trail.push(name, { n: name }, AT)
    expect(trail.snapshot().map(action => action.name)).toEqual(['b', 'c', 'd'])
  })

  test('la capacidad por defecto es la de Sentry', () => {
    expect(ACTION_TRAIL_CAPACITY).toBe(20)
  })
})

describe('base de errores', () => {
  test('guarda el error con su contexto y sus acciones previas', () => {
    const store = createErrorStore(new Database(':memory:'))
    const error = new TypeError('boom')
    const id = store.record({
      occurredAt: AT,
      sessionId: 's-1',
      version: '1.2.3',
      source: 'log_error',
      error,
      context: { url: 'https://api.example/v1', status: 500 },
      actions: [{ name: 'tengu_query', metadata: { model: 'm' }, occurredAt: AT }],
    })
    const [row] = store.list({ limit: 10 })
    expect(row).toMatchObject({
      id,
      occurredAt: AT,
      sessionId: 's-1',
      version: '1.2.3',
      source: 'log_error',
      name: 'TypeError',
      message: 'boom',
      context: { url: 'https://api.example/v1', status: 500 },
    })
    expect(row!.stack).toContain('boom')
    expect(row!.actions).toEqual([{ name: 'tengu_query', metadata: { model: 'm' }, occurredAt: AT }])
  })

  test('redacta las claves sensibles del contexto, a cualquier profundidad', () => {
    const store = createErrorStore(new Database(':memory:'))
    store.record({
      occurredAt: AT, sessionId: null, version: null, source: 'log_error', error: new Error('x'), actions: [],
      context: { headers: { Authorization: 'Bearer t', 'x-api-key': 'k', Cookie: 'c', accept: 'json' } },
    })
    expect(store.list({ limit: 1 })[0]!.context).toEqual({
      headers: { Authorization: REDACTED, 'x-api-key': REDACTED, Cookie: REDACTED, accept: 'json' },
    })
  })

  test('un valor que no es Error se guarda por su texto', () => {
    const store = createErrorStore(new Database(':memory:'))
    store.record({ occurredAt: AT, sessionId: null, version: null, source: 'log_error', error: 'plain failure', actions: [] })
    expect(store.list({ limit: 1 })[0]).toMatchObject({ name: 'Error', message: 'plain failure', stack: null })
  })

  test('lista de la más reciente a la más antigua', () => {
    const store = createErrorStore(new Database(':memory:'))
    for (const message of ['first', 'second']) {
      store.record({ occurredAt: AT, sessionId: null, version: null, source: 'log_error', error: new Error(message), actions: [] })
    }
    expect(store.list({ limit: 10 }).map(row => row.message)).toEqual(['second', 'first'])
  })

  test('rechaza un origen desconocido', () => {
    const store = createErrorStore(new Database(':memory:'))
    expect(() =>
      store.record({ occurredAt: AT, sessionId: null, version: null, source: 'elsewhere' as never, error: new Error('x'), actions: [] }),
    ).toThrow()
  })
})

describe('hogar de la base', () => {
  test('THYROX_OBSERVABILITY_DATA_DIR lo declara; vacía no cuenta', () => {
    expect(resolveObservabilityDataDir({ THYROX_OBSERVABILITY_DATA_DIR: '/data/obs' })).toBe('/data/obs')
    expect(resolveObservabilityDataDir({ THYROX_OBSERVABILITY_DATA_DIR: '  ', THYROX_CONFIG_DIR: '/cfg' })).toBe('/cfg/observability')
  })

  test('abre la base en un directorio sólo del dueño', () => {
    const dir = mkdtempSync(join(tmpdir(), 'thyrox-obs-'))
    try {
      const opened = openErrorStore({ env: { THYROX_OBSERVABILITY_DATA_DIR: join(dir, 'obs') } })
      opened.store.record({ occurredAt: AT, sessionId: null, version: null, source: 'log_error', error: new Error('x'), actions: [] })
      opened.close()
      expect(statSync(join(dir, 'obs')).mode & 0o777).toBe(0o700)
      expect(statSync(join(dir, 'obs', ERRORS_DB_FILE)).isFile()).toBe(true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('apertura perezosa', () => {
  test('la base no se crea hasta el primer error', () => {
    const dir = mkdtempSync(join(tmpdir(), 'thyrox-obs-lazy-'))
    try {
      const home = join(dir, 'obs')
      const store = openLazyErrorStore({ env: { THYROX_OBSERVABILITY_DATA_DIR: home } })
      expect(existsSync(home)).toBe(false)
      store.record({ occurredAt: AT, sessionId: null, version: null, source: 'log_error', error: new Error('x'), actions: [] })
      expect(existsSync(join(home, ERRORS_DB_FILE))).toBe(true)
      expect(store.list({ limit: 1 })[0]!.message).toBe('x')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('registrador', () => {
  test('sin habilitar no registra nada', () => {
    disableErrorRecording()
    expect(() => recordError('log_error', new Error('x'))).not.toThrow()
  })

  test('habilitado, cada error lleva las acciones previas', () => {
    const store = createErrorStore(new Database(':memory:'))
    enableErrorRecording({ store, sessionId: () => 's-9', version: '9.9.9', now: () => AT })
    try {
      recordAction('tengu_start', { a: 1 })
      recordError('component_boundary', new Error('render'), { componentBoundary: 'Notifications' })
      const [row] = store.list({ limit: 1 })
      expect(row).toMatchObject({ source: 'component_boundary', sessionId: 's-9', version: '9.9.9', message: 'render' })
      expect(row!.actions.map(action => action.name)).toEqual(['tengu_start'])
    } finally {
      disableErrorRecording()
    }
  })

  test('una base que falla no rompe a quien registra', () => {
    const broken = { record: () => { throw new Error('disk full') }, list: () => [] }
    enableErrorRecording({ store: broken, sessionId: () => null, version: null, now: () => AT })
    try {
      expect(() => recordError('log_error', new Error('x'))).not.toThrow()
    } finally {
      disableErrorRecording()
    }
  })
})
