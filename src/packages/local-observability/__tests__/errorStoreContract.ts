/**
 * El contrato de la base de errores, el mismo para cada motor.
 *
 * Cada motor (`errorStore.sqlite.test.ts`, `errorStore.postgres.test.ts`) corre
 * esta suite contra una base vacía propia. Lo que cubre es lo que difiere entre
 * motores y se nivela en `dialect.ts`: el id (número en SQLite, `BIGINT` como
 * texto en PostgreSQL), el momento (texto frente a `TIMESTAMPTZ`) y el contexto
 * JSON (texto frente a `JSONB`, que guardaría doblemente codificada una cadena).
 */
import { describe, expect, test } from 'bun:test'

import type { ErrorStore } from '../src/errorStore/errorStore.ts'

const AT = '2026-09-28T17:40:00.000Z'
const LATER = '2026-09-28T18:40:00.000Z'

function entry(overrides: Partial<Parameters<ErrorStore['record']>[0]> = {}): Parameters<ErrorStore['record']>[0] {
  return { occurredAt: AT, sessionId: null, version: null, source: 'log_error', error: new Error('x'), actions: [], ...overrides }
}

export function defineErrorStoreContract(name: string, openFresh: () => Promise<{ store: ErrorStore; close(): Promise<void> }>): void {
  describe(`contrato de la base de errores — ${name}`, () => {
    test('guarda el error con contexto, tipo y acciones, y lo devuelve igual', async () => {
      const { store, close } = await openFresh()
      try {
        const id = await store.record(entry({
          sessionId: 's-1',
          version: '1.2.3',
          error: new TypeError('boom'),
          context: { url: 'https://api.example/v1', status: 529, nested: { list: [1, 'a'] } },
          actions: [{ name: 'tengu_query', metadata: { model: 'm' }, occurredAt: AT }],
        }))
        const [row] = await store.list({ limit: 10 })
        expect(typeof id).toBe('number')
        expect(row).toMatchObject({
          id,
          occurredAt: AT,
          sessionId: 's-1',
          version: '1.2.3',
          source: 'log_error',
          errorType: 'server',
          name: 'TypeError',
          message: 'boom',
          context: { url: 'https://api.example/v1', status: 529, nested: { list: [1, 'a'] } },
          actions: [{ name: 'tengu_query', metadata: { model: 'm' }, occurredAt: AT }],
        })
        expect(row!.stack).toContain('boom')
      } finally {
        await close()
      }
    })

    test('redacta las claves sensibles a cualquier profundidad', async () => {
      const { store, close } = await openFresh()
      try {
        await store.record(entry({ context: { headers: { Authorization: 'Bearer t', 'x-api-key': 'k', accept: 'json' } } }))
        const [row] = await store.list({ limit: 1 })
        expect(row!.context).toEqual({ headers: { Authorization: '[redacted]', 'x-api-key': '[redacted]', accept: 'json' } })
      } finally {
        await close()
      }
    })

    test('un valor que no es Error se guarda por su texto', async () => {
      const { store, close } = await openFresh()
      try {
        await store.record(entry({ error: 'plain failure' }))
        expect((await store.list({ limit: 1 }))[0]).toMatchObject({ name: 'Error', message: 'plain failure', stack: null })
      } finally {
        await close()
      }
    })

    test('lista de la más reciente a la más antigua, con límite', async () => {
      const { store, close } = await openFresh()
      try {
        for (const message of ['first', 'second', 'third']) await store.record(entry({ error: new Error(message) }))
        expect((await store.list({ limit: 2 })).map(row => row.message)).toEqual(['third', 'second'])
      } finally {
        await close()
      }
    })

    test('purga lo anterior al corte, con sus acciones', async () => {
      const { store, close } = await openFresh()
      try {
        await store.record(entry({ occurredAt: AT, error: new Error('old'), actions: [{ name: 'a', metadata: {}, occurredAt: AT }] }))
        await store.record(entry({ occurredAt: LATER, error: new Error('new') }))
        expect(await store.purgeOlderThan('2026-09-28T18:00:00.000Z')).toBe(1)
        expect((await store.list({ limit: 10 })).map(row => row.message)).toEqual(['new'])
      } finally {
        await close()
      }
    })

    test('rechaza un origen desconocido', async () => {
      const { store, close } = await openFresh()
      try {
        await expect(store.record(entry({ source: 'elsewhere' as never }))).rejects.toThrow()
      } finally {
        await close()
      }
    })

    test('aplicar las migraciones dos veces no cambia nada', async () => {
      const { store, close } = await openFresh()
      try {
        await store.migrate()
        await store.record(entry())
        expect(await store.list({ limit: 10 })).toHaveLength(1)
      } finally {
        await close()
      }
    })
  })
}
