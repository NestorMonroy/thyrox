/**
 * Los accesores del estado del buzón: `Pqo`, `Oqo`, `oEn`, `RVt`, `sEn`,
 * `Hqo`, `iEn`, `Mqo`, `Dqo` y `m9r` (`chunk-yg53q7yp.js`, `chunk-4v3yb6t3.js`)
 * de 2.1.283.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  createInboxState,
  describeStartFailure,
  readActiveSocketPath,
  readLastStartDegradedCause,
  readLastStartFailureCause,
  readStartFailureMessage,
  removeActiveKeyFileSync,
  setOnEnableRemoteControl,
  setOnEnqueue,
  setOnPeerMessageStatus,
  setOnRename,
} from '../src/uds/inboxState.ts'

const dirs: string[] = []
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'uds-f4-'))
  dirs.push(dir)
  return dir
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('Pqo / Oqo / Dqo: lectura simple del estado', () => {
  test('cada accesor lee su propio campo, sin tocar los otros', () => {
    const state = createInboxState()
    state.lastStartFailureCause = 'bind_failed'
    state.lastStartDegradedCause = 'key_publish_failed'
    state.activeSocketPath = '/run/a/1.sock'
    expect(readLastStartFailureCause(state)).toBe('bind_failed')
    expect(readLastStartDegradedCause(state)).toBe('key_publish_failed')
    expect(readActiveSocketPath(state)).toBe('/run/a/1.sock')
  })

  test('sin nada fijado, los tres dan undefined', () => {
    const state = createInboxState()
    expect(readLastStartFailureCause(state)).toBeUndefined()
    expect(readLastStartDegradedCause(state)).toBeUndefined()
    expect(readActiveSocketPath(state)).toBeUndefined()
  })
})

describe('RVt / oEn: por qué el buzón no está disponible', () => {
  test('arrancando, no hay mensaje', () => {
    const state = createInboxState()
    state.startInFlight = true
    state.lastStartFailureCause = 'bind_failed'
    expect(describeStartFailure(state)).toBeUndefined()
  })

  test('ya arrancado, no hay mensaje aunque quede una causa vieja', () => {
    const state = createInboxState()
    state.activeSocketPath = '/run/a/1.sock'
    state.lastStartFailureCause = 'bind_failed'
    expect(describeStartFailure(state)).toBeUndefined()
  })

  test('sin causa, no hay mensaje', () => {
    const state = createInboxState()
    expect(describeStartFailure(state)).toBeUndefined()
  })

  test('socket_dir_refused sin detalle', () => {
    const state = createInboxState()
    state.lastStartFailureCause = 'socket_dir_refused'
    expect(describeStartFailure(state)).toBe('its socket directory could not be set up')
  })

  test('socket_dir_refused con detalle', () => {
    const state = createInboxState()
    state.lastStartFailureCause = 'socket_dir_refused'
    state.lastStartFailureDetail = 'EACCES'
    expect(describeStartFailure(state)).toBe('its socket directory could not be set up: EACCES')
  })

  test('path_refused', () => {
    const state = createInboxState()
    state.lastStartFailureCause = 'path_refused'
    expect(describeStartFailure(state)).toBe('its socket path is not a usable local address')
  })

  test('bind_failed', () => {
    const state = createInboxState()
    state.lastStartFailureCause = 'bind_failed'
    expect(describeStartFailure(state)).toBe('it could not be started')
  })

  test('key_publish_failed', () => {
    const state = createInboxState()
    state.lastStartFailureCause = 'key_publish_failed'
    expect(describeStartFailure(state)).toBe('its peer key could not be published')
  })

  test('post_bind_setup_failed', () => {
    const state = createInboxState()
    state.lastStartFailureCause = 'post_bind_setup_failed'
    expect(describeStartFailure(state)).toBe('setting it up after bind failed')
  })

  test('oEn delega en describeStartFailure sobre el mismo estado', () => {
    const state = createInboxState()
    state.lastStartFailureCause = 'path_refused'
    expect(readStartFailureMessage(state)).toBe(describeStartFailure(state))
  })
})

describe('sEn / Hqo / iEn / Mqo: los avisos se fijan en el estado', () => {
  test('setOnRename fija onRename', () => {
    const state = createInboxState()
    const calls: string[] = []
    setOnRename(state, name => calls.push(name))
    state.onRename?.('nuevo-nombre')
    expect(calls).toEqual(['nuevo-nombre'])
  })

  test('setOnEnableRemoteControl fija onEnableRemoteControl', () => {
    const state = createInboxState()
    let called = false
    setOnEnableRemoteControl(state, () => {
      called = true
    })
    state.onEnableRemoteControl?.()
    expect(called).toBe(true)
  })

  test('setOnPeerMessageStatus fija onPeerMessageStatus, con y sin detalle', () => {
    const state = createInboxState()
    const calls: unknown[] = []
    setOnPeerMessageStatus(state, (status, id, details) => calls.push([status, id, details]))
    state.onPeerMessageStatus?.('delivered', 'msg-1')
    state.onPeerMessageStatus?.('dropped', 'msg-2', { dropReason: 'disconnected', droppedCount: 3 })
    expect(calls).toEqual([
      ['delivered', 'msg-1', undefined],
      ['dropped', 'msg-2', { dropReason: 'disconnected', droppedCount: 3 }],
    ])
  })

  test('setOnEnqueue fija onEnqueue', () => {
    const state = createInboxState()
    let calls = 0
    setOnEnqueue(state, () => {
      calls += 1
    })
    state.onEnqueue?.()
    expect(calls).toBe(1)
  })

  test('cada setter deja el campo en undefined si se le pasa undefined', () => {
    const state = createInboxState()
    setOnRename(state, () => {})
    setOnRename(state, undefined)
    expect(state.onRename).toBeUndefined()
  })
})

describe('m9r: retira el archivo de clave activo', () => {
  test('borra el archivo cuando activeKeyFile apunta a uno existente', () => {
    const dir = tempDir()
    const path = join(dir, 'a.key')
    writeFileSync(path, '{}')
    const state = createInboxState()
    state.activeKeyFile = path
    removeActiveKeyFileSync(state)
    expect(existsSync(path)).toBe(false)
  })

  test('no hace nada si activeKeyFile no está fijado', () => {
    const state = createInboxState()
    expect(() => removeActiveKeyFileSync(state)).not.toThrow()
  })

  test('traga el error si el archivo ya no existe', () => {
    const dir = tempDir()
    const path = join(dir, 'no-existe.key')
    const state = createInboxState()
    state.activeKeyFile = path
    expect(() => removeActiveKeyFileSync(state)).not.toThrow()
  })
})
