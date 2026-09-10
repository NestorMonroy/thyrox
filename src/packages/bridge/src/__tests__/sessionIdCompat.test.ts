/**
 * Puerto fiel de
 * `ccnmt: packages/bridge/src/__tests__/sessionIdCompat.test.ts`
 * (78 líneas fuente, 100% portado). Sin mocks — `setCseShimGate` ya es
 * un setter de DI en la fuente misma.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import {
  setCseShimGate,
  toCompatSessionId,
  toInfraSessionId,
} from '../sessionIdCompat.js'

afterEach(() => {
  // Reset al default (sin gate registrado = shim activo)
  setCseShimGate(() => true)
})

describe('toCompatSessionId — cse_ → session_', () => {
  test('rewrites cse_ prefix to session_ when gate enabled', () => {
    setCseShimGate(() => true)
    expect(toCompatSessionId('cse_abc123')).toBe('session_abc123')
  })
  test('no-op when shim gate disabled', () => {
    setCseShimGate(() => false)
    expect(toCompatSessionId('cse_abc123')).toBe('cse_abc123')
  })
  test('passes through ids that are not cse_ prefixed', () => {
    setCseShimGate(() => true)
    expect(toCompatSessionId('session_xyz')).toBe('session_xyz')
    expect(toCompatSessionId('plain-id')).toBe('plain-id')
    expect(toCompatSessionId('')).toBe('')
  })
  test('preserves UUID body verbatim', () => {
    setCseShimGate(() => true)
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    expect(toCompatSessionId(`cse_${uuid}`)).toBe(`session_${uuid}`)
  })
  test('default (no gate registered) is shim-active', () => {
    // Registrar () => true fuerza el mismo camino que "sin gate
    // registrado" (ver docstring de sessionIdCompat.ts: el shim
    // defaultea a activo).
    setCseShimGate(() => true)
    expect(toCompatSessionId('cse_x')).toBe('session_x')
  })
})

describe('toInfraSessionId — session_ → cse_', () => {
  test('rewrites session_ prefix to cse_', () => {
    expect(toInfraSessionId('session_abc123')).toBe('cse_abc123')
  })
  test('no-op for ids not session_ prefixed', () => {
    expect(toInfraSessionId('cse_xyz')).toBe('cse_xyz')
    expect(toInfraSessionId('plain')).toBe('plain')
    expect(toInfraSessionId('')).toBe('')
  })
  test('preserves UUID body verbatim', () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    expect(toInfraSessionId(`session_${uuid}`)).toBe(`cse_${uuid}`)
  })
})

describe('toCompatSessionId / toInfraSessionId — round-trip invariants', () => {
  test('cse_X → session_X → cse_X (with shim active)', () => {
    setCseShimGate(() => true)
    const original = 'cse_abc123'
    const round = toInfraSessionId(toCompatSessionId(original))
    expect(round).toBe(original)
  })
  test('session_X → cse_X → session_X (with shim active)', () => {
    setCseShimGate(() => true)
    const original = 'session_xyz'
    const round = toCompatSessionId(toInfraSessionId(original))
    expect(round).toBe(original)
  })
  test('plain id passes through both unchanged', () => {
    setCseShimGate(() => true)
    expect(toInfraSessionId(toCompatSessionId('plain-id'))).toBe('plain-id')
  })
})
