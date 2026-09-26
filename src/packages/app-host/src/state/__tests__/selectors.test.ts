import { describe, expect, test } from 'bun:test'
import { getActiveAgentForInput, getViewedTeammateTask } from '../selectors.js'
import type { InProcessTeammateTaskState } from '@thyrox/swarm'
import type { LocalAgentTaskState } from '@thyrox/agent/localAgentTask.js'

function teammateTask(
  overrides: Partial<InProcessTeammateTaskState> = {},
): InProcessTeammateTaskState {
  return {
    id: 't1',
    status: 'running',
    type: 'in_process_teammate',
    notified: false,
    description: 'tarea de prueba',
    startTime: 0,
    outputFile: '',
    outputOffset: 0,
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
    ...overrides,
  }
}

function localAgentTask(
  overrides: Partial<LocalAgentTaskState> = {},
): LocalAgentTaskState {
  return {
    id: 'a1',
    status: 'running',
    type: 'local_agent',
    notified: false,
    description: 'tarea de prueba',
    startTime: 0,
    outputFile: '',
    outputOffset: 0,
    agentId: 'a1',
    prompt: 'do the thing',
    agentType: 'reviewer',
    retrieved: false,
    lastReportedToolCount: 0,
    lastReportedTokenCount: 0,
    isBackgrounded: false,
    pendingMessages: [],
    retain: false,
    diskLoaded: false,
    ...overrides,
  }
}

describe('getViewedTeammateTask', () => {
  test('devuelve undefined si no se está viendo ningún teammate', () => {
    expect(
      getViewedTeammateTask({ viewingAgentTaskId: undefined, tasks: {} }),
    ).toBeUndefined()
  })

  test('devuelve undefined si la tarea no existe en tasks', () => {
    expect(
      getViewedTeammateTask({ viewingAgentTaskId: 'missing', tasks: {} }),
    ).toBeUndefined()
  })

  test('devuelve undefined si la tarea no es un in_process_teammate', () => {
    expect(
      getViewedTeammateTask({
        viewingAgentTaskId: 't1',
        tasks: { t1: { type: 'local_agent' } },
      }),
    ).toBeUndefined()
  })

  test('devuelve la tarea cuando sí es un in_process_teammate', () => {
    const task = teammateTask()
    expect(
      getViewedTeammateTask({
        viewingAgentTaskId: 't1',
        tasks: { t1: task },
      }),
    ).toEqual(task)
  })
})

describe('getActiveAgentForInput', () => {
  test('leader cuando no se está viendo nada', () => {
    expect(
      getActiveAgentForInput({ viewingAgentTaskId: undefined, tasks: {} }),
    ).toEqual({ type: 'leader' })
  })

  test('viewed cuando la tarea vista es un teammate in-process', () => {
    const task = teammateTask()
    expect(
      getActiveAgentForInput({ viewingAgentTaskId: 't1', tasks: { t1: task } }),
    ).toEqual({ type: 'viewed', task })
  })

  test('named_agent cuando la tarea vista es local_agent', () => {
    const task = localAgentTask()
    expect(
      getActiveAgentForInput({ viewingAgentTaskId: 't1', tasks: { t1: task } }),
    ).toEqual({ type: 'named_agent', task })
  })

  test('leader cuando la tarea vista no existe ni es teammate ni local_agent', () => {
    expect(
      getActiveAgentForInput({
        viewingAgentTaskId: 't1',
        tasks: { t1: { type: 'other' } },
      }),
    ).toEqual({ type: 'leader' })
  })
})
