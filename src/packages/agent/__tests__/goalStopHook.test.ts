/**
 * Porte de `ccnmt: packages/agent/__tests__/goalStopHook.test.ts` —
 * corrección de porte contra ant v2.1.136 (4513.js, 4688.js, 4689.js,
 * 5036.js).
 *
 * La cobertura incluye los ayudantes puros (KZ3/qZ3, Pj6, jf3, dYK, wbK)
 * más el camino de mutación de session-hook/AppState. `/goal` es una
 * máquina de estados: los tests de sólo-ayudantes se pierden el
 * reemplazo del hook, la persistencia del sentinel, y los efectos
 * secundarios de la restauración.
 *
 * DIVERGENCIA DE INFRAESTRUCTURA, declarada: se añade el `beforeAll` que
 * instala `AgentHostBindings` vacías. `../goalStopHook.ts` llama a
 * `logEvent`/`logForDebugging` (`../internal/logging.ts`), que en este
 * árbol lanzan `HostBindingsError` si el host no fue instalado
 * (`../host.ts:getAgentHostBindings`) — la fuente ccb no tiene esa
 * exigencia (su `local-observability` no lanza sin bindings). Mismo
 * patrón ya establecido en
 * `__tests__/internalCommandQueue.behavior.test.ts:33-38` de este árbol.
 * No es un caso de test — no cuenta para el gate de fidelidad.
 */
import { beforeAll, describe, expect, mock, test } from 'bun:test'

import { installAgentHostBindings } from '../host.ts'
import type { AgentHostBindings } from '../host.ts'

beforeAll(() => {
  // Ataduras de host vacías — logEvent/logForDebugging caen al no-op vía
  // optional-chain en vez de lanzar HostBindingsError.
  installAgentHostBindings({} as AgentHostBindings)
})

const realHooksConfigSnapshot = await import('../hooksConfigSnapshot.js')
mock.module('../hooksConfigSnapshot.js', () => ({
  ...realHooksConfigSnapshot,
  shouldDisableAllHooksIncludingManaged: () => false,
  shouldAllowManagedHooksOnly: () => false,
}))
import {
  GOAL_CLEAR_KEYWORDS,
  GOAL_CONDITION_MAX_LENGTH,
  addGoalStopHook,
  buildGoalMetaMessage,
  clearGoalStopHook,
  findGoalToRestore,
  findMostRecentMetGoalStatus,
  formatLastCheck,
  isGoalClearKeyword,
  pauseGoalStopHook,
  renderActiveGoalStatus,
  restoreGoalFromTranscript,
  resumeGoalStopHook,
} from '../goalStopHook.js'
import { getSessionHooks } from '../hooks/sessionHooks.js'
import type { Message } from '../messageShapes.js'

describe('GOAL_CONDITION_MAX_LENGTH', () => {
  test('coincide con LrH=4000 de ant', () => {
    expect(GOAL_CONDITION_MAX_LENGTH).toBe(4000)
  })
})

describe('isGoalClearKeyword (ant Pj6 / jf3)', () => {
  test('el conjunto exacto de ant: clear, stop, off, reset, none, cancel', () => {
    expect([...GOAL_CLEAR_KEYWORDS].sort()).toEqual(
      ['cancel', 'clear', 'none', 'off', 'reset', 'stop'],
    )
  })
  test('no distingue mayúsculas/minúsculas', () => {
    expect(isGoalClearKeyword('Clear')).toBe(true)
    expect(isGoalClearKeyword('STOP')).toBe(true)
    expect(isGoalClearKeyword('CaNcEl')).toBe(true)
  })
  test('devuelve false para palabras que no son keywords', () => {
    expect(isGoalClearKeyword('done')).toBe(false)
    expect(isGoalClearKeyword('clears')).toBe(false)
    expect(isGoalClearKeyword('clear ')).toBe(false) // el llamador ya recorta espacios
    expect(isGoalClearKeyword('finish the task')).toBe(false)
  })
})

describe('formatLastCheck (ant Wj6)', () => {
  test('recorta espacios y antepone el prefijo', () => {
    expect(formatLastCheck('  reason text  ')).toBe('Last check: reason text')
  })
})

