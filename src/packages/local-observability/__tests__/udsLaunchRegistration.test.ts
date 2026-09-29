/**
 * El alta de la sesión al arrancar (`chunk-bdv29443.js` de 2.1.283): instala
 * la restauración del nombre apartado, registra la sesión salvo que la de
 * reserva esté aparcada y, sólo si registró, fija el nombre de `--name` y
 * cuenta las sesiones vivas.
 */
import { describe, expect, test } from 'bun:test'

import { registerAtLaunch, titleIsReplaceable, type LaunchRegistrationDeps } from '../src/uds/launchRegistration.ts'
import type { StartupNamingOptions } from '../src/uds/sessionRename.ts'

type Recorder = { calls: string[]; naming?: StartupNamingOptions; events: [string, unknown][] }

function deps(overrides: Partial<LaunchRegistrationDeps> = {}, recorder: Recorder = { calls: [], events: [] }) {
  const base: LaunchRegistrationDeps = {
    isSpareParked: () => false,
    installRestoreSetAsideName: () => { recorder.calls.push('install-restore') },
    restoreSessionName: (name, options) => { recorder.calls.push(`restore:${name}:${options.source}:${options.autoOnly}`) },
    register: async () => { recorder.calls.push('register'); return true },
    currentSessionId: () => 'session-a',
    peerSessionKind: () => undefined,
    nonInteractive: () => false,
    runStartupNaming: async options => { recorder.calls.push('naming'); recorder.naming = options },
    writeRegisteredName: async (name, source, givenAtLaunch) => { recorder.calls.push(`write:${name}:${source}:${givenAtLaunch}`) },
    registeredName: () => ({ name: 'alpha', source: 'user', givenAtLaunch: false }),
    currentTitle: () => undefined,
    setTitle: title => { recorder.calls.push(`title:${title}`) },
    setAgentName: name => { recorder.calls.push(`agent:${name}`) },
    countLiveSessions: async () => 1,
    emit: (event, data) => { recorder.events.push([event, data]) },
    ...overrides,
  }
  return { deps: base, recorder }
}

describe('registerAtLaunch', () => {
  test('instala la restauración del nombre apartado antes de registrar', async () => {
    let restore: ((name: string, source: string) => void) | undefined
    const { deps: d, recorder } = deps({ installRestoreSetAsideName: fn => { restore = fn; recorder.calls.push('install-restore') } })
    await registerAtLaunch(d)
    expect(recorder.calls.slice(0, 2)).toEqual(['install-restore', 'register'])
    restore?.('beta', 'auto')
    expect(recorder.calls).toContain('restore:beta:auto:true')
  })

  test('con la sesión de reserva aparcada no registra ni fija el nombre', async () => {
    const { deps: d, recorder } = deps({ isSpareParked: () => true })
    await registerAtLaunch(d)
    expect(recorder.calls).toEqual(['install-restore'])
  })

  test('si el registro no se hace, no fija el nombre ni cuenta sesiones', async () => {
    const recorder: Recorder = { calls: [], events: [] }
    const { deps: d } = deps({ register: async () => false, countLiveSessions: async () => { recorder.calls.push('count'); return 3 } }, recorder)
    await registerAtLaunch(d)
    expect(recorder.calls).not.toContain('naming')
    expect(recorder.calls).not.toContain('count')
  })

  test('registrada, fija el nombre de --name como del usuario y en modo interactivo', async () => {
    const { deps: d, recorder } = deps({ sessionNameArg: 'mi-sesion' })
    await registerAtLaunch(d)
    expect(recorder.naming?.sessionNameArg).toBe('mi-sesion')
    expect(recorder.naming?.sessionNameArgSource).toBe('user')
    expect(recorder.naming?.interactive).toBe(true)
  })

  test('lanzada por un par, el nombre es del par y no es interactiva', async () => {
    const { deps: d, recorder } = deps({ sessionNameArg: 'x', peerSessionKind: () => 'bg' })
    await registerAtLaunch(d)
    expect(recorder.naming?.sessionNameArgSource).toBe('peer')
    expect(recorder.naming?.interactive).toBe(false)
  })

  test('sin terminal interactiva, tampoco es interactiva', async () => {
    const { deps: d, recorder } = deps({ nonInteractive: () => true })
    await registerAtLaunch(d)
    expect(recorder.naming?.interactive).toBe(false)
  })

  test('escribir el nombre: por colisión conserva givenAtLaunch del registrado; si no, es de lanzamiento', async () => {
    const { deps: d, recorder } = deps()
    await registerAtLaunch(d)
    await recorder.naming!.writeName('alpha-2', 'collision')
    await recorder.naming!.writeName('gamma', 'user')
    expect(recorder.calls).toContain('write:alpha-2:collision:false')
    expect(recorder.calls).toContain('write:gamma:user:true')
  })

  test('al renombrarse publica título y nombre de agente si el título sigue al nombre anterior', async () => {
    const { deps: d, recorder } = deps({ currentTitle: () => 'Alpha' })
    await registerAtLaunch(d)
    recorder.naming!.onRenamed!('alpha-2', 'alpha')
    expect(recorder.calls).toContain('title:alpha-2')
    expect(recorder.calls).toContain('agent:alpha-2')
  })

  test('no pisa un título que el usuario puso aparte', async () => {
    const { deps: d, recorder } = deps({ currentTitle: () => 'mi titulo' })
    await registerAtLaunch(d)
    recorder.naming!.onRenamed!('alpha-2', 'alpha')
    expect(recorder.calls.some(c => c.startsWith('title:'))).toBe(false)
  })

  test('si la sesión cambió entre el arranque y el renombre, no publica nada', async () => {
    let id = 'session-a'
    const { deps: d, recorder } = deps({ currentSessionId: () => id })
    await registerAtLaunch(d)
    id = 'session-b'
    recorder.naming!.onRenamed!('alpha-2', 'alpha')
    expect(recorder.calls.some(c => c.startsWith('title:') || c.startsWith('agent:'))).toBe(false)
  })

  test('con dos o más sesiones vivas emite el evento; con una, no', async () => {
    const two = deps({ countLiveSessions: async () => 2 })
    await registerAtLaunch(two.deps)
    expect(two.recorder.events).toEqual([['tengu_concurrent_sessions', { num_sessions: 2 }]])
    const one = deps()
    await registerAtLaunch(one.deps)
    expect(one.recorder.events).toEqual([])
  })
})

describe('registerAtLaunch — concurrencia', () => {
  test('cuenta las sesiones sin esperar a que el nombre termine', async () => {
    let releaseNaming: () => void = () => {}
    const { deps: d, recorder } = deps({
      runStartupNaming: () => new Promise<void>(resolve => { releaseNaming = resolve }),
      countLiveSessions: async () => 3,
    })
    const done = registerAtLaunch(d)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(recorder.events).toEqual([['tengu_concurrent_sessions', { num_sessions: 3 }]])
    releaseNaming()
    await done
  })
})

describe('titleIsReplaceable (jrt)', () => {
  test('sin título, siempre', () => expect(titleIsReplaceable(undefined, 'a', 'b')).toBe(true))
  test('igual al nombre anterior, normalizado', () => expect(titleIsReplaceable('  Alpha ', 'alpha', 'beta')).toBe(true))
  test('igual al nombre nuevo', () => expect(titleIsReplaceable('beta', 'alpha', 'beta')).toBe(true))
  test('distinto de los dos', () => expect(titleIsReplaceable('otro', 'alpha', 'beta')).toBe(false))
})
