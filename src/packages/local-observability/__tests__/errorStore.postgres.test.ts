/**
 * El contrato de la base de errores sobre PostgreSQL.
 *
 * Corre contra `THYROX_TEST_POSTGRES_URL`, cada caso en un esquema propio que
 * se borra al cerrar. Sin la variable, la suite se declara sin medir en su
 * nombre en vez de pasar en verde sin haber tocado PostgreSQL.
 */
import { SQL } from 'bun'
import { describe, expect, test } from 'bun:test'

import { openErrorStoreOn } from '../src/errorStore/errorStoreHome.ts'
import { defineErrorStoreContract } from './errorStoreContract.ts'

const url = process.env.THYROX_TEST_POSTGRES_URL?.trim()

if (!url) {
  describe('contrato de la base de errores — postgres', () => {
    test.skip('NO MEDIDO: declara THYROX_TEST_POSTGRES_URL para correrlo', () => {})
  })
} else {
  defineErrorStoreContract('postgres', async () => {
    const sql = new SQL({ url, max: 1 })
    const schema = `error_store_test_${crypto.randomUUID().replaceAll('-', '')}`
    await sql.unsafe(`CREATE SCHEMA ${schema}`)
    await sql.unsafe(`SET search_path TO ${schema}`)
    return {
      store: await openErrorStoreOn(sql, 'postgres'),
      close: async () => {
        await sql.unsafe(`DROP SCHEMA ${schema} CASCADE`)
        await sql.close()
      },
    }
  })
}

if (url) {
  describe('base de errores — postgres, lo guardado', () => {
    // La ida y vuelta no lo ve: una cadena doblemente codificada se lee y se
    // parsea igual. Lo que se rompe es la consulta en SQL sobre el contexto.
    test('el contexto se guarda como objeto JSONB consultable', async () => {
      const sql = new SQL({ url, max: 1 })
      const schema = `error_store_test_${crypto.randomUUID().replaceAll('-', '')}`
      try {
        await sql.unsafe(`CREATE SCHEMA ${schema}`)
        await sql.unsafe(`SET search_path TO ${schema}`)
        const store = await openErrorStoreOn(sql, 'postgres')
        await store.record({ occurredAt: new Date().toISOString(), sessionId: null, version: null, source: 'log_error', error: new Error('boom'), context: { status: 529 }, actions: [] })
        const [row] = await sql`SELECT jsonb_typeof(context) AS kind, context->>'status' AS status FROM errors`
        expect(row).toEqual({ kind: 'object', status: '529' })
      } finally {
        await sql.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
        await sql.close()
      }
    })
  })
}
