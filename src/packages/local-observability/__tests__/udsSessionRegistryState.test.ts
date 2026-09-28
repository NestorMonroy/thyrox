/**
 * El estado del registro de sesiones de un anfitrión: el nombre registrado,
 * los que tuvo, los que tiene apartados por conversación y los contadores de
 * restauración. `By`, `HH`, `Y5o`, `kv` y `Cut` (`chunk-t6pwageh.js`) de
 * 2.1.283.
 */
import { beforeEach, describe, expect, test } from 'bun:test'

import {
  FORMER_NAME_MIN_HOLD_MS,
  MAX_CONVERSATION_NAMES,
  MAX_FORMER_NAMES,
  SessionRegistryState,
  heldSessionNames,
  registeredSessionName,
  sessionRegistryState,
  whenSessionRegistered,
} from '../src/uds/sessionRegistryState.ts'

let clock: number
let sessionId: string
let stable: boolean
let state: SessionRegistryState
let emitted: number

beforeEach(() => {
  clock = 1000
  sessionId = 's1'
  stable = false
  state = new SessionRegistryState({ now: () => clock, sessionId: () => sessionId, stableAddress: () => stable })
  emitted = 0
  state.registeredNameChanged.subscribe(() => void emitted++)
})

describe('constantes', () => {
  test('JM, KKn y XM', () => {
    expect([FORMER_NAME_MIN_HOLD_MS, MAX_FORMER_NAMES, MAX_CONVERSATION_NAMES]).toEqual([10000, 3, 8])
  })
})

describe('setRegisteredName', () => {
  test('el primer nombre fija desde cuándo y la sesión, y avisa', () => {
    state.setRegisteredName('foo', 'user', true)
    expect(state.registeredName).toEqual({ name: 'foo', source: 'user', since: 1000, sessionId: 's1', givenAtLaunch: true })
    expect(emitted).toBe(1)
  })

  test('el mismo nombre normalizado conserva desde cuándo; sólo avisa si cambió algo', () => {
    state.setRegisteredName('foo', 'user', true)
    clock = 5000
    sessionId = 's2'
    state.setRegisteredName('FOO', 'user')
    expect(state.registeredName).toEqual({ name: 'FOO', source: 'user', since: 1000, sessionId: 's2', givenAtLaunch: true })
    expect(emitted).toBe(2)
    state.setRegisteredName('FOO', 'user')
    expect(emitted).toBe(2)
  })

  test('cambiar de nombre aparta el anterior y lo recuerda si se tuvo al menos diez segundos', () => {
    state.setRegisteredName('foo', 'user')
    clock = 1000 + FORMER_NAME_MIN_HOLD_MS
    state.setRegisteredName('bar', 'collision')
    expect(state.heldNames).toEqual(new Map([['foo', 'user']]))
    expect(state.formerNames).toEqual([{ name: 'foo', until: 11000, sessionId: 's1' }])
    expect(state.registeredName).toEqual({ name: 'bar', source: 'collision', since: 11000, sessionId: 's1' })
    clock += 1
    state.setRegisteredName('baz', 'user')
    expect(state.formerNames).toEqual([{ name: 'foo', until: 11000, sessionId: 's1' }])
  })

  test('volver a un nombre lo saca de los apartados y de los anteriores', () => {
    state.setRegisteredName('foo', 'user')
    clock += 20000
    state.setRegisteredName('bar', 'user')
    clock += 20000
    state.setRegisteredName('Foo', 'user')
    expect(state.heldNames.has('foo')).toBe(false)
    expect(state.heldNames.get('bar')).toBe('user')
    expect(state.formerNames.map(former => former.name)).toEqual(['bar'])
  })

  test('un nombre derivado sólo se recuerda con la dirección estable activa', () => {
    state.setRegisteredName('d', 'derived')
    clock += 20000
    state.setRegisteredName('x', 'user')
    expect(state.formerNames).toEqual([])
    stable = true
    state.setRegisteredName('d2', 'derived')
    clock += 20000
    state.setRegisteredName('y', 'user')
    expect(state.formerNames.map(former => former.name)).toEqual(['d2'])
  })

  test('los anteriores son tres como mucho, sin repetir, del más reciente al más antiguo', () => {
    for (const name of ['a', 'b', 'c', 'd', 'b', 'e']) {
      state.setRegisteredName(name, 'user')
      clock += 20000
    }
    state.setRegisteredName('f', 'user')
    expect(state.formerNames.map(former => former.name)).toEqual(['e', 'b', 'd'])
  })

  test('un nombre no derivado olvida el nombre de la conversación viva', () => {
    state.liveSessionId = 'conv'
    state.conversationNames.set('conv', { name: 'x', source: 'user' })
    state.setRegisteredName('d', 'derived')
    expect(state.conversationNames.has('conv')).toBe(true)
    state.setRegisteredName('n', 'user')
    expect(state.conversationNames.has('conv')).toBe(false)
  })
})

