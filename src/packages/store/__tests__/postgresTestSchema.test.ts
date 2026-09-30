/**
 * El esquema de usar y tirar de las pruebas PostgreSQL de `@thyrox/store`:
 * de dónde sale la URL de prueba, la comprobación de alcanzabilidad
 * (`assertPostgresReachable`) que la memoiza, y las ramas de
 * `withDisposableSchema` (crear, correr, borrar — también al lanzar), con una
 * conexión inyectada y sin servidor.
 */
import type { SQL } from 'bun'
import { beforeEach, describe, expect, test } from 'bun:test'

import {
  assertPostgresReachable,
  type DisposableSchemaDeps,
  resetPostgresReachabilityForTests,
  resolvePostgresTestUrl,
  TEST_POSTGRES_URL_VAR,
  withDisposableSchema,
} from '../testing/postgresTestSchema.ts'

// Cada test parte de la memoización vacía: `withDisposableSchema` y
// `assertPostgresReachable` comparten caché por URL, y las suites reutilizan
// la misma URL de prueba entre casos.
beforeEach(() => {
  resetPostgresReachabilityForTests()
})

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

/** Una conexión falsa que sondea sin lanzar: responde `SELECT 1` y no registra fallo. */
function fakeReachableConnect(calls: string[]): (url: string) => SQL {
  return url => {
    calls.push(`CONNECT ${url}`)
    return {
      unsafe: async (query: string) => {
        calls.push(`QUERY ${query}`)
        return []
      },
      close: async () => {
        calls.push('CLOSE')
      },
    } as unknown as SQL
  }
}

/** Una conexión falsa cuyo sondeo (`unsafe`) siempre lanza — simula el servidor caído. */
function fakeUnreachableConnect(message: string): (url: string) => SQL {
  return () => {
    return {
      unsafe: async () => {
        throw new Error(message)
      },
      close: async () => {},
    } as unknown as SQL
  }
}

describe('assertPostgresReachable', () => {
  // CONTROL: sin memoización, la segunda llamada volvería a conectar — este
  // caso caería (dos CONNECT en vez de uno) si se retira la caché.
  test('servidor alcanzable: no lanza, y una segunda llamada no reconecta', async () => {
    const calls: string[] = []
    const connect = fakeReachableConnect(calls)
    await assertPostgresReachable('postgres://u@h/reachable', { connect })
    await assertPostgresReachable('postgres://u@h/reachable', { connect })
    expect(calls).toEqual(['CONNECT postgres://u@h/reachable', 'QUERY SELECT 1', 'CLOSE'])
  })

  test('servidor inalcanzable: lanza un error con la URL enmascarada, la causa y la orden de arranque, sin la contraseña', async () => {
    const connect = fakeUnreachableConnect('connect ECONNREFUSED 127.0.0.1:5432')
    const url = 'postgres://user:secret@h/db'
    let error: Error | undefined
    try {
      await assertPostgresReachable(url, { connect })
    } catch (e) {
      error = e as Error
    }
    expect(error?.message).toContain('postgres://***@h/db')
    expect(error?.message).toContain('ECONNREFUSED')
    expect(error?.message).toContain('pg_ctlcluster 16 main start')
    expect(error?.message).not.toContain('secret')
  })

  // Sin servidor: un puerto recién cerrado en 127.0.0.1 no necesita PostgreSQL
  // instalado y prueba la ruta real de `defaultConnect`/`Bun.SQL`.
  test('puerto cerrado en 127.0.0.1: lanza sin necesitar un PostgreSQL de verdad', async () => {
    const probe = Bun.listen({ hostname: '127.0.0.1', port: 0, socket: { data() {} } })
    const { port } = probe
    probe.stop(true)
    const url = `postgres://user:pass@127.0.0.1:${port}/thyrox_test_closed_port`
    await expect(assertPostgresReachable(url)).rejects.toThrow(/PostgreSQL de pruebas inalcanzable/)
  })
})

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
    // Las tres primeras entradas son la comprobación de alcanzabilidad
    // (memoizada, así que sólo corre una vez por URL).
    expect(calls).toEqual([
      'CONNECT ADMIN postgres://u@h/db',
      'ADMIN: SELECT 1',
      'CLOSE ADMIN',
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
      'ADMIN: SELECT 1',
      'CLOSE ADMIN',
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
