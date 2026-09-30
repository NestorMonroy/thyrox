/**
 * Un candado por clave que SERIALIZA: cada llamada ejecuta su propia función,
 * una tras otra por clave, y recibe su propio resultado. No deduplica.
 *
 * Porte de `omniroute: src/shared/utils/keyedMutex.ts` (MIT).
 */
import { describe, expect, test } from 'bun:test'

import { createKeyedMutex } from '../../src/concurrency/keyedMutex.ts'

const tick = () => new Promise(resolve => setTimeout(resolve, 5))

describe('a keyed mutex', () => {
  test('runs calls of one key one at a time, each with its own result', async () => {
    const mutex = createKeyedMutex<number>()
    const trace: string[] = []
    const call = (n: number) => mutex.run('k', async () => {
      trace.push(`start ${n}`)
      await tick()
      trace.push(`end ${n}`)
      return n
    })
    expect(await Promise.all([call(1), call(2)])).toEqual([1, 2])
    expect(trace).toEqual(['start 1', 'end 1', 'start 2', 'end 2'])
  })

  test('different keys do not wait for each other', async () => {
    const mutex = createKeyedMutex()
    const trace: string[] = []
    await Promise.all(['a', 'b'].map(key => mutex.run(key, async () => {
      trace.push(`start ${key}`)
      await tick()
      trace.push(`end ${key}`)
    })))
    expect(trace).toEqual(['start a', 'start b', 'end a', 'end b'])
  })

  test('a failure reaches its caller only, and the next call still runs', async () => {
    const mutex = createKeyedMutex<string>()
    const failed = mutex.run('k', async () => {
      throw new Error('boom')
    })
    const next = mutex.run('k', async () => 'ok')
    await expect(failed).rejects.toThrow('boom')
    expect(await next).toBe('ok')
  })

  test('the queue of a key is forgotten once it drains', async () => {
    const mutex = createKeyedMutex()
    await mutex.run('k', async () => 1)
    await tick()
    expect(mutex.pendingKeys()).toEqual([])
  })
})
