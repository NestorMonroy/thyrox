/**
 * Porte de `ccnmt: packages/agent/__tests__/fromAgentEvent.test.ts`.
 * Los casos, sus datos y sus aserciones vienen de la fuente; lo que cambia es
 * el idioma de la descripción.
 *
 * Tests de fromAgentEvent + toCoreMessages + fromCoreMessages — los
 * helpers puros de `createDeps.ts` que adaptan las formas de evento/mensaje
 * del runtime del agente a la superficie del SDK.
 *
 * fromAgentEvent es el proyector de eventos del SDK: cada evento del agente
 * llega etiquetado con `type` y, o bien se proyecta a una forma que los
 * consumidores del SDK entienden, o devuelve `undefined` (descarta el
 * evento).
 *
 * Un despacho equivocado = el consumidor del SDK (TypeScript SDK, extensión
 * de vscode) ve eventos malformados o pierde actualizaciones de mensaje →
 * UX rota.
 */
import { describe, expect, test } from 'bun:test'
import {
  fromAgentEvent,
  fromCoreMessages,
  toCoreMessages,
} from '../createDeps.js'
import { toCoreMessage } from '../messageAdapters.ts'

describe('fromAgentEvent — eventos message', () => {
  // El core emite su mensaje en forma plana (`CoreMessage`); el proyector lo
  // devuelve al modelo anidado del bucle con `fromCoreMessage`. Antes se
  // descartaba todo lo que no llevara `message` anidado — y con eso cualquier
  // mensaje que el core creara en su propia forma.

  test('un mensaje que entro al core vuelve como el MISMO objeto del bucle', () => {
    const agent = { type: 'assistant', uuid: 'a-1', message: { role: 'assistant', content: [] } }
    const r = fromAgentEvent({ type: 'message', message: toCoreMessage(agent) })
    expect(r).toBe(agent)
  })

  test('un mensaje creado por el core en forma plana se entrega anidado, no se descarta', () => {
    const r = fromAgentEvent({
      type: 'message',
      message: { type: 'assistant', uuid: 'c-1', role: 'assistant', content: [{ type: 'text', text: 'x' }] },
    }) as { type: string; message: { content: unknown } }
    expect(r.type).toBe('assistant')
    expect(r.message.content).toEqual([{ type: 'text', text: 'x' }])
  })

  test('evento message sin campo message → undefined', () => {
    expect(fromAgentEvent({ type: 'message' })).toBeUndefined()
  })

  test('evento message con message nulo → undefined', () => {
    expect(fromAgentEvent({ type: 'message', message: null })).toBeUndefined()
  })

  test('un objeto de un tipo que el core no emite → undefined', () => {
    expect(fromAgentEvent({ type: 'message', message: { type: 'noinner' } })).toBeUndefined()
  })

  test('evento message con message primitivo (string) → undefined', () => {
    expect(
      fromAgentEvent({ type: 'message', message: 'string' as never }),
    ).toBeUndefined()
  })
})

describe('fromAgentEvent — eventos stream', () => {
  test('evento stream devuelve el evento interior verbatim', () => {
    const innerEvent = { type: 'content_block_start', index: 0 }
    const r = fromAgentEvent({ type: 'stream', event: innerEvent })
    expect(r).toBe(innerEvent)
  })

  test('evento stream con event indefinido → undefined', () => {
    expect(fromAgentEvent({ type: 'stream' })).toBeUndefined()
  })
})

describe('fromAgentEvent — eventos request_start', () => {
  test('devuelve el marcador sintético stream_request_start', () => {
    expect(fromAgentEvent({ type: 'request_start' })).toEqual({
      type: 'stream_request_start',
    })
  })

  test('campos extra en el input se ignoran — la salida es sólo el marcador', () => {
    // Contrato documentado: request_start sintetiza un marcador de forma
    // fija; cualquier campo extra que pase el llamador se descarta.
    const r = fromAgentEvent({
      type: 'request_start',
      requestId: 'abc',
      extra: 'data',
    })
    expect(r).toEqual({ type: 'stream_request_start' })
  })
})

