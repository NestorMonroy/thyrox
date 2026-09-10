/**
 * Sin contraparte en `ccnmt` (el archivo fuente no trae test propio) — este
 * test se escribe para cumplir el requisito de TDD-con-mutación del porte
 * de `tasks/InProcessTeammateTask.ts` (ver `.claude/rules/evidencia-antes-de-afirmar.md`).
 */
import { afterEach, describe, expect, test } from 'bun:test'
import {
  _test_resetSwarmAppRuntime,
  installSwarmAppRuntime,
  SWARM_FUNCTION_BINDINGS,
  SWARM_VALUE_BINDINGS,
} from '../../adapters/appRuntime.js'
import {
  appendTeammateMessage,
  findTeammateTaskByAgentId,
  getAllInProcessTeammateTasks,
  getRunningTeammatesSorted,
  injectUserMessageToTeammate,
  requestTeammateShutdown,
} from '../InProcessTeammateTask.js'
import type { InProcessTeammateTaskState } from '../types.js'

const TERMINAL_STATUSES = new Set(['killed', 'completed', 'error'])

function install(): void {
  const bindings: Record<string, unknown> = {}
  for (const n of SWARM_FUNCTION_BINDINGS) bindings[n] = () => undefined
  for (const n of SWARM_VALUE_BINDINGS) bindings[n] = ''
  // logForDebugging vive en SWARM_VALUE_BINDINGS (el genérico de arriba le
  // asigna '' ) pero se INVOCA como función — mismo patrón que
  // backendRegistry.test.ts's instalar().
  bindings.logForDebugging = () => undefined
  bindings.isTerminalTaskStatus = (s: string) => TERMINAL_STATUSES.has(s)
  bindings.createUserMessage = (args: { content: unknown }) => ({
    type: 'user',
    message: { role: 'user', content: args.content },
  })
  // updateTaskState real-suficiente: lee/escribe sobre un mapa de tareas
  // dentro del AppState de prueba, igual que el host real lo haría.
  bindings.updateTaskState = (
    taskId: string,
    setAppState: (updater: (prev: { tasks: Record<string, unknown> }) => {
      tasks: Record<string, unknown>
    }) => void,
    updater: (task: unknown) => unknown,
  ) => {
    setAppState(prev => ({
      ...prev,
      tasks: { ...prev.tasks, [taskId]: updater(prev.tasks[taskId]) },
    }))
  }
  installSwarmAppRuntime(bindings)
}

afterEach(() => {
  _test_resetSwarmAppRuntime()
})

function makeTask(over: Partial<InProcessTeammateTaskState> = {}): InProcessTeammateTaskState {
  return {
    id: 't1',
    status: 'running',
    type: 'in_process_teammate',
    // `notified` y `description` son obligatorios en TaskStateBase (ver la
    // CORRECCIÓN 2 del docstring de types.ts) — sin estos defaults, cada
    // `makeTask()` de este archivo fallaría el typecheck por campo faltante.
    notified: false,
    description: 'tarea de prueba',
    identity: {
      agentId: 'a1',
      agentName: 'researcher',
      teamName: 'team1',
      planModeRequired: false,
      parentSessionId: 's1',
    },
    prompt: 'do the thing',
    awaitingPlanApproval: false,
    permissionMode: 'default',
    pendingUserMessages: [],
    isIdle: false,
    shutdownRequested: false,
    lastReportedToolCount: 0,
    lastReportedTokenCount: 0,
    ...over,
  }
}

describe('appendTeammateMessage', () => {
  test('añade el mensaje cuando la tarea está running', () => {
    install()
    let state: { tasks: Record<string, unknown> } = { tasks: { t1: makeTask() } }
    appendTeammateMessage('t1', { type: 'user' } as never, updater => {
      state = updater(state)
    })
    expect((state.tasks.t1 as InProcessTeammateTaskState).messages).toEqual([
      { type: 'user' },
    ])
  })

  test('no muta la tarea cuando NO está running', () => {
    install()
    const original = makeTask({ status: 'killed' })
    let state: { tasks: Record<string, unknown> } = { tasks: { t1: original } }
    appendTeammateMessage('t1', { type: 'user' } as never, updater => {
      state = updater(state)
    })
    expect(state.tasks.t1).toBe(original)
  })
})

