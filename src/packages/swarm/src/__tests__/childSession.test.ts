/**
 * Sesión hija y superficie de la sesión: `kFe`, `nUr`, `cFt`, `dF`, `sYo`,
 * `F2o`, `C` y `nYo`/`zE` (`chunk-jzycvw5e.js`) de 2.1.283.
 */
import { afterEach, describe, expect, test } from 'bun:test'

import {
  CHILD_SESSION_MARKER,
  hasChildSessionMarker,
  isHeadlessToolCallOfAgentSession,
  isModelDrivenSession,
  isNestedInteractiveSession,
  isOnAgentSessionSurface,
  ownsSessionRegistryRecord,
  probeTmuxChildSessionMarker,
  setAmbientMarkerProbe,
  type ChildSessionHost,
} from '../childSession.js'
import { createTeammateContext, runWithTeammateContext } from '../teammateContextAlias.js'
import { getParentSessionId, setCliParentSessionId, setDynamicTeamContext } from '../teammateState.js'

function host(overrides: Partial<ChildSessionHost> = {}): ChildSessionHost {
  return { env: {}, stdinIsTTY: true, stdoutIsTTY: true, isInteractive: true, spawnedByAttendedSession: false, ...overrides }
}

const teammate = {
  agentId: 'ana@eq',
  agentName: 'ana',
  teamName: 'eq',
  planModeRequired: false,
  parentSessionId: 'lider',
  abortController: new AbortController(),
}

afterEach(() => {
  setAmbientMarkerProbe(null)
  setDynamicTeamContext(null)
  setCliParentSessionId(undefined)
})

describe('hasChildSessionMarker (F2o)', () => {
  test('una línea que empieza con el marcador', () => {
    expect(CHILD_SESSION_MARKER).toBe('THYROX_CODE_CHILD_SESSION=')
    expect(hasChildSessionMarker('A=1\nTHYROX_CODE_CHILD_SESSION=1\n')).toBe(true)
    expect(hasChildSessionMarker('-THYROX_CODE_CHILD_SESSION\nX_THYROX_CODE_CHILD_SESSION=1')).toBe(false)
  })
})

describe('probeTmuxChildSessionMarker (C)', () => {
  const found = (stdout: string, status = 0) => ({ which: () => '/usr/bin/tmux', run: () => ({ status, stdout }) })

  test('sin TMUX no hay marcador ambiente', () => {
    expect(probeTmuxChildSessionMarker({ env: {}, ...found('THYROX_CODE_CHILD_SESSION=1') })).toBe('absent')
  })

  test('lee el entorno global de tmux', () => {
    const calls: Array<[string, string[]]> = []
    const result = probeTmuxChildSessionMarker({
      env: { TMUX: '/tmp/t,1,0' },
      which: () => '/usr/bin/tmux',
      run: (command, args) => {
        calls.push([command, args])
        return { status: 0, stdout: 'THYROX_CODE_CHILD_SESSION=1\n' }
      },
    })
    expect(result).toBe('ambient')
    expect(calls).toEqual([['/usr/bin/tmux', ['show-environment', '-g']]])
    expect(probeTmuxChildSessionMarker({ env: { TMUX: 'x' }, ...found('OTRO=1') })).toBe('absent')
  })

  test('sin tmux, con salida no cero o si lanza, no se sabe', () => {
    expect(probeTmuxChildSessionMarker({ env: { TMUX: 'x' }, which: () => null, run: () => ({ status: 0, stdout: '' }) })).toBe('unknown')
    expect(probeTmuxChildSessionMarker({ env: { TMUX: 'x' }, ...found('THYROX_CODE_CHILD_SESSION=1', 1) })).toBe('unknown')
    expect(
      probeTmuxChildSessionMarker({
        env: { TMUX: 'x' },
        which: () => '/usr/bin/tmux',
        run: () => {
          throw new Error('timeout')
        },
      }),
    ).toBe('unknown')
  })
})

describe('setAmbientMarkerProbe (sYo)', () => {
  test('traduce true/false y memoriza la primera respuesta', () => {
    let calls = 0
    setAmbientMarkerProbe(() => {
      calls++
      return true
    })
    const child = host({ env: { THYROX_CODE_CHILD_SESSION: '1' } })
    expect(isNestedInteractiveSession(child)).toBe(false)
    expect(isNestedInteractiveSession(child)).toBe(false)
    expect(calls).toBe(1)
  })

  test('un estado explícito pasa tal cual', () => {
    setAmbientMarkerProbe(() => 'unknown')
    expect(isHeadlessToolCallOfAgentSession(host({ env: { THYROX_CODE_CHILD_SESSION: '1' }, stdinIsTTY: false, stdoutIsTTY: false, spawnedByAttendedSession: true }))).toBe(false)
  })

  test('una sonda que lanza queda en unknown', () => {
    setAmbientMarkerProbe(() => {
      throw new Error('x')
    })
    expect(isNestedInteractiveSession(host({ env: { THYROX_CODE_CHILD_SESSION: '1' } }))).toBe(true)
    expect(isHeadlessToolCallOfAgentSession(host({ env: { THYROX_CODE_CHILD_SESSION: '1' }, stdinIsTTY: false, stdoutIsTTY: false, spawnedByAttendedSession: true }))).toBe(false)
  })
})

