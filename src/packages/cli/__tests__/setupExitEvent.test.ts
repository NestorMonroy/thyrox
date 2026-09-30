/**
 * TASK-THYROX-0324 (B): el evento `tengu_exit` de `setup()` no se decide por
 * `NODE_ENV`. El ejecutable 2.1.283 (`Ho`, chunk-65294ky5) pasa de la
 * verificación de root/sudo directo a leer `Ps()` y registrar el evento; la
 * rama `NODE_ENV === 'test'` que lo saltaba no existe allí.
 */
import { expect, test } from 'bun:test'
import { logPreviousSessionExit } from '../src/setup/setup.ts'

test('registra tengu_exit cuando el proyecto trae lastCost y lastDuration, aun bajo NODE_ENV=test', () => {
  expect(process.env.NODE_ENV).toBe('test')
  const events: Array<[string, Record<string, unknown>]> = []
  logPreviousSessionExit(
    { lastCost: 1.5, lastDuration: 42, lastSessionId: 's1' } as never,
    (name, meta) => {
      events.push([name, meta as Record<string, unknown>])
    },
  )
  expect(events).toHaveLength(1)
  expect(events[0]![0]).toBe('tengu_exit')
  expect(events[0]![1]!.last_session_cost).toBe(1.5)
  expect(events[0]![1]!.last_session_id).toBe('s1')
})

test('no registra nada sin lastCost o sin lastDuration', () => {
  const events: string[] = []
  const log = (name: string) => {
    events.push(name)
  }
  logPreviousSessionExit({ lastDuration: 1 } as never, log as never)
  logPreviousSessionExit({ lastCost: 1 } as never, log as never)
  expect(events).toEqual([])
})
