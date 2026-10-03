/**
 * El registro de ejecución (X1a) contra SQLite en memoria: el contrato del
 * store es el mismo en los dos motores; la variante PostgreSQL corre aparte
 * cuando hay base de pruebas declarada.
 */
import { SQL } from 'bun'
import { describe, expect, test } from 'bun:test'

import { executionRecordStore, InvalidExecutionRecordError, type ExecutionRecord } from '../executionRecordStore.ts'

const MINIMAL: ExecutionRecord = { executionId: 'exec-1', reference: 'task:TASK-THYROX-0905', kind: 'test' }

async function freshStore() {
  const store = executionRecordStore(new SQL('sqlite://:memory:'), 'sqlite')
  await store.migrate()
  return store
}

describe('execution record store', () => {
  test('a record with only its identity persists', async () => {
    const store = await freshStore()
    await store.record(MINIMAL)
    const stored = await store.get('exec-1')
    expect(stored?.reference).toBe('task:TASK-THYROX-0905')
    expect(stored?.kind).toBe('test')
    expect(stored?.cpuMs).toBeUndefined()
    expect(typeof stored?.recordedAt).toBe('string')
  })

  test('measurements, identities and attestation round-trip', async () => {
    const store = await freshStore()
    await store.record({
      ...MINIMAL,
      taskId: 'TASK-THYROX-0905', containerId: 'abc', imageRef: 'localhost/img@sha256:1', modelId: 'm',
      startedAt: '2026-10-02T10:00:00.000Z', finishedAt: '2026-10-02T10:00:05.000Z',
      exitCode: 0, wallMs: 5000, cpuMs: 1200, maxRssBytes: 1024, vramPeakMib: 0,
      verdict: 'passed', attestation: { materializer: 'podman-execution-primitive' },
    })
    const stored = await store.get('exec-1')
    expect(stored?.wallMs).toBe(5000)
    expect(stored?.vramPeakMib).toBe(0)
    expect(stored?.attestation).toEqual({ materializer: 'podman-execution-primitive' })
    expect(Date.parse(stored!.finishedAt!)).toBe(Date.parse('2026-10-02T10:00:05.000Z'))
  })

  test('a second write completes the row without erasing measured fields', async () => {
    const store = await freshStore()
    await store.record({ ...MINIMAL, cpuMs: 1200, exitCode: 1 })
    await store.record({ ...MINIMAL, verdict: 'failed' })
    const stored = await store.get('exec-1')
    expect(stored?.cpuMs).toBe(1200)
    expect(stored?.exitCode).toBe(1)
    expect(stored?.verdict).toBe('failed')
  })

  test('an unknown execution reads as undefined', async () => {
    expect(await (await freshStore()).get('missing')).toBeUndefined()
  })

  test('migrating twice applies nothing the second time', async () => {
    const store = executionRecordStore(new SQL('sqlite://:memory:'), 'sqlite')
    expect(await store.migrate()).toEqual([1])
    expect(await store.migrate()).toEqual([])
  })

  test('a record without identity or with a negative measurement is refused before writing', async () => {
    const store = await freshStore()
    await expect(store.record({ ...MINIMAL, executionId: ' ' })).rejects.toBeInstanceOf(InvalidExecutionRecordError)
    await expect(store.record({ ...MINIMAL, wallMs: -1 })).rejects.toBeInstanceOf(InvalidExecutionRecordError)
    await expect(store.record({ ...MINIMAL, startedAt: 'yesterday' })).rejects.toBeInstanceOf(InvalidExecutionRecordError)
    expect(await store.get(' ')).toBeUndefined()
  })
})