describe('isNestedInteractiveSession (kFe)', () => {
  test('hija, interactiva, no teammate y sin marcador ambiente', () => {
    setAmbientMarkerProbe(() => false)
    expect(isNestedInteractiveSession(host({ env: { THYROX_CODE_CHILD_SESSION: '1' } }))).toBe(true)
  })

  test('forzar la persistencia, no ser hija o no ser interactiva lo apaga', () => {
    setAmbientMarkerProbe(() => false)
    expect(isNestedInteractiveSession(host({ env: { THYROX_CODE_CHILD_SESSION: '1', THYROX_CODE_FORCE_SESSION_PERSISTENCE: 'yes' } }))).toBe(false)
    expect(isNestedInteractiveSession(host())).toBe(false)
    expect(isNestedInteractiveSession(host({ env: { THYROX_CODE_CHILD_SESSION: '1' }, isInteractive: false }))).toBe(false)
  })

  test('un teammate no es sesión anidada', () => {
    setAmbientMarkerProbe(() => false)
    const child = host({ env: { THYROX_CODE_CHILD_SESSION: '1' } })
    expect(runWithTeammateContext(createTeammateContext(teammate), () => isNestedInteractiveSession(child))).toBe(false)
  })
})

describe('isHeadlessToolCallOfAgentSession (nUr)', () => {
  const headless = { env: { THYROX_CODE_CHILD_SESSION: 'on' }, stdinIsTTY: false, stdoutIsTTY: false, spawnedByAttendedSession: true }

  test('hija sin terminal, lanzada por una sesión atendida y sin marcador ambiente', () => {
    setAmbientMarkerProbe(() => false)
    expect(isHeadlessToolCallOfAgentSession(host(headless))).toBe(true)
  })

  test('cada condición la apaga', () => {
    setAmbientMarkerProbe(() => false)
    expect(isHeadlessToolCallOfAgentSession(host({ ...headless, env: {} }))).toBe(false)
    expect(isHeadlessToolCallOfAgentSession(host({ ...headless, stdinIsTTY: true }))).toBe(false)
    expect(isHeadlessToolCallOfAgentSession(host({ ...headless, stdoutIsTTY: true }))).toBe(false)
    expect(isHeadlessToolCallOfAgentSession(host({ ...headless, spawnedByAttendedSession: false }))).toBe(false)
  })

  test('con marcador ambiente no lo es', () => {
    setAmbientMarkerProbe(() => true)
    expect(isHeadlessToolCallOfAgentSession(host(headless))).toBe(false)
  })
})

describe('isOnAgentSessionSurface (cFt)', () => {
  test('una hija siempre lo está', () => {
    expect(isOnAgentSessionSurface(host({ env: { THYROX_CODE_CHILD_SESSION: '1' } }))).toBe(true)
  })

  test('dentro de la shell del agente: sin historial o sin terminal en las dos puntas', () => {
    expect(isOnAgentSessionSurface(host({ env: { CLAUDECODE: '1', THYROX_CODE_SKIP_PROMPT_HISTORY: 'true' } }))).toBe(true)
    expect(isOnAgentSessionSurface(host({ env: { CLAUDECODE: '1' }, stdinIsTTY: false, stdoutIsTTY: false }))).toBe(true)
    expect(isOnAgentSessionSurface(host({ env: { CLAUDECODE: '1' }, stdinIsTTY: false }))).toBe(false)
  })

  test('fuera de la shell del agente no lo está', () => {
    expect(isOnAgentSessionSurface(host({ env: { THYROX_CODE_SKIP_PROMPT_HISTORY: 'true' }, stdinIsTTY: false, stdoutIsTTY: false }))).toBe(false)
  })
})

describe('isModelDrivenSession (dF)', () => {
  test('un padre declarado, un teammate o una hija', () => {
    expect(isModelDrivenSession('p', host())).toBe(true)
    expect(isModelDrivenSession(undefined, host())).toBe(false)
    expect(isModelDrivenSession(undefined, host({ env: { THYROX_CODE_CHILD_SESSION: 'true' } }))).toBe(true)
    setDynamicTeamContext({ agentId: 'a@e', agentName: 'a', teamName: 'e', planModeRequired: false })
    expect(isModelDrivenSession(undefined, host())).toBe(true)
  })
})

describe('getParentSessionId (zE) y setCliParentSessionId (nYo)', () => {
  test('el contexto en proceso gana, luego el dinámico y al final la línea de comandos', () => {
    setCliParentSessionId('cli')
    expect(getParentSessionId()).toBe('cli')
    setDynamicTeamContext({ agentId: 'a@e', agentName: 'a', teamName: 'e', planModeRequired: false, parentSessionId: 'dinamico' })
    expect(getParentSessionId()).toBe('dinamico')
    expect(runWithTeammateContext(createTeammateContext(teammate), () => getParentSessionId())).toBe('lider')
  })

  test('un contexto dinámico sin padre cae al de la línea de comandos', () => {
    setCliParentSessionId('cli')
    setDynamicTeamContext({ agentId: 'a@e', agentName: 'a', teamName: 'e', planModeRequired: false })
    expect(getParentSessionId()).toBe('cli')
  })
})

describe('ownsSessionRegistryRecord (ud)', () => {
  test('una sesión sin agente y no anidada es dueña de su fila', () => {
    setAmbientMarkerProbe(() => false)
    expect(ownsSessionRegistryRecord(host())).toBe(true)
  })

  test('un teammate o una hija interactiva anidada no lo son', () => {
    setAmbientMarkerProbe(() => false)
    expect(ownsSessionRegistryRecord(host({ env: { THYROX_CODE_CHILD_SESSION: '1' } }))).toBe(false)
    setDynamicTeamContext({ agentId: 'a@e', agentName: 'a', teamName: '', planModeRequired: false })
    expect(ownsSessionRegistryRecord(host())).toBe(false)
  })
})
