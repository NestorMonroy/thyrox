/**
 * El esquema de usar y tirar de las pruebas PostgreSQL de `@thyrox/store`:
 * de dónde sale la URL de prueba, y las ramas de `withDisposableSchema`
 * (crear, correr, borrar — también al lanzar), con una conexión inyectada y
 * sin servidor.
 */
import type { SQL } from 'bun'
import { describe, expect, test } from 'bun:test'

import {
  type DisposableSchemaDeps,
  resolvePostgresTestUrl,
  TEST_POSTGRES_URL_VAR,
  withDisposableSchema,
} from '../testing/postgresTestSchema.ts'

describe('resolvePostgresTestUrl', () => {
  test('sin la variable, da null', () => {
    expect(resolvePostgresTestUrl({})).toBeNull()
  })

  test('con la variable en blanco, da null', () => {
    expect(resolvePostgresTestUrl({ [TEST_POSTGRES_URL_VAR]: '   ' })).toBeNull()
  })

  test('con una URL postgres, la devuelve recortada', () => {
    expect(resolvePostgresTestUrl({ [TEST_POSTGRES_URL_VAR]: '  postgres://u@h/db  ' })).toBe('postgres://u@h/db')
  })

  test('postgresql:// también cuenta como postgres', () => {
    expect(resolvePostgresTestUrl({ [TEST_POSTGRES_URL_VAR]: 'postgresql://u@h/db' })).toBe('postgresql://u@h/db')
  })

  // CONTROL: sin la comprobación de dialecto, cualquier valor no vacío se
  // devolvería tal cual en vez de rechazarse por no ser una URL postgres.
  test('con una URL que no es postgres, rechaza nombrando la variable y sin las credenciales', () => {
    expect(() => resolvePostgresTestUrl({ [TEST_POSTGRES_URL_VAR]: 'sqlite://x' })).toThrow(TEST_POSTGRES_URL_VAR)
    expect(() => resolvePostgresTestUrl({ [TEST_POSTGRES_URL_VAR]: 'postgres://user:secret@h/db-mal-escrita' }))
      .not.toThrow(/secret/)
  })
})

/**
 * Una conexión falsa que registra cada apertura y cada sentencia. La conexión
 * abierta con `searchPath` se etiqueta WORK(<esquema>); la otra, ADMIN.
 */
function fakeConnect(calls: string[]): NonNullable<DisposableSchemaDeps['connect']> {
  return (url, options) => {
    const label = options?.searchPath ? `WORK(${options.searchPath})` : 'ADMIN'
    calls.push(`CONNECT ${label} ${url}`)
    return {
      unsafe: async (query: string) => {
        calls.push(`${label}: ${query}`)
        return []
      },
      close: async () => {
        calls.push(`CLOSE ${label}`)
      },
    } as unknown as SQL
  }
}

describe('withDisposableSchema', () => {
  // CONTROL: el `search_path` va en el arranque de la conexión de trabajo, no
  // en un `SET` suelto. `Bun.SQL` es un pool: medido contra PostgreSQL 16, un
  // `SET` alcanzó 1 de 4 conexiones y `begin` falló con «relation does not
  // exist». Si vuelve el `SET`, cae este caso.
  test('crea el esquema por la conexión ADMIN, corre body en una conexión con search_path de arranque y borra el esquema al terminar', async () => {
    const calls: string[] = []
    const result = await withDisposableSchema(
      'postgres://u@h/db',
      async sql => {
        calls.push('BODY')
        expect(typeof (sql as unknown as { unsafe: unknown }).unsafe).toBe('function')
        return 'ok'
      },
      { connect: fakeConnect(calls), randomSuffix: () => 'abc123' },
    )
    expect(result).toBe('ok')
    expect(calls).toEqual([
      'CONNECT ADMIN postgres://u@h/db',
      'ADMIN: CREATE SCHEMA thyrox_test_abc123',
      'CONNECT WORK(thyrox_test_abc123) postgres://u@h/db',
      'BODY',
      'CLOSE WORK(thyrox_test_abc123)',
      'ADMIN: DROP SCHEMA IF EXISTS thyrox_test_abc123 CASCADE',
      'CLOSE ADMIN',
    ])
    expect(calls.some(call => call.includes('SET search_path'))).toBe(false)
  })

  // CONTROL: sin los `finally`, un `body` que lanza dejaría el esquema sin
  // borrar y las conexiones sin cerrar — este caso caería si se retiran.
  test('si body lanza, el esquema se borra y las dos conexiones se cierran igual, y el error original viaja', async () => {
    const calls: string[] = []
    const boom = new Error('boom')
    await expect(
      withDisposableSchema(
        'postgres://u@h/db',
        async () => {
          throw boom
        },
        { connect: fakeConnect(calls), randomSuffix: () => 'xyz' },
      ),
    ).rejects.toBe(boom)
    expect(calls).toEqual([
      'CONNECT ADMIN postgres://u@h/db',
      'ADMIN: CREATE SCHEMA thyrox_test_xyz',
      'CONNECT WORK(thyrox_test_xyz) postgres://u@h/db',
      'CLOSE WORK(thyrox_test_xyz)',
      'ADMIN: DROP SCHEMA IF EXISTS thyrox_test_xyz CASCADE',
      'CLOSE ADMIN',
    ])
  })

  test('sin randomSuffix inyectado, dos llamadas usan nombres de esquema distintos', async () => {
    const calls: string[] = []
    await withDisposableSchema('postgres://u@h/db', async () => {}, { connect: fakeConnect(calls) })
    await withDisposableSchema('postgres://u@h/db', async () => {}, { connect: fakeConnect(calls) })
    const schemaCreates = calls.filter(call => call.startsWith('ADMIN: CREATE SCHEMA'))
    expect(schemaCreates).toHaveLength(2)
    expect(schemaCreates[0]).not.toBe(schemaCreates[1])
    for (const create of schemaCreates) expect(create).toMatch(/^ADMIN: CREATE SCHEMA thyrox_test_[0-9a-f]+$/)
  })

  // CONTROL: sin la comprobación de dialecto al principio, `connect` se
  // habría llamado con una URL sqlite antes de rechazarla.
  test('una URL que no es postgres rehúsa antes de conectar', async () => {
    const calls: string[] = []
    await expect(
      withDisposableSchema('sqlite://:memory:', async () => {}, { connect: fakeConnect(calls) }),
    ).rejects.toThrow(/postgres/)
    expect(calls).toEqual([])
  })
})
