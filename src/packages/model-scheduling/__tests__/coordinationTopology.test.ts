/**
 * La topología de coordinación es del scheduler (ADR-007 1.12.0): se declara en
 * `THYROX_MODEL_SCHEDULING_COORDINATION` y nunca se deduce del proxy ni de que
 * Redis esté declarado. `shared` sin Redis rehúsa al abrir: fail closed.
 */
import { describe, expect, test } from 'bun:test'

import { coordinationTopologyOf, InvalidCoordinationTopologyError } from '../coordination.ts'
import { openModelSchedulingCoordination, SharedCoordinationUnavailableError } from '../coordinationFactory.ts'

describe('topología de coordinación del scheduler', () => {
  test('sin declarar es local', () => {
    expect(coordinationTopologyOf({})).toBe('local')
  })

  test('no se deduce de THYROX_PROXY_MODE ni de THYROX_REDIS_URL', () => {
    expect(coordinationTopologyOf({ THYROX_PROXY_MODE: 'multi', THYROX_REDIS_URL: 'redis://127.0.0.1:6379' })).toBe('local')
  })

  test('shared se declara explícitamente', () => {
    expect(coordinationTopologyOf({ THYROX_MODEL_SCHEDULING_COORDINATION: 'shared' })).toBe('shared')
  })

  test('un valor desconocido se rehúsa nombrándolo', () => {
    expect(() => coordinationTopologyOf({ THYROX_MODEL_SCHEDULING_COORDINATION: 'multi' })).toThrow(InvalidCoordinationTopologyError)
  })

  test('local abre la coordinación en memoria', async () => {
    const coordination = openModelSchedulingCoordination({})
    expect(coordination.topology).toBe('local')
    await coordination.close()
  })

  test('shared sin THYROX_REDIS_URL rehúsa al abrir', () => {
    expect(() => openModelSchedulingCoordination({ THYROX_MODEL_SCHEDULING_COORDINATION: 'shared' })).toThrow(SharedCoordinationUnavailableError)
  })

  test('shared con Redis declarado abre la coordinación shared', async () => {
    const coordination = openModelSchedulingCoordination({ THYROX_MODEL_SCHEDULING_COORDINATION: 'shared', THYROX_REDIS_URL: 'redis+unix:///nonexistent.sock' })
    expect(coordination.topology).toBe('shared')
    await coordination.close()
  })
})
