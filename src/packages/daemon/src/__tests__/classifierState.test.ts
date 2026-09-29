import { describe, expect, test } from 'bun:test'
import { TASK_KINDS, type TaskKind } from '../classifier/state.js'

describe('TASK_KINDS', () => {
  test('es la unica definicion canonica de los kinds de tarea/worker', () => {
    expect(TASK_KINDS).toEqual(['local_bash', 'in_process_teammate', 'dream', 'auto_mode_scan'])
  })

  test('cada valor tipa como TaskKind', () => {
    const k: TaskKind = TASK_KINDS[1]
    expect(k).toBe('in_process_teammate')
  })
})
