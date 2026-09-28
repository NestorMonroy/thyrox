/**
 * Las dos señales de sesión de 2.1.283 (`chunk-nvht7ckf.js`): `Sn`/`fn`, que
 * avisa de un cambio de sesión con su motivo, y `yn`/`hn`, que avisa de un
 * `originalCwd` nuevo. `Zd` y `kzr` son sus suscripciones.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import {
  getCwdState,
  getOriginalCwd,
  getPlanSlugCache,
  getProjectRoot,
  getSessionId,
  getSessionProjectDir,
  onOriginalCwdChange,
  onSessionSwitch,
  regenerateSessionId,
  resetStateForTests,
  setOriginalCwd,
  switchSession,
  type SessionSwitchReason,
} from '../state.js'
import type { SessionId } from '@thyrox/agent/idTypes'

const id = (value: string) => value as SessionId

let unsubscribers: Array<() => void> = []
beforeEach(() => resetStateForTests())
afterEach(() => {
  for (const unsubscribe of unsubscribers) unsubscribe()
  unsubscribers = []
})

function recordSwitches(): Array<[SessionId, SessionSwitchReason]> {
  const seen: Array<[SessionId, SessionSwitchReason]> = []
  unsubscribers.push(onSessionSwitch((sessionId, reason) => void seen.push([sessionId, reason])))
  return seen
}

function recordCwds(): string[] {
  const seen: string[] = []
  unsubscribers.push(onOriginalCwdChange(cwd => void seen.push(cwd)))
  return seen
}

describe('switchSession (mh) avisa con el motivo', () => {
  test('cada oyente recibe el id nuevo y el motivo', () => {
    const seen = recordSwitches()
    switchSession(id('s1'), 'resume', '/proyectos/a')
    switchSession(id('s2'), 'hydrate')
    expect(seen).toEqual([
      [id('s1'), 'resume'],
      [id('s2'), 'hydrate'],
    ])
    expect(getSessionId()).toBe(id('s2'))
    expect(getSessionProjectDir()).toBeNull()
  })

  test('avisa también cuando la sesión no cambia', () => {
    switchSession(id('igual'), 'resume')
    const seen = recordSwitches()
    switchSession(id('igual'), 'cd')
    expect(seen).toEqual([[id('igual'), 'cd']])
  })

  test('desuscribirse deja de recibir', () => {
    const seen: SessionSwitchReason[] = []
    const unsubscribe = onSessionSwitch((_, reason) => void seen.push(reason))
    switchSession(id('a'), 'fork')
    unsubscribe()
    switchSession(id('b'), 'resume')
    expect(seen).toEqual(['fork'])
  })

  test('con originalCwd en las rutas, lo fija y avisa de él después del cambio', () => {
    const order: string[] = []
    unsubscribers.push(onSessionSwitch(sessionId => void order.push(`switch:${sessionId}`)))
    unsubscribers.push(onOriginalCwdChange(cwd => void order.push(`cwd:${cwd}`)))
    switchSession(id('r'), 'remote_attach', null, { originalCwd: '/remoto/ré' })
    expect(getOriginalCwd()).toBe('/remoto/ré')
    expect(order).toEqual(['switch:r', 'cwd:/remoto/ré'])
  })

  test('sin originalCwd en las rutas no avisa de directorio', () => {
    const cwds = recordCwds()
    const before = getOriginalCwd()
    switchSession(id('r'), 'remote_attach', null, {})
    switchSession(id('q'), 'resume')
    expect(cwds).toEqual([])
    expect(getOriginalCwd()).toBe(before)
  })
})

describe('switchSession fija las rutas y olvida el slug de plan', () => {
  test('projectRoot y cwd se fijan en NFC sin avisar de originalCwd', () => {
    const cwds = recordCwds()
    switchSession(id('r'), 'remote_attach', null, { projectRoot: '/raiz/ré', cwd: '/dir/ré' })
    expect(getProjectRoot()).toBe('/raiz/ré')
    expect(getCwdState()).toBe('/dir/ré')
    expect(cwds).toEqual([])
  })

  test('el slug de plan se olvida sólo cuando la sesión cambia', () => {
    switchSession(id('p'), 'resume')
    getPlanSlugCache().set('p', 'plan-p')
    switchSession(id('p'), 'cd')
    expect(getPlanSlugCache().get('p')).toBe('plan-p')
    switchSession(id('q'), 'resume')
    expect(getPlanSlugCache().has('p')).toBe(false)
  })
})

describe('regenerateSessionId avisa con el motivo clear', () => {
  test('el oyente recibe el id estrenado', () => {
    const seen = recordSwitches()
    const fresh = regenerateSessionId({ setCurrentAsParent: true })
    expect(seen).toEqual([[fresh, 'clear']])
  })
})

describe('setOriginalCwd (oT) avisa del directorio normalizado', () => {
  test('cada fijación avisa con el valor en NFC', () => {
    const cwds = recordCwds()
    setOriginalCwd('/a/ré')
    setOriginalCwd('/b')
    expect(cwds).toEqual(['/a/ré', '/b'])
  })

  test('desuscribirse deja de recibir', () => {
    const cwds: string[] = []
    const unsubscribe = onOriginalCwdChange(cwd => void cwds.push(cwd))
    setOriginalCwd('/x')
    unsubscribe()
    setOriginalCwd('/y')
    expect(cwds).toEqual(['/x'])
  })
})