describe('buildGoalMetaMessage (ant Gj6)', () => {
  test('contiene la condición y el lenguaje directivo', () => {
    const msg = buildGoalMetaMessage('finish the migration')
    expect(msg).toContain('finish the migration')
    // Invariantes críticos de ant Gj6 — estas frases son la parte que
    // sostiene el prompt; si falta alguna, el agente deja de comportarse
    // como un goal-loop.
    expect(msg).toContain('A session-scoped Stop hook is now active')
    expect(msg).toContain('treat the condition itself as your directive')
    expect(msg).toContain('do not pause to ask the user what to do')
    expect(msg).toContain('/goal clear')
  })
})

function attachmentMessage(
  attachment: Record<string, unknown>,
  timestamp = '2026-05-12T12:00:00Z',
): Message {
  return {
    type: 'attachment',
    uuid: '00000000-0000-0000-0000-000000000000',
    timestamp,
    attachment,
  } as unknown as Message
}

type TestState = {
  activeGoal?: {
    condition: string
    iterations: number
    setAt: number
    tokensAtStart: number
    lastReason?: string
    paused?: boolean
  }
  sessionHooks: Map<string, { hooks: Record<string, unknown[]> }>
}

function createGoalContext(sessionId = 'session-goal') {
  let state: TestState = { sessionHooks: new Map() }
  let messages: Message[] = []
  const setAppState = (updater: (prev: TestState) => TestState) => {
    state = updater(state)
  }
  const setMessages = (updater: (prev: Message[]) => Message[]) => {
    messages = updater(messages)
  }
  return {
    sessionId,
    ctx: {
      getAppState: () => state as any,
      setAppState: setAppState as any,
      setMessages,
      sessionId,
      getMessages: () => messages,
    },
    get state() {
      return state
    },
    get messages() {
      return messages
    },
  }
}

function stopPromptHooks(state: TestState, sessionId: string): string[] {
  const stopHooks = getSessionHooks(state as any, sessionId, 'Stop').get('Stop') ?? []
  return stopHooks.flatMap(matcher =>
    matcher.hooks
      .filter(hook => hook.type === 'prompt')
      .map(hook => (hook as { prompt: string }).prompt),
  )
}

describe('mutación del ciclo de vida del Stop hook de goal', () => {
  test('addGoalStopHook instala un Stop prompt hook, activeGoal, y el sentinel de set', () => {
    const harness = createGoalContext()

    addGoalStopHook('ship the patch', harness.ctx)

    expect(stopPromptHooks(harness.state, harness.sessionId)).toEqual([
      'ship the patch',
    ])
    expect(harness.state.activeGoal?.condition).toBe('ship the patch')
    expect(harness.state.activeGoal?.iterations).toBe(0)
    expect(harness.state.activeGoal?.tokensAtStart).toBeNumber()
    expect(harness.messages).toHaveLength(1)
    expect((harness.messages[0] as any).attachment).toMatchObject({
      type: 'goal_status',
      met: false,
      sentinel: true,
      condition: 'ship the patch',
    })
  })

  test('addGoalStopHook reemplaza el hook de goal anterior en vez de apilar goals', () => {
    const harness = createGoalContext()

    addGoalStopHook('first goal', harness.ctx)
    addGoalStopHook('second goal', harness.ctx)

    expect(stopPromptHooks(harness.state, harness.sessionId)).toEqual([
      'second goal',
    ])
    expect(harness.state.activeGoal?.condition).toBe('second goal')
    expect(harness.messages.map(m => (m as any).attachment.condition)).toEqual([
      'first goal',
      'second goal',
    ])
  })

  test('clearGoalStopHook retira el hook de goal, limpia activeGoal, y apenda el sentinel de clear', () => {
    const harness = createGoalContext()
    addGoalStopHook('goal to clear', harness.ctx)

    const prior = clearGoalStopHook(harness.ctx)

    expect(prior).toBe('goal to clear')
    expect(stopPromptHooks(harness.state, harness.sessionId)).toEqual([])
    expect(harness.state.activeGoal).toBeUndefined()
    expect((harness.messages.at(-1) as any).attachment).toMatchObject({
      type: 'goal_status',
      met: true,
      sentinel: true,
      condition: 'goal to clear',
    })
  })

  test('pauseGoalStopHook retira el Stop hook pero conserva activeGoal pausado', () => {
    const harness = createGoalContext()
    addGoalStopHook('pause me', harness.ctx)

    const prior = pauseGoalStopHook(harness.ctx)

    expect(prior).toBe('pause me')
    expect(stopPromptHooks(harness.state, harness.sessionId)).toEqual([])
    expect(harness.state.activeGoal).toMatchObject({
      condition: 'pause me',
      paused: true,
    })
    expect((harness.messages.at(-1) as any).attachment).toMatchObject({
      type: 'goal_status',
      met: false,
      paused: true,
      condition: 'pause me',
    })
  })

  test('resumeGoalStopHook restaura el Stop hook y despausa activeGoal', () => {
    const harness = createGoalContext()
    addGoalStopHook('resume me', harness.ctx)
    pauseGoalStopHook(harness.ctx)

    const prior = resumeGoalStopHook(harness.ctx)

    expect(prior).toBe('resume me')
    expect(stopPromptHooks(harness.state, harness.sessionId)).toEqual([
      'resume me',
    ])
    expect(harness.state.activeGoal).toMatchObject({
      condition: 'resume me',
      paused: false,
    })
    expect((harness.messages.at(-1) as any).attachment).toMatchObject({
      type: 'goal_status',
      met: false,
      condition: 'resume me',
    })
  })

  test('clearGoalStopHook devuelve null sin mutar los mensajes cuando no existe hook de goal', () => {
    const harness = createGoalContext()

    expect(clearGoalStopHook(harness.ctx)).toBeNull()
    expect(harness.messages).toEqual([])
    expect(harness.state.activeGoal).toBeUndefined()
  })

  test('restoreGoalFromTranscript re-arma un goal sin resolver del transcript', () => {
    const harness = createGoalContext('restore-session')
    const messages = [
      attachmentMessage({
        type: 'goal_status',
        met: false,
        condition: 'finish restored work',
      }),
    ]

    restoreGoalFromTranscript(
      messages,
      harness.ctx.setAppState,
      harness.sessionId,
    )

    expect(stopPromptHooks(harness.state, harness.sessionId)).toEqual([
      'finish restored work',
    ])
    expect(harness.state.activeGoal).toMatchObject({
      condition: 'finish restored work',
      iterations: 0,
    })
  })

  test('restoreGoalFromTranscript limpia el activeGoal obsoleto tras un estado terminal del transcript', () => {
    const harness = createGoalContext('terminal-session')
    addGoalStopHook('stale goal', harness.ctx)
    const messages = [
      attachmentMessage({
        type: 'goal_status',
        met: false,
        failed: true,
        condition: 'stale goal',
      }),
    ]

    restoreGoalFromTranscript(
      messages,
      harness.ctx.setAppState,
      harness.sessionId,
    )

    expect(harness.state.activeGoal).toBeUndefined()
    expect(stopPromptHooks(harness.state, harness.sessionId)).toEqual([
      'stale goal',
    ])
  })
})