describe('requestTeammateShutdown', () => {
  test('fija shutdownRequested cuando la tarea está running y no lo tenía', () => {
    install()
    let state: { tasks: Record<string, unknown> } = { tasks: { t1: makeTask() } }
    requestTeammateShutdown('t1', updater => {
      state = updater(state)
    })
    expect((state.tasks.t1 as InProcessTeammateTaskState).shutdownRequested).toBe(true)
  })

  test('es no-op si ya estaba pedido (evita re-crear el objeto)', () => {
    install()
    const alreadyRequested = makeTask({ shutdownRequested: true })
    let state: { tasks: Record<string, unknown> } = { tasks: { t1: alreadyRequested } }
    requestTeammateShutdown('t1', updater => {
      state = updater(state)
    })
    expect(state.tasks.t1).toBe(alreadyRequested)
  })

  test('es no-op si la tarea no está running', () => {
    install()
    const killed = makeTask({ status: 'killed' })
    let state: { tasks: Record<string, unknown> } = { tasks: { t1: killed } }
    requestTeammateShutdown('t1', updater => {
      state = updater(state)
    })
    expect(state.tasks.t1).toBe(killed)
  })
})

describe('injectUserMessageToTeammate', () => {
  test('encola el mensaje y lo añade a messages cuando running', () => {
    install()
    let state: { tasks: Record<string, unknown> } = { tasks: { t1: makeTask() } }
    injectUserMessageToTeammate('t1', 'hola', updater => {
      state = updater(state)
    })
    const t = state.tasks.t1 as InProcessTeammateTaskState
    expect(t.pendingUserMessages).toEqual(['hola'])
    expect(t.messages).toHaveLength(1)
  })

  test('encola el mensaje cuando la tarea está idle (no terminal)', () => {
    install()
    let state: { tasks: Record<string, unknown> } = {
      tasks: { t1: makeTask({ status: 'idle' }) },
    }
    injectUserMessageToTeammate('t1', 'hola', updater => {
      state = updater(state)
    })
    expect((state.tasks.t1 as InProcessTeammateTaskState).pendingUserMessages).toEqual([
      'hola',
    ])
  })

  test('RECHAZA (no-op) cuando la tarea está en estado terminal', () => {
    install()
    const killed = makeTask({ status: 'killed' })
    let state: { tasks: Record<string, unknown> } = { tasks: { t1: killed } }
    injectUserMessageToTeammate('t1', 'hola', updater => {
      state = updater(state)
    })
    expect(state.tasks.t1).toBe(killed)
  })
})

describe('findTeammateTaskByAgentId', () => {
  test('devuelve undefined si no hay coincidencia', () => {
    expect(findTeammateTaskByAgentId('nope', {})).toBeUndefined()
  })

  test('prefiere la tarea running sobre una matada con el mismo agentId', () => {
    const killed = makeTask({ id: 't1', status: 'killed' })
    const running = makeTask({ id: 't2', status: 'running' })
    const found = findTeammateTaskByAgentId('a1', { t1: killed, t2: running })
    expect(found).toBe(running)
  })

  test('cae al fallback (primera coincidencia) si ninguna está running', () => {
    const first = makeTask({ id: 't1', status: 'killed' })
    const second = makeTask({ id: 't2', status: 'error' })
    const found = findTeammateTaskByAgentId('a1', { t1: first, t2: second })
    expect(found).toBe(first)
  })

  test('ignora tareas de otro tipo (isInProcessTeammateTask filtra)', () => {
    const other = {
      id: 'x1',
      status: 'running',
      type: 'local_agent',
      description: 'otra tarea',
      notified: false,
    }
    const found = findTeammateTaskByAgentId('a1', { x1: other })
    expect(found).toBeUndefined()
  })
})

describe('getAllInProcessTeammateTasks / getRunningTeammatesSorted', () => {
  test('getAllInProcessTeammateTasks filtra por tipo', () => {
    const t1 = makeTask({ id: 't1' })
    const other = {
      id: 'x1',
      status: 'running',
      type: 'local_agent',
      description: 'otra tarea',
      notified: false,
    }
    const all = getAllInProcessTeammateTasks({ t1, x1: other })
    expect(all).toEqual([t1])
  })

  test('getRunningTeammatesSorted ordena alfabéticamente por agentName', () => {
    const zeta = makeTask({
      id: 't1',
      identity: { ...makeTask().identity, agentId: 'z@t', agentName: 'zeta' },
    })
    const alpha = makeTask({
      id: 't2',
      identity: { ...makeTask().identity, agentId: 'a@t', agentName: 'alpha' },
    })
    const sorted = getRunningTeammatesSorted({ t1: zeta, t2: alpha })
    expect(sorted.map(t => t.identity.agentName)).toEqual(['alpha', 'zeta'])
  })

  test('getRunningTeammatesSorted excluye tareas no-running', () => {
    const running = makeTask({ id: 't1', status: 'running' })
    const idle = makeTask({
      id: 't2',
      status: 'idle',
      identity: { ...makeTask().identity, agentId: 'b@t', agentName: 'bravo' },
    })
    const sorted = getRunningTeammatesSorted({ t1: running, t2: idle })
    expect(sorted).toEqual([running])
  })
})