describe('setAsideRegisteredName', () => {
  test('aparta el nombre en la conversación y lo quita del registro', () => {
    state.setAsideRegisteredName('c1', 'keep')
    expect(state.conversationNames.size).toBe(0)
    state.setRegisteredName('foo', 'user')
    state.setAsideRegisteredName('c1', 'keep')
    expect(state.registeredName).toBeUndefined()
    expect(state.heldNames.get('foo')).toBe('user')
    expect(state.conversationNames.get('c1')).toEqual({ name: 'foo', source: 'user' })
  })

  test('guarda ocho conversaciones como mucho, sin descartar la que se conserva', () => {
    for (let index = 0; index < 9; index++) {
      state.setRegisteredName(`n${index}`, 'user')
      state.setAsideRegisteredName(`c${index}`, 'c0')
    }
    expect([...state.conversationNames.keys()]).toEqual(['c0', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'])
  })

  test('volver a apartar la misma conversación la pasa al final', () => {
    state.setRegisteredName('a', 'user')
    state.setAsideRegisteredName('c1', 'k')
    state.setRegisteredName('b', 'user')
    state.setAsideRegisteredName('c2', 'k')
    state.setRegisteredName('c', 'user')
    state.setAsideRegisteredName('c1', 'k')
    expect([...state.conversationNames.entries()]).toEqual([['c2', { name: 'b', source: 'user' }], ['c1', { name: 'c', source: 'user' }]])
  })
})

describe('el resto del estado', () => {
  test('marcas, caché de vigilancia, cadena de escritura y sondeo de barrido memorizado', async () => {
    state.setUncleanExitsScanned(true)
    state.markUncleanExitReported('/p')
    state.setWatchedCache({ at: 1, value: true })
    const chain = Promise.resolve()
    state.setPidFileWriteChain(chain)
    expect([state.uncleanExitsScanned, [...state.reportedUncleanExitPaths], state.watchedCache, state.pidFileWriteChain === chain]).toEqual([true, ['/p'], { at: 1, value: true }, true])
    let probes = 0
    const probing = new SessionRegistryState({ now: () => 0, sessionId: () => 's', stableAddress: () => false, probeRegistrySweep: async () => (probes++, true) })
    expect(await probing.isRegistrySweepPermitted()).toBe(true)
    expect(await probing.isRegistrySweepPermitted()).toBe(true)
    expect(probes).toBe(1)
  })

  test('el valor inicial de cada campo es el de la referencia', () => {
    expect([state.adoptions, state.restores, state.registered, state.bornSpare, state.registration, state.liveSessionId, state.restoreSetAsideName, state.spareClaimPoll]).toEqual([0, 0, false, false, undefined, undefined, undefined, undefined])
  })
})

describe('accesores por anfitrión', () => {
  test('HH, Y5o, kv y Cut leen el estado del anfitrión', async () => {
    const host = {}
    const hosted = sessionRegistryState(host)
    expect(sessionRegistryState(host)).toBe(hosted)
    expect(sessionRegistryState({})).not.toBe(hosted)
    hosted.setRegisteredName('foo', 'user')
    expect(registeredSessionName(host)?.name).toBe('foo')
    hosted.heldNames.set('x', 'user')
    expect(heldSessionNames(host)).toBe(hosted.heldNames)
    expect(await whenSessionRegistered(host)).toBe(false)
    hosted.registered = true
    expect(await whenSessionRegistered(host)).toBe(true)
    hosted.registration = Promise.resolve(false)
    expect(await whenSessionRegistered(host)).toBe(false)
  })
})