describe('findMostRecentMetGoalStatus (ant KZ3)', () => {
  test('devuelve null cuando no hay mensajes goal_status', () => {
    expect(findMostRecentMetGoalStatus([])).toBeNull()
  })
  test('omite los registros met sentinel (son marcadores de /goal set/clear)', () => {
    const messages = [
      attachmentMessage({
        type: 'goal_status',
        met: true,
        sentinel: true,
        condition: 'a',
      }),
    ]
    expect(findMostRecentMetGoalStatus(messages)).toBeNull()
  })
  test('omite los registros no logrados (met:false)', () => {
    const messages = [
      attachmentMessage({
        type: 'goal_status',
        met: false,
        condition: 'a',
      }),
    ]
    expect(findMostRecentMetGoalStatus(messages)).toBeNull()
  })
  test('devuelve el registro met:true no-sentinel más reciente', () => {
    const messages = [
      attachmentMessage(
        { type: 'goal_status', met: true, condition: 'old' },
        '2026-05-10T12:00:00Z',
      ),
      attachmentMessage(
        {
          type: 'goal_status',
          met: true,
          condition: 'newer',
          durationMs: 3_600_000,
          iterations: 5,
        },
        '2026-05-12T12:00:00Z',
      ),
    ]
    const result = findMostRecentMetGoalStatus(messages)
    expect(result?.condition).toBe('newer')
    expect(result?.stats).toContain('5 turns')
  })
})

