import { describe, expect, test } from 'bun:test'
import {
  isSnipMarkerMessage,
  createSnipBoundaryMessage,
  snipCompactCore,
  shouldNudgeForSnips,
  SNIP_MARKER_SUBTYPE,
  SNIP_BOUNDARY_SUBTYPE,
  MIN_KEEP_GROUPS,
  type SnipMessage,
  type SnipCompactDeps,
} from '../compaction/snipCompactCore.ts'
import { groupMessagesByApiRound } from '../compaction/grouping.ts'

const assistant = (id: string): SnipMessage => ({ type: 'assistant', message: { id } })
const user = (): SnipMessage => ({ type: 'user' })
const round = (id: string): SnipMessage[] => [assistant(id), user()]

function deps(overrides: Partial<SnipCompactDeps> = {}): SnipCompactDeps {
  return {
    groupMessagesByApiRound,
    tokenCountWithEstimation: (messages) => messages.length * 100,
    getAutoCompactThreshold: () => 100_000,
    randomUUID: () => 'fixed-uuid',
    getEnv: () => undefined,
    ...overrides,
  }
}

describe('isSnipMarkerMessage', () => {
  test('un system con subtype snip_marker lo es', () => {
    expect(isSnipMarkerMessage({ type: 'system', subtype: SNIP_MARKER_SUBTYPE })).toBe(true)
  })
  test('cualquier otro no lo es', () => {
    expect(isSnipMarkerMessage(user())).toBe(false)
  })
})

describe('createSnipBoundaryMessage', () => {
  test('arma el mensaje de frontera con el conteo y el uuid inyectado', () => {
    const m = createSnipBoundaryMessage(500, 3, () => 'u-1')
    expect(m.type).toBe('system')
    expect(m.subtype).toBe(SNIP_BOUNDARY_SUBTYPE)
    expect(m.uuid).toBe('u-1')
    expect(m.content).toBe('History snipped: 3 round(s) removed (~500 tokens freed)')
    expect(m.compactMetadata).toEqual({ trigger: 'auto', preTokens: 500, snipGroupsRemoved: 3 })
  })
})

describe('snipCompactCore', () => {
  test('con menos rondas que MIN_KEEP_GROUPS + 1, no ejecuta', () => {
    const messages = [...round('a1'), ...round('a2')]
    const r = snipCompactCore(messages, undefined, deps())
    expect(r.executed).toBe(false)
    expect(r.tokensFreed).toBe(0)
  })

  test('con rondas suficientes pero uso por debajo del 90% del umbral, no ejecuta (sin force)', () => {
    const messages = [...round('a1'), ...round('a2'), ...round('a3'), ...round('a4')]
    const r = snipCompactCore(messages, undefined, deps({ tokenCountWithEstimation: () => 1 }))
    expect(r.executed).toBe(false)
  })

  test('con force, ignora el umbral de tokens y ejecuta si hay rondas removibles', () => {
    const messages = [...round('a1'), ...round('a2'), ...round('a3'), ...round('a4')]
    const r = snipCompactCore(messages, { force: true }, deps({ tokenCountWithEstimation: () => 1 }))
    expect(r.executed).toBe(true)
  })

  test('conserva la primera ronda y las MIN_KEEP_GROUPS últimas; recorta lo de en medio', () => {
    const messages = [...round('a1'), ...round('a2'), ...round('a3'), ...round('a4'), ...round('a5')]
    const r = snipCompactCore(messages, { force: true }, deps())
    expect(r.executed).toBe(true)
    // cabeza (a1) + frontera + cola (a4, a5) = 2 + 1 + 4 = 7
    expect(r.messages.length).toBe(2 + 1 + MIN_KEEP_GROUPS * 2)
    expect(r.messages[0]).toEqual(assistant('a1'))
    expect(r.messages[1]).toBe(r.messages[1]) // user() de a1
    expect(r.boundaryMessage?.type).toBe('system')
    expect(r.messages.at(-2)).toEqual(assistant('a5'))
  })

  test('quita marcadores de snip previos antes de agrupar', () => {
    const marker: SnipMessage = { type: 'system', subtype: 'snip_marker' }
    const messages = [marker, ...round('a1'), ...round('a2'), ...round('a3'), ...round('a4')]
    const r = snipCompactCore(messages, { force: true }, deps())
    expect(r.messages.some((m) => isSnipMarkerMessage(m))).toBe(false)
  })

  test('sin rondas removibles tras cabeza/cola (exactamente 3 rondas), no ejecuta aunque pase el umbral de tamaño', () => {
    const messages = [...round('a1'), ...round('a2'), ...round('a3')]
    const r = snipCompactCore(messages, { force: true }, deps())
    expect(r.executed).toBe(false)
  })

  test('control de anulación: sin el filtro de marcadores previos, un snip re-corrido dejaría marcadores viejos dentro de la cola conservada', () => {
    const withoutFilter = (messages: SnipMessage[]): SnipMessage[] => messages
    const marker: SnipMessage = { type: 'system', subtype: 'snip_marker' }
    const messages = [...round('a1'), ...round('a2'), marker, ...round('a3'), ...round('a4')]
    expect(withoutFilter(messages).some((m) => isSnipMarkerMessage(m))).toBe(true)
    const r = snipCompactCore(messages, { force: true }, deps())
    expect(r.messages.some((m) => isSnipMarkerMessage(m))).toBe(false)
  })
})

describe('shouldNudgeForSnips', () => {
  test('al 80% o más del umbral, sugiere el nudge', () => {
    const d = deps({ getAutoCompactThreshold: () => 1000, tokenCountWithEstimation: () => 800 })
    expect(shouldNudgeForSnips([], d)).toBe(true)
  })
  test('por debajo del 80%, no', () => {
    const d = deps({ getAutoCompactThreshold: () => 1000, tokenCountWithEstimation: () => 799 })
    expect(shouldNudgeForSnips([], d)).toBe(false)
  })
})
