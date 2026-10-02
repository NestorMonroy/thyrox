/**
 * El mismo contrato del registro de ejecución (X1a) sobre PostgreSQL real, en
 * un esquema desechable. Sin `THYROX_TEST_POSTGRES_URL` la suite se declara no
 * medida en vez de pasar en verde sin tocar la base.
 */
import { describe, expect, test } from 'bun:test'

import { resolvePostgresTestUrl, withDisposableSchema } from '@thyrox/store/testing/postgresTestSchema.ts'

import { executionRecordStore } from '../executionRecordStore.ts'

const url = resolvePostgresTestUrl()

describe.skipIf(url === null)('execution record store on PostgreSQL', () => {
  test('migrates, writes, completes and reads back a record', async () => {
    await withDisposableSchema(url!, async sql => {
      const store = executionRecordStore(sql, 'postgres')
      expect(await store.migrate()).toEqual([1])
      await store.record({ executionId: 'pg-1', reference: 'task:TASK-THYROX-0905', kind: 'test', cpuMs: 7, attestation: { a: 1 } })
      await store.record({ executionId: 'pg-1', reference: 'task:TASK-THYROX-0905', kind: 'test', verdict: 'passed', finishedAt: '2026-10-02T10:00:05.000Z' })
      const stored = await store.get('pg-1')
      expect(stored?.cpuMs).toBe(7)
      expect(stored?.verdict).toBe('passed')
      expect(stored?.attestation).toEqual({ a: 1 })
      expect(Date.parse(stored!.finishedAt!)).toBe(Date.parse('2026-10-02T10:00:05.000Z'))
    })
  })
})

if (url === null) test.skip('THYROX_TEST_POSTGRES_URL not declared: PostgreSQL contract not measured', () => {})
