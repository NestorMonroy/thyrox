/**
 * Dónde está el socket del coordinador (TASK-THYROX-0774). Qué haría fallar a
 * esta suite: que una unidad sólo pudiera alcanzarlo redefiniendo el runtime
 * entero, o que el lanzador tuviera que derivar la ruta por su cuenta.
 */
import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'

import { MODEL_COORDINATOR_SOCKET_ENV, modelCoordinatorSocketPath } from '../coordinatorProtocol.ts'

describe('modelCoordinatorSocketPath', () => {
  test('el socket declarado gana a la ruta derivada del runtime', () => {
    expect(modelCoordinatorSocketPath({ THYROX_MODEL_COORDINATOR_SOCKET: '/run/coord/c.sock', THYROX_RUNTIME_DIR: '/run/thyrox' }))
      .toBe('/run/coord/c.sock')
  })

  test('sin declararlo, se deriva del runtime como hoy', () => {
    expect(modelCoordinatorSocketPath({ THYROX_RUNTIME_DIR: '/run/thyrox' })).toBe('/run/thyrox/coordinator.sock')
  })

  test('la variable se publica por su nombre', () => {
    expect(MODEL_COORDINATOR_SOCKET_ENV).toBe('THYROX_MODEL_COORDINATOR_SOCKET')
  })

  test('el entrypoint imprime la ruta del anfitrión', () => {
    const result = Bun.spawnSync([process.execPath, join(import.meta.dir, '..', 'bin', 'socketPath.ts')],
      { env: { PATH: process.env.PATH ?? '', THYROX_RUNTIME_DIR: '/run/thyrox' } })
    expect(result.exitCode).toBe(0)
    expect(result.stdout.toString().trim()).toBe('/run/thyrox/coordinator.sock')
  })
})
