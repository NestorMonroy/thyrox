/**
 * El paso `session.receive` de un mensaje entrante: `Aot`, `NXe`, `R_e`,
 * `WCt`, `jCt`, `Q0n`, `BXe`, `HXe`, `jXe`, `FXe`, `$Xe` (`chunk-csayct82.js`)
 * y `Me` (`chunk-0sxn6jc6.js`) de 2.1.283.
 */
import { describe, expect, test } from 'bun:test'

import {
  CONSUMED_WITHOUT_REASON,
  HooksError,
  NOT_QUEUED_REASON,
  receiveText,
  runSessionReceive,
  type HookSite,
  type ReceiveEvent,
} from '../src/uds/sessionReceive.ts'

const ENVELOPE = '<cross-session-message from="uds:/a.sock" hop-chain="' + 'a'.repeat(24) + '">\nhola\n</cross-session-message>'
const STRIPPED = '<cross-session-message from="uds:/a.sock">\nhola\n</cross-session-message>'

type Handler = (event: ReceiveEvent, next: (event: ReceiveEvent) => Promise<unknown>) => Promise<unknown>

function site(handlers: Handler[], names: string[] = ['mod-a']): HookSite & { calls: ReceiveEvent[] } {
  const calls: ReceiveEvent[] = []
  return {
    calls,
    hasHandlers: () => handlers.length > 0,
    hookedBy: () => names,
    call: (_name, core) => async event => {
      calls.push(event)
      const run = (index: number, current: ReceiveEvent): Promise<unknown> =>
        index === handlers.length ? core.run(current) : handlers[index]!(current, next => run(index + 1, next))
      return run(0, event)
    },
  }
}

describe('receiveText (NXe/R_e)', () => {
  test('de un par se quita la cadena de saltos; los bloques de texto se unen con salto', () => {
    expect(receiveText({ kind: 'peer' }, ENVELOPE)).toBe(STRIPPED)
    expect(receiveText({ kind: 'human' }, ENVELOPE)).toBe(ENVELOPE)
    expect(receiveText({ kind: 'peer' }, [{ type: 'text', text: ENVELOPE }, { type: 'image' }, { type: 'text', text: 'b' }])).toBe(`${STRIPPED}\nb`)
  })
})

describe('runSessionReceive (Aot)', () => {
  test('sin módulos que escuchen, el contenido pasa tal cual y la reserva no hace nada', async () => {
    const idle = site([])
    const result = await runSessionReceive({ origin: { kind: 'peer' }, content: 'hola' }, idle, () => {})
    expect(result).toMatchObject({ content: 'hola' })
    expect(idle.calls).toEqual([])
    if (result.consumed === undefined) {
      result.queueing.queued()
      result.queueing[Symbol.dispose]()
    }
  })

  test('si la entrega llega al fondo sin cambios, el contenido original sigue; queued resuelve la cadena', async () => {
    let answer: unknown
    const hooks = site([async (event, next) => (answer = await next(event))])
    const result = await runSessionReceive({ origin: { kind: 'peer' }, content: ENVELOPE, agentId: 'a1' }, hooks, () => {})
    expect(hooks.calls[0]).toEqual({ origin: { kind: 'peer' }, text: STRIPPED, agentId: 'a1' })
    if (result.consumed !== undefined) throw new Error('consumido')
    expect(result.content).toBe(ENVELOPE)
    result.queueing.queued()
    result.queueing[Symbol.dispose]()
    await Bun.sleep(0)
    expect(answer).toEqual({ text: STRIPPED })
  })

  test('un hook que reescribe el texto lo entrega reescrito; con bloques, el texto nuevo y los no textuales', async () => {
    const hooks = site([async (event, next) => next({ ...event, text: 'nuevo' })])
    const plain = await runSessionReceive({ origin: { kind: 'peer' }, content: 'hola' }, hooks, () => {})
    expect(plain.consumed === undefined && plain.content).toBe('nuevo')
    const blocks = await runSessionReceive({ origin: { kind: 'peer' }, content: [{ type: 'text', text: 'hola' }, { type: 'image', data: 'x' }] }, hooks, () => {})
    expect(blocks.consumed === undefined && blocks.content).toEqual([{ type: 'text', text: 'nuevo' }, { type: 'image', data: 'x' }])
  })

  test('un hook que contesta sin pasar la entrega la consume, con su razón o la de omisión, y se registra', async () => {
    const logs: string[] = []
    const withReason = await runSessionReceive({ origin: { kind: 'peer' }, content: 'hola' }, site([async () => ({ consumed: 'filtrado' })], ['mod-a', 'mod-b']), message => void logs.push(message))
    expect(withReason).toEqual({ consumed: 'filtrado' })
    expect(logs).toEqual(['session.receive (peer): consumed by a hook (filtrado; hooked by mod-a+mod-b); not queued'])
    const withoutReason = await runSessionReceive({ origin: { kind: 'peer' }, content: 'hola' }, site([async () => ({})]), () => {})
    expect(withoutReason).toEqual({ consumed: CONSUMED_WITHOUT_REASON })
  })

  test('una entrega que llega al núcleo después de consumida recibe el error de no encolado', async () => {
    let late: Promise<unknown> | undefined
    const hooks = site([
      async (event, next) => {
        setTimeout(() => {
          late = next(event)
        }, 0)
        return { consumed: 'antes' }
      },
    ])
    const result = await runSessionReceive({ origin: { kind: 'peer' }, content: 'hola' }, hooks, () => {})
    expect(result).toEqual({ consumed: 'antes' })
    await Bun.sleep(5)
    const outcome = await Promise.race([late!.then(() => 'resuelta', error => (error as Error).message), Bun.sleep(50).then(() => 'pendiente')])
    expect(outcome).toBe(NOT_QUEUED_REASON)
  })

  test('soltar la reserva sin encolar rechaza la cadena con HooksError y el motivo de no encolado', async () => {
    let failure: unknown
    const hooks = site([
      async (event, next) => {
        try {
          return await next(event)
        } catch (error) {
          failure = error
          return undefined
        }
      },
    ])
    const result = await runSessionReceive({ origin: { kind: 'peer' }, content: 'hola' }, hooks, () => {})
    if (result.consumed !== undefined) throw new Error('consumido')
    result.queueing[Symbol.dispose]()
    await Bun.sleep(0)
    expect(failure).toBeInstanceOf(HooksError)
    expect((failure as Error).message).toBe(NOT_QUEUED_REASON)
    expect((failure as HooksError).name).toBe('HooksError')
  })

  test('queued tras soltar, o soltar tras queued, no cambian el primer desenlace', async () => {
    let answer: unknown
    const hooks = site([async (event, next) => (answer = await next(event).catch(error => `error:${(error as Error).message}`))])
    const result = await runSessionReceive({ origin: { kind: 'peer' }, content: 'hola' }, hooks, () => {})
    if (result.consumed !== undefined) throw new Error('consumido')
    result.queueing.queued()
    result.queueing[Symbol.dispose]()
    result.queueing.queued()
    await Bun.sleep(0)
    expect(answer).toEqual({ text: 'hola' })
  })
})
