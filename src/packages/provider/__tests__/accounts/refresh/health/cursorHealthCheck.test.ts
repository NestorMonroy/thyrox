/**
 * Cursor en el refresco proactivo: una conexión cerca de caducar se renueva
 * desde el anfitrión, una a la vez por conexión. Renovada, se guarda limpia;
 * sin un token nuevo o con error, sigue activa con el circuito avanzado.
 *
 * Porte de `omniroute: src/lib/tokenHealthCheckCursor.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import type { CursorRenewalResult } from '../../../../src/accounts/cursor/cursorRenewal.ts'
import { createCursorHealthCheck } from '../../../../src/accounts/refresh/health/cursorHealthCheck.ts'

const NOW = '2026-09-28T12:00:00.000Z'
type Row = Record<string, unknown>

function setup(result: CursorRenewalResult | (() => Promise<CursorRenewalResult>)) {
  const updates: [string, Row][] = []
  const renewed: Row[] = []
  const logs: string[] = []
  const check = createCursorHealthCheck({
    store: { getById: () => null, update: (id: string, data: Row) => void updates.push([id, data]) },
    renew: async current => (renewed.push(current as Row), typeof result === 'function' ? result() : result),
    log: { info: (t, m) => void (t === 'HEALTH_CHECK' && logs.push(`info ${m}`)), warn: (t, m) => void (t === 'HEALTH_CHECK' && logs.push(`warn ${m}`)), error: (t, m) => void (t === 'HEALTH_CHECK' && logs.push(`error ${m}`)) },
  })
  return { check, updates, renewed, logs }
}

const cursor = (overrides: Row = {}) => ({ id: 'c', provider: 'cursor', name: 'main', accessToken: 'old', providerSpecificData: { machineId: 'm1' }, ...overrides })

describe('the Cursor health check', () => {
  test('a renewed session is stored clean', async () => {
    const { check, updates, renewed, logs } = setup({ status: 'renewed', accessToken: 'new', source: 'cursor-ide' })
    await check(cursor(), NOW)
    expect(renewed).toEqual([{ accessToken: 'old', machineId: 'm1' }])
    expect(updates[0]![0]).toBe('c')
    expect(updates[0]![1]).toMatchObject({ accessToken: 'new', testStatus: 'active', lastHealthCheckAt: NOW, errorCode: null })
    expect(logs).toEqual(['info cursor/main Cursor session renewed (source: cursor-ide)'])
  })

  test('without a stored machine id none is passed', async () => {
    const { check, renewed } = setup({ status: 'unchanged' })
    await check(cursor({ providerSpecificData: undefined }), NOW)
    expect(renewed).toEqual([{ accessToken: 'old', machineId: null }])
  })

  test('an unchanged session stays active and advances the circuit, with a warning', async () => {
    const { check, updates, logs } = setup({ status: 'unchanged' })
    await check(cursor(), NOW)
    expect(updates[0]![1]).toMatchObject({ testStatus: 'active', errorCode: 'cursor_session_stale', lastErrorType: 'cursor_session_stale', lastError: 'Cursor session unchanged — no newer token found on this host.', lastHealthCheckAt: NOW })
    expect((updates[0]![1].providerSpecificData as Row).refreshCircuit).toMatchObject({ streak: 1 })
    expect(logs).toEqual(['warn cursor/main Cursor session stale: Cursor session unchanged — no newer token found on this host.'])
  })

  test('an expired connection comes back active, counting the retry', async () => {
    const { check, updates } = setup({ status: 'unchanged' })
    await check(cursor({ testStatus: 'expired' }), NOW)
    expect(updates[0]![1]).toMatchObject({ testStatus: 'active', expiredRetryCount: 1 })
  })

  test('a failed renewal is logged as an error', async () => {
    const { check, updates, logs } = setup({ status: 'error', error: 'locked' })
    await check(cursor(), NOW)
    expect(updates[0]![1]).toMatchObject({ lastError: 'Cursor session renewal failed: locked', testStatus: 'active' })
    expect(logs).toEqual(['error cursor/main Cursor session stale: Cursor session renewal failed: locked'])
  })

  test('two checks of one connection run one after the other', async () => {
    const trace: string[] = []
    let n = 0
    const { check } = setup(async () => {
      const mine = ++n
      trace.push(`start ${mine}`)
      await new Promise(resolve => setTimeout(resolve, 5))
      trace.push(`end ${mine}`)
      return { status: 'unchanged' }
    })
    await Promise.all([check(cursor(), NOW), check(cursor(), NOW)])
    expect(trace).toEqual(['start 1', 'end 1', 'start 2', 'end 2'])
  })
})
