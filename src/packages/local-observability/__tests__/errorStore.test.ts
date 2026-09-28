/**
 * Lo que rodea a la base de errores: el registro de acciones, el hogar y la
 * URL que eligen el motor, la apertura perezosa y el registrador. El contrato
 * de la base, igual para cada motor, vive en `errorStoreContract.ts`.
 */
import { SQL } from 'bun'
import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { ACTION_TRAIL_CAPACITY, createActionTrail } from '../src/errorStore/actionTrail.ts'
import { dialectOf } from '../src/errorStore/dialect.ts'
import {
  disableErrorRecording,
  enableErrorRecording,
  flushErrorRecording,
  recordAction,
  recordError,
} from '../src/errorStore/errorRecorder.ts'
import type { ErrorStore } from '../src/errorStore/errorStore.ts'
import {
  ERRORS_DB_FILE,
  openErrorStore,
  openErrorStoreOn,
  openLazyErrorStore,
  resolveErrorStoreUrl,
  resolveObservabilityDataDir,
} from '../src/errorStore/errorStoreHome.ts'

const AT = '2026-09-28T17:40:00.000Z'

afterEach(() => disableErrorRecording())

function withTempDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'thyrox-obs-'))
  return run(dir).finally(() => rmSync(dir, { recursive: true, force: true }))
}

describe('registro de acciones', () => {
  test('conserva sólo las últimas, en orden', () => {
    const trail = createActionTrail(3)
    for (const name of ['a', 'b', 'c', 'd']) trail.push(name, { n: name }, AT)
    expect(trail.snapshot().map(action => action.name)).toEqual(['b', 'c', 'd'])
  })

  test('la capacidad por defecto es veinte', () => {
    expect(ACTION_TRAIL_CAPACITY).toBe(20)
  })
})

describe('motor por URL', () => {
  test('sqlite y postgres se reconocen; otro esquema no', () => {
    expect(dialectOf('sqlite:///tmp/e.sqlite3')).toBe('sqlite')
    expect(dialectOf('postgres://u@h/db')).toBe('postgres')
    expect(dialectOf('postgresql://u@h/db')).toBe('postgres')
    expect(dialectOf('mysql://u@h/db')).toBeNull()
  })

  test('THYROX_OBSERVABILITY_DATABASE_URL gana; sin ella, el SQLite del hogar de datos', () => {
    expect(resolveErrorStoreUrl({ THYROX_OBSERVABILITY_DATABASE_URL: 'postgres://u@h/db' })).toBe('postgres://u@h/db')
    expect(resolveErrorStoreUrl({ THYROX_OBSERVABILITY_DATA_DIR: '/data/obs' })).toBe(`sqlite:///data/obs/${ERRORS_DB_FILE}`)
  })

  test('THYROX_OBSERVABILITY_DATA_DIR declara el hogar; vacía no cuenta', () => {
    expect(resolveObservabilityDataDir({ THYROX_OBSERVABILITY_DATA_DIR: '/data/obs' })).toBe('/data/obs')
    expect(resolveObservabilityDataDir({ THYROX_OBSERVABILITY_DATA_DIR: '  ', THYROX_CONFIG_DIR: '/cfg' })).toBe('/cfg/observability')
  })

  test('un motor no admitido rehúsa sin mostrar la contraseña', async () => {
    await expect(openErrorStore({ env: { THYROX_OBSERVABILITY_DATABASE_URL: 'mysql://user:secret@h/db' } }))
      .rejects.toThrow(/mysql:\/\/\*\*\*@h\/db/)
    await expect(openErrorStore({ env: { THYROX_OBSERVABILITY_DATABASE_URL: 'mysql://user:secret@h/db' } }))
      .rejects.not.toThrow(/secret/)
  })
})

describe('apertura', () => {
  test('el SQLite por defecto vive en un directorio sólo del dueño', () =>
    withTempDir(async dir => {
      const opened = await openErrorStore({ env: { THYROX_OBSERVABILITY_DATA_DIR: join(dir, 'obs') } })
      await opened.store.record({ occurredAt: AT, sessionId: null, version: null, source: 'log_error', error: new Error('x'), actions: [] })
      await opened.close()
      expect(statSync(join(dir, 'obs')).mode & 0o777).toBe(0o700)
      expect(statSync(join(dir, 'obs', ERRORS_DB_FILE)).isFile()).toBe(true)
    }))

  test('la apertura perezosa no crea nada hasta el primer error', () =>
    withTempDir(async dir => {
      const home = join(dir, 'obs')
      const store = openLazyErrorStore({ env: { THYROX_OBSERVABILITY_DATA_DIR: home } })
      expect(existsSync(home)).toBe(false)
      await store.record({ occurredAt: AT, sessionId: null, version: null, source: 'log_error', error: new Error('x'), actions: [] })
      expect(existsSync(join(home, ERRORS_DB_FILE))).toBe(true)
      expect((await store.list({ limit: 1 }))[0]!.message).toBe('x')
    }))
})

describe('registrador', () => {
  test('sin habilitar no registra nada ni lanza', async () => {
    expect(() => recordError('log_error', new Error('x'))).not.toThrow()
    await flushErrorRecording()
  })

  test('habilitado, cada error lleva las acciones previas', async () => {
    const sql = new SQL('sqlite://:memory:')
    const store = await openErrorStoreOn(sql, 'sqlite')
    enableErrorRecording({ store, sessionId: () => 's-9', version: '9.9.9', now: () => AT })
    recordAction('tengu_start', { a: 1 })
    recordError('component_boundary', new Error('render'), { componentBoundary: 'Notifications' })
    await flushErrorRecording()
    const [row] = await store.list({ limit: 1 })
    expect(row).toMatchObject({ source: 'component_boundary', errorType: 'render', sessionId: 's-9', version: '9.9.9', message: 'render' })
    expect(row!.actions.map(action => action.name)).toEqual(['tengu_start'])
    await sql.close()
  })

  test('una base que falla no rompe a quien registra', async () => {
    const broken: ErrorStore = {
      record: () => Promise.reject(new Error('disk full')),
      list: async () => [],
      purgeOlderThan: async () => 0,
      migrate: async () => {},
    }
    enableErrorRecording({ store: broken, sessionId: () => null, version: null, now: () => AT })
    expect(() => recordError('log_error', new Error('x'))).not.toThrow()
    await flushErrorRecording()
  })
})
