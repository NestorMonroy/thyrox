import { describe, expect, test } from 'bun:test'
import { getActiveAgentForInput, getViewedTeammateTask } from '../selectors.js'

function teammateTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 't1',
    status: 'running',
    type: 'in_process_teammate',
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
    const task = { type: 'local_agent', name: 'reviewer' }
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