describe('findGoalToRestore (ant wbK)', () => {
  test('devuelve la condición cuando el último goal_status es met:false', () => {
    const messages = [
      attachmentMessage({
        type: 'goal_status',
        met: false,
        condition: 'in progress',
      }),
    ]
    expect(findGoalToRestore(messages)).toBe('in progress')
  })
  test('devuelve null cuando el último goal_status es met:true (estado limpio)', () => {
    const messages = [
      attachmentMessage({
        type: 'goal_status',
        met: false,
        condition: 'older',
      }),
      attachmentMessage({
        type: 'goal_status',
        met: true,
        sentinel: true,
        condition: 'cleared',
      }),
    ]
    expect(findGoalToRestore(messages)).toBeNull()
  })
  test('null cuando no existen mensajes goal_status', () => {
    expect(findGoalToRestore([])).toBeNull()
    expect(
      findGoalToRestore([
        { type: 'user', uuid: 'u', timestamp: '', message: {} } as unknown as Message,
      ]),
    ).toBeNull()
  })
  test('null cuando el último goal_status es failed:true (ant 1.43 BQK)', () => {
    // Fuente: ant v2.1.143 5083.js BQK — `q.attachment.met||q.attachment.failed`.
    // Sin esta guardia, resumir-tras-imposible re-armaría en silencio un
    // goal que el evaluador ya juzgó inalcanzable. Test de regresión que
    // fija el comportamiento de 1.43.
    const messages = [
      attachmentMessage({
        type: 'goal_status',
        met: false,
        failed: true,
        condition: 'impossible thing',
      }),
    ]
    expect(findGoalToRestore(messages)).toBeNull()
  })
  test('paused:true después de uno activo más antiguo no se restaura como hook en ejecución', () => {
    const messages = [
      attachmentMessage({
        type: 'goal_status',
        met: false,
        condition: 'older active',
      }),
      attachmentMessage({
        type: 'goal_status',
        met: false,
        paused: true,
        condition: 'paused goal',
      }),
    ]
    expect(findGoalToRestore(messages)).toBeNull()
  })

  test('restoreGoalFromTranscript restaura un goal pausado sin re-armar el Stop hook', () => {
    const harness = createGoalContext('paused-restore-session')
    const messages = [
      attachmentMessage({
        type: 'goal_status',
        met: false,
        paused: true,
        condition: 'paused restore',
      }),
    ]

    restoreGoalFromTranscript(
      messages,
      harness.ctx.setAppState,
      harness.sessionId,
    )

    expect(stopPromptHooks(harness.state, harness.sessionId)).toEqual([])
    expect(harness.state.activeGoal).toMatchObject({
      condition: 'paused restore',
      paused: true,
    })
  })

  test('failed:true después de uno activo más antiguo: failed termina la cadena de restauración', () => {
    const messages = [
      attachmentMessage({
        type: 'goal_status',
        met: false,
        condition: 'older active',
      }),
      attachmentMessage({
        type: 'goal_status',
        met: false,
        failed: true,
        condition: 'newer failed',
      }),
    ]
    expect(findGoalToRestore(messages)).toBeNull()
  })
})

describe('renderActiveGoalStatus (ant qZ3)', () => {
  test('sin goal: devuelve la línea de uso', () => {
    const out = renderActiveGoalStatus(undefined, [])
    expect(out).toBe('No goal set. Usage: `/goal <condition>`')
  })
  test('sin goal pero existe un registro met previo: muestra la línea Last', () => {
    const messages = [
      attachmentMessage({
        type: 'goal_status',
        met: true,
        condition: 'done thing',
        iterations: 2,
      }),
    ]
    const out = renderActiveGoalStatus(undefined, messages)
    expect(out).toContain('No goal set. Usage:')
    expect(out).toContain('Last: ✔ done thing')
  })
  test('goal activo renderiza viñeta + iteración + línea de clear', () => {
    const out = renderActiveGoalStatus(
      { condition: 'X', iterations: 0, setAt: Date.now(), tokensAtStart: 0 },
      [],
    )
    expect(out).toContain('● Goal: X')
    expect(out).toContain('not yet evaluated')
    expect(out).toContain('/goal clear')
  })
  test('goal activo con iteraciones + lastReason renderiza las tres líneas', () => {
    const out = renderActiveGoalStatus(
      {
        condition: 'Y',
        iterations: 3,
        setAt: Date.now(),
        tokensAtStart: 0,
        lastReason: 'still failing tests',
      },
      [],
    )
    expect(out).toContain('● Goal: Y')
    expect(out).toContain('3 iterations')
    expect(out).toContain('Last check: still failing tests')
    expect(out).toContain('/goal clear')
  })
  test('1 iteración = singular', () => {
    const out = renderActiveGoalStatus(
      { condition: 'Z', iterations: 1, setAt: Date.now(), tokensAtStart: 0 },
      [],
    )
    expect(out).toContain('1 iteration')
    expect(out).not.toContain('1 iterations')
  })
})
