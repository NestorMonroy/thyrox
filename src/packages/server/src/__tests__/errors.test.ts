/**
 * Puerto de `ccnmt: packages/server/src/__tests__/errors.test.ts`.
 * Mismos casos que la fuente, reescritos.
 */
import { describe, expect, test } from 'bun:test'
import {
  CoordinationError,
  LifecycleError,
  ServerBaseError,
  SessionTransportError,
} from '../errors.js'

describe('ServerBaseError', () => {
  test('preserva el código explícito', () => {
    expect(new ServerBaseError('CUSTOM', 'm').code).toBe('CUSTOM')
  })
  test('es una instancia de Error', () => {
    expect(new ServerBaseError('X', 'm')).toBeInstanceOf(Error)
  })
  test('reenvía cause', () => {
    const cause = new Error('underlying')
    expect(new ServerBaseError('X', 'm', { cause }).cause).toBe(cause)
  })
  test('el name por defecto es ServerBaseError', () => {
    expect(new ServerBaseError('X', 'm').name).toBe('ServerBaseError')
  })
})

describe('LifecycleError', () => {
  test('el código es SERVER_LIFECYCLE_ERROR', () => {
    expect(new LifecycleError('m').code).toBe('SERVER_LIFECYCLE_ERROR')
  })
  test('el name es ServerLifecycleError', () => {
    expect(new LifecycleError('m').name).toBe('ServerLifecycleError')
  })
  test('extiende ServerBaseError', () => {
    expect(new LifecycleError('m')).toBeInstanceOf(ServerBaseError)
  })
})

describe('SessionTransportError', () => {
  test('el código es SERVER_SESSION_TRANSPORT_ERROR', () => {
    expect(new SessionTransportError('m').code).toBe(
      'SERVER_SESSION_TRANSPORT_ERROR',
    )
  })
  test('el name es ServerSessionTransportError', () => {
    expect(new SessionTransportError('m').name).toBe(
      'ServerSessionTransportError',
    )
  })
})

describe('CoordinationError', () => {
  test('el código es SERVER_COORDINATION_ERROR', () => {
    expect(new CoordinationError('m').code).toBe('SERVER_COORDINATION_ERROR')
  })
  test('el name es ServerCoordinationError', () => {
    expect(new CoordinationError('m').name).toBe('ServerCoordinationError')
  })
  test('reenvía cause', () => {
    const cause = new Error('grpc disconnected')
    expect(new CoordinationError('m', { cause }).cause).toBe(cause)
  })
})

describe('unicidad de códigos de error del servidor', () => {
  test('las tres subclases tienen códigos distintos', () => {
    const codes = new Set([
      new LifecycleError('m').code,
      new SessionTransportError('m').code,
      new CoordinationError('m').code,
    ])
    expect(codes.size).toBe(3)
  })
  test('todos los códigos de subclase empiezan con el prefijo SERVER_', () => {
    for (const code of [
      new LifecycleError('m').code,
      new SessionTransportError('m').code,
      new CoordinationError('m').code,
    ]) {
      expect(code).toMatch(/^SERVER_/)
    }
  })
})
