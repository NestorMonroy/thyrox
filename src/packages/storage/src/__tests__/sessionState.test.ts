import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  getSessionState,
  notifyPermissionModeChanged,
  notifySessionMetadataChanged,
  notifySessionStateChanged,
  resetSessionStateForTest,
  setEnqueueSdkEventFn,
  setPermissionModeChangedListener,
  setSessionMetadataChangedListener,
  setSessionStateChangedListener,
  type RequiresActionDetails,
  type SessionExternalMetadata,
  type SessionState,
} from '../sessionState.js'

const ORIGINAL_ENV = process.env.CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS

beforeEach(() => {
  resetSessionStateForTest()
  setEnqueueSdkEventFn(() => {})
  delete process.env.CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS
})

afterEach(() => {
  resetSessionStateForTest()
  setSessionStateChangedListener(null)
  setSessionMetadataChangedListener(null)
  setPermissionModeChangedListener(null)
  setEnqueueSdkEventFn(() => {})
  if (ORIGINAL_ENV === undefined) {
    delete process.env.CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS
  } else {
    process.env.CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS = ORIGINAL_ENV
  }
})

describe('getSessionState / notifySessionStateChanged', () => {
  test('arranca en idle', () => {
    expect(getSessionState()).toBe('idle')
  })

  test('notifica al listener de estado con el nuevo estado', () => {
    const seen: SessionState[] = []
    setSessionStateChangedListener(s => seen.push(s))

    notifySessionStateChanged('running')
    notifySessionStateChanged('idle')

    expect(seen).toEqual(['running', 'idle'])
    expect(getSessionState()).toBe('idle')
  })

  test('sin listener registrado, no lanza', () => {
    expect(() => notifySessionStateChanged('running')).not.toThrow()
  })
})

describe('requires_action → pending_action mirroring', () => {
  test('al pasar a requires_action con detalles, el metadataListener recibe pending_action', () => {
    const metadataSeen: SessionExternalMetadata[] = []
    setSessionMetadataChangedListener(m => metadataSeen.push(m))

    const details: RequiresActionDetails = {
      tool_name: 'Bash',
      action_description: 'Running npm test',
      tool_use_id: 'tu-1',
      request_id: 'req-1',
    }
    notifySessionStateChanged('requires_action', details)

    expect(metadataSeen).toHaveLength(1)
    expect(metadataSeen[0]?.pending_action).toEqual(details)
  })

  test('al salir de requires_action, se limpia pending_action con null (RFC 7396)', () => {
    const metadataSeen: SessionExternalMetadata[] = []
    setSessionMetadataChangedListener(m => metadataSeen.push(m))

    notifySessionStateChanged('requires_action', {
      tool_name: 'Bash',
      action_description: 'x',
      tool_use_id: 'tu-1',
      request_id: 'req-1',
    })
    notifySessionStateChanged('running')

    // El segundo evento — la transición NO bloqueada — limpia pending_action.
    expect(metadataSeen[1]?.pending_action).toBeNull()
  })

  test('requires_action SIN detalles no marca pending_action (nada que reflejar ni limpiar)', () => {
    const metadataSeen: SessionExternalMetadata[] = []
    setSessionMetadataChangedListener(m => metadataSeen.push(m))

    notifySessionStateChanged('requires_action')
    notifySessionStateChanged('running')

    expect(metadataSeen).toHaveLength(0)
  })

  test('una segunda transición no-bloqueada consecutiva NO vuelve a limpiar', () => {
    const metadataSeen: SessionExternalMetadata[] = []
    notifySessionStateChanged('requires_action', {
      tool_name: 'Bash',
      action_description: 'x',
      tool_use_id: 'tu-1',
      request_id: 'req-1',
    })
    setSessionMetadataChangedListener(m => metadataSeen.push(m))
    notifySessionStateChanged('running')
    notifySessionStateChanged('idle')

    // running limpia pending_action; idle limpia task_summary (otra
    // rama) pero YA no vuelve a tocar pending_action.
    const pendingActionEvents = metadataSeen.filter(m => 'pending_action' in m)
    expect(pendingActionEvents).toHaveLength(1)
  })
})

describe('idle limpia task_summary', () => {
  test('al pasar a idle, el metadataListener recibe task_summary:null', () => {
    const metadataSeen: SessionExternalMetadata[] = []
    setSessionMetadataChangedListener(m => metadataSeen.push(m))
    notifySessionStateChanged('idle')
    expect(metadataSeen).toEqual([{ task_summary: null }])
  })

  test('running NO limpia task_summary', () => {
    const metadataSeen: SessionExternalMetadata[] = []
    setSessionMetadataChangedListener(m => metadataSeen.push(m))
    notifySessionStateChanged('running')
    expect(metadataSeen).toHaveLength(0)
  })
})

describe('emisión al stream SDK — gateada por env var', () => {
  test('sin CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS, no encola nada', () => {
    const events: Record<string, unknown>[] = []
    setEnqueueSdkEventFn(e => events.push(e))
    notifySessionStateChanged('running')
    expect(events).toHaveLength(0)
  })

  test('con CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS=1, encola el evento con el estado', () => {
    process.env.CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS = '1'
    const events: Record<string, unknown>[] = []
    setEnqueueSdkEventFn(e => events.push(e))
    notifySessionStateChanged('running')
    expect(events).toEqual([
      { type: 'system', subtype: 'session_state_changed', state: 'running' },
    ])
  })
})

describe('notifySessionMetadataChanged / notifyPermissionModeChanged', () => {
  test('reenvían directo al listener registrado', () => {
    const metadataSeen: SessionExternalMetadata[] = []
    setSessionMetadataChangedListener(m => metadataSeen.push(m))
    notifySessionMetadataChanged({ model: 'claude-sonnet-5' })
    expect(metadataSeen).toEqual([{ model: 'claude-sonnet-5' }])

    const modesSeen: string[] = []
    setPermissionModeChangedListener(m => modesSeen.push(m))
    notifyPermissionModeChanged('acceptEdits')
    expect(modesSeen).toEqual(['acceptEdits'])
  })

  test('sin listener registrado, ninguna de las dos lanza', () => {
    expect(() =>
      notifySessionMetadataChanged({ model: 'x' }),
    ).not.toThrow()
    expect(() => notifyPermissionModeChanged('default')).not.toThrow()
  })
})
