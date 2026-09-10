import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  isSessionActivityTrackingActive,
  registerSessionActivityCallback,
  resetSessionActivityForTest,
  runRegisteredCleanupsForTest,
  sendSessionActivitySignal,
  setLogForDiagnosticsNoPIIFn,
  startSessionActivity,
  stopSessionActivity,
  unregisterSessionActivityCallback,
} from '../sessionActivity.js'

const ORIGINAL_ENV = process.env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES

beforeEach(() => {
  resetSessionActivityForTest()
  setLogForDiagnosticsNoPIIFn(() => {})
  delete process.env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES
})

afterEach(() => {
  resetSessionActivityForTest()
  setLogForDiagnosticsNoPIIFn(() => {})
  if (ORIGINAL_ENV === undefined) delete process.env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES
  else process.env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES = ORIGINAL_ENV
})

// Nota de alcance: el disparo real del heartbeat/idle a los 30s
// (SESSION_ACTIVITY_INTERVAL_MS) NO se ejercita — esperar ese intervalo
// real haría el test lento (30s+) y `bun:test` de esta versión no trae
// temporizadores falsos (verificado: 0 usos de fake-timers en el árbol).
// Lo que sí se ejercita: el registro/baja del callback, la contabilidad
// de refcount por razón, el gate de env var, y que el cleanup de
// apagado se registra UNA sola vez sin importar cuántas veces arranque
// la actividad.

describe('registerSessionActivityCallback / unregisterSessionActivityCallback', () => {
  test('activa y desactiva el flag de tracking', () => {
    expect(isSessionActivityTrackingActive()).toBe(false)
    registerSessionActivityCallback(() => {})
    expect(isSessionActivityTrackingActive()).toBe(true)
    unregisterSessionActivityCallback()
    expect(isSessionActivityTrackingActive()).toBe(false)
  })
})

describe('sendSessionActivitySignal', () => {
  test('sin CLAUDE_CODE_REMOTE_SEND_KEEPALIVES, NO invoca el callback', () => {
    let called = 0
    registerSessionActivityCallback(() => called++)
    sendSessionActivitySignal()
    expect(called).toBe(0)
  })

  test('con CLAUDE_CODE_REMOTE_SEND_KEEPALIVES=1, invoca el callback', () => {
    process.env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES = '1'
    let called = 0
    registerSessionActivityCallback(() => called++)
    sendSessionActivitySignal()
    expect(called).toBe(1)
  })

  test('sin callback registrado, no lanza', () => {
    process.env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES = 'true'
    expect(() => sendSessionActivitySignal()).not.toThrow()
  })
})

describe('startSessionActivity / stopSessionActivity — refcount por razón', () => {
  test('el cleanup de apagado ve el refcount y las razones activas', async () => {
    startSessionActivity('api_call')
    startSessionActivity('tool_exec')
    startSessionActivity('tool_exec')

    let payload: Record<string, unknown> | undefined
    setLogForDiagnosticsNoPIIFn((_level, event, p) => {
      if (event === 'session_activity_at_shutdown') payload = p
    })
    await runRegisteredCleanupsForTest()

    expect(payload?.refcount).toBe(3)
    expect(payload?.active).toEqual({ api_call: 1, tool_exec: 2 })
  })

  test('stopSessionActivity decrementa y limpia la razón cuando llega a 0', async () => {
    startSessionActivity('api_call')
    startSessionActivity('api_call')
    stopSessionActivity('api_call')

    let payload: Record<string, unknown> | undefined
    setLogForDiagnosticsNoPIIFn((_level, event, p) => {
      if (event === 'session_activity_at_shutdown') payload = p
    })
    await runRegisteredCleanupsForTest()
    expect(payload?.refcount).toBe(1)
    expect(payload?.active).toEqual({ api_call: 1 })

    stopSessionActivity('api_call')
    setLogForDiagnosticsNoPIIFn((_level, event, p) => {
      if (event === 'session_activity_at_shutdown') payload = p
    })
    await runRegisteredCleanupsForTest()
    expect(payload?.refcount).toBe(0)
    expect(payload?.active).toEqual({})
  })

  test('stopSessionActivity sin actividad previa no baja el refcount de 0', async () => {
    stopSessionActivity('tool_exec')
    startSessionActivity('api_call')

    let payload: Record<string, unknown> | undefined
    setLogForDiagnosticsNoPIIFn((_level, event, p) => {
      if (event === 'session_activity_at_shutdown') payload = p
    })
    await runRegisteredCleanupsForTest()
    expect(payload?.refcount).toBe(1)
  })

  test('el cleanup de apagado se registra UNA sola vez, sin importar cuántas veces arranque la actividad', async () => {
    let shutdownCount = 0
    setLogForDiagnosticsNoPIIFn((_level, event) => {
      if (event === 'session_activity_at_shutdown') shutdownCount++
    })

    startSessionActivity('api_call')
    stopSessionActivity('api_call')
    startSessionActivity('tool_exec')
    stopSessionActivity('tool_exec')
    startSessionActivity('api_call')

    await runRegisteredCleanupsForTest()

    expect(shutdownCount).toBe(1)
  })
})
