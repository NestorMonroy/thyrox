import { describe, expect, test } from 'bun:test'
import {
  addCronTask,
  cancelAllPendingLoopSessionCrons,
  computeNextCronRun,
  createCronScheduler,
  cronToHuman,
  getCronFilePath,
  isLoopDynamicEnabled,
  listAllCronTasks,
  nextCronRunMs,
  parseCronExpression,
  removeCronTasks,
  resolveLoopDefaultFire,
  scheduleLoopWakeup,
} from '../scheduler.ts'

describe('@thyrox/agent/scheduler public surface', () => {
  test('publishes the canonical scheduler implementations', () => {
    const functions = [
      addCronTask,
      cancelAllPendingLoopSessionCrons,
      computeNextCronRun,
      createCronScheduler,
      cronToHuman,
      getCronFilePath,
      isLoopDynamicEnabled,
      listAllCronTasks,
      nextCronRunMs,
      parseCronExpression,
      removeCronTasks,
      resolveLoopDefaultFire,
      scheduleLoopWakeup,
    ]

    expect(functions.every(value => typeof value === 'function')).toBe(true)
    expect(parseCronExpression('0 9 * * 1')).not.toBeNull()
    expect(resolveLoopDefaultFire('continue')).toBe('continue')
  })
})
