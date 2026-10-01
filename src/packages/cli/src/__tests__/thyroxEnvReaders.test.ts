/**
 * La conducta que gobierna cada variable THYROX_* de `@thyrox/cli`.
 * Cada caso contrasta la variable fijada con la ausente.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { isWarningDebugEnabled } from '../utils/warningHandler.ts'
import { fleetFocusSeed } from '../handlers/agentsFleet.ts'

const KEYS = ['THYROX_DEBUG', 'THYROX_AGENTS_SELECT', 'THYROX_SESSION_ID']
const saved: Record<string, string | undefined> = {}
beforeEach(() => {
  for (const key of KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
})
afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

describe('THYROX_DEBUG', () => {
  test('manda los avisos de Node al log de depuración', () => {
    expect(isWarningDebugEnabled()).toBe(false)
    process.env.THYROX_DEBUG = '1'
    expect(isWarningDebugEnabled()).toBe(true)
  })
})

describe('THYROX_AGENTS_SELECT', () => {
  test('fija la fila enfocada y la sesión actual de FleetView', () => {
    process.env.THYROX_SESSION_ID = 'sesion-propia'
    expect(fleetFocusSeed()).toEqual({ focusedShort: undefined, originSessionId: 'sesion-propia' })
    process.env.THYROX_AGENTS_SELECT = 'abc123'
    expect(fleetFocusSeed()).toEqual({ focusedShort: 'abc123', originSessionId: 'abc123' })
  })
})