describe('fromAgentEvent — evento done', () => {
  test('evento done → undefined (descarta, señala fin del stream)', () => {
    expect(fromAgentEvent({ type: 'done' })).toBeUndefined()
  })

  test('evento done con campos extra → sigue siendo undefined', () => {
    expect(
      fromAgentEvent({ type: 'done', usage: { input_tokens: 100 } }),
    ).toBeUndefined()
  })
})

describe('fromAgentEvent — tipos de evento desconocidos', () => {
  test('tipo desconocido → undefined (la rama default descarta)', () => {
    expect(fromAgentEvent({ type: 'unknown_type' })).toBeUndefined()
  })

  test('type vacío → undefined', () => {
    expect(fromAgentEvent({ type: '' })).toBeUndefined()
  })

  test('mal tipeado (p.ej. "Message" capitalizado) → undefined', () => {
    // El switch distingue mayúsculas/minúsculas.
    expect(
      fromAgentEvent({
        type: 'Message',
        message: { type: 'x', message: {} },
      } as never),
    ).toBeUndefined()
  })
})

describe('fromAgentEvent — invariantes de la forma de retorno', () => {
  test('devuelve objeto o undefined (nunca null ni lanza)', () => {
    const samples = [
      { type: 'message' },
      { type: 'message', message: null },
      { type: 'stream' },
      { type: 'request_start' },
      { type: 'done' },
      { type: 'random' },
    ]
    for (const s of samples) {
      const r = fromAgentEvent(s)
      expect(r === undefined || (typeof r === 'object' && r !== null)).toBe(true)
    }
  })
})

// ──────────────────────────────────────────────────────────────────
// toCoreMessages / fromCoreMessages — adaptadores reales.
//
// Ya no son identidad: convierten entre la forma anidada del bucle y la plana
// del core (`messageAdapters.ts`, cubiertos en detalle en
// `messageAdapters.test.ts`). Lo que este archivo fija es la parte de su
// contrato que el proyector usa: el viaje de ida y vuelta conserva cada
// objeto y su orden.
// ──────────────────────────────────────────────────────────────────

describe('toCoreMessages / fromCoreMessages — viaje de ida y vuelta', () => {
  test('arreglo vacio → arreglo vacio', () => {
    expect(fromCoreMessages(toCoreMessages([]))).toEqual([])
  })

  test('cada mensaje vuelve como el mismo objeto, en su orden', () => {
    const a = { type: 'user', uuid: 'u-1', message: { role: 'user', content: 'hi' } }
    const b = { type: 'assistant', uuid: 'a-1', message: { role: 'assistant', content: [] } }
    const back = fromCoreMessages(toCoreMessages([a, b]))
    expect(back[0]).toBe(a)
    expect(back[1]).toBe(b)
  })

  test('la ida entrega la forma plana, sin `message`', () => {
    const [core] = toCoreMessages([{ type: 'user', uuid: 'u-1', message: { role: 'user', content: 'hi' } }])
    expect(core).toMatchObject({ type: 'user', role: 'user', content: 'hi' })
    expect('message' in core!).toBe(false)
  })
})

describe('to/fromCoreMessages — ida y vuelta', () => {
  test('to + from devuelve cada objeto para cualquier input, aun de tipos que el core no modela', () => {
    // Antes afirmaba identidad del ARREGLO (`toBe(original)`); los adaptadores
    // ya no son identidad, asi que lo que se conserva es cada elemento.
    const original = [
      { type: 'a', extra: 1 },
      { type: 'b', nested: { x: 'y' } },
    ] as never[]
    const back = fromCoreMessages(toCoreMessages(original))
    expect(back).toHaveLength(2)
    expect(back[0]).toBe(original[0])
    expect(back[1]).toBe(original[1])
  })
})
