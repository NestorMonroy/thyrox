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

describe('fromAgentEvent — eventos message', () => {
  test('evento message con campo message anidado devuelve el interior', () => {
    // Documentado: los eventos message llevan { type: 'message', message: { ... } }
    // y el mensaje interior tiene su propio campo `message` (forma Anthropic).
    // El proyector desenvuelve una sola vez.
    const inner = { type: 'assistant', message: { role: 'assistant', content: [] } }
    const r = fromAgentEvent({ type: 'message', message: inner })
    expect(r).toBe(inner)
  })

  test('evento message sin campo message → undefined', () => {
    expect(fromAgentEvent({ type: 'message' })).toBeUndefined()
  })

  test('evento message con message nulo → undefined', () => {
    expect(fromAgentEvent({ type: 'message', message: null })).toBeUndefined()
  })

  test('evento message donde message carece de .message anidado → undefined', () => {
    // Contrato documentado: el chequeo interior exige `'message' in msg`,
    // es decir, el objeto interior debe tener él mismo un campo .message.
    // Si no lo tiene (payload crudo, sólo la etiqueta type), se descarta.
    expect(
      fromAgentEvent({ type: 'message', message: { type: 'noinner' } }),
    ).toBeUndefined()
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
// toCoreMessages / fromCoreMessages — marcadores de frontera de identidad.
//
// V7 §11 separa el tipo AgentMessage del runtime del agente del tipo
// CoreMessage de cara al SDK. Son estructuralmente idénticos ahora mismo (el
// cast es un no-op), pero los conversores explícitos hacen la frontera
// greppeable y permiten que refactors futuros evolucionen las formas de
// manera independiente sin reescribir cada call site.
// ──────────────────────────────────────────────────────────────────

describe('toCoreMessages — frontera de identidad', () => {
  test('arreglo vacío → arreglo vacío (misma referencia)', () => {
    const messages: never[] = []
    expect(toCoreMessages(messages)).toBe(messages as never[])
  })

  test('los mensajes pasan sin cambios (igualdad de referencia)', () => {
    const messages = [
      { type: 'user', message: { role: 'user', content: 'hi' } },
      { type: 'assistant', message: { role: 'assistant', content: [] } },
    ] as never[]
    expect(toCoreMessages(messages)).toBe(messages)
  })

  test('el contenido del arreglo se preserva verbatim', () => {
    const a = { type: 'a' }
    const b = { type: 'b' }
    const r = toCoreMessages([a, b] as never[])
    expect(r[0]).toBe(a)
    expect(r[1]).toBe(b)
  })
})

describe('fromCoreMessages — frontera de identidad', () => {
  test('arreglo vacío → arreglo vacío', () => {
    const messages: never[] = []
    expect(fromCoreMessages(messages)).toBe(messages as never[])
  })

  test('los mensajes pasan sin cambios', () => {
    const messages = [
      { type: 'user', message: { role: 'user', content: 'hi' } },
    ] as never[]
    expect(fromCoreMessages(messages)).toBe(messages)
  })
})

describe('to/fromCoreMessages — ida y vuelta', () => {
  test('to + from = identidad para cualquier input', () => {
    const original = [
      { type: 'a', extra: 1 },
      { type: 'b', nested: { x: 'y' } },
    ] as never[]
    expect(fromCoreMessages(toCoreMessages(original))).toBe(original)
  })
})
