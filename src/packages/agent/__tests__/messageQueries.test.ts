/**
 * Porte de `ccnmt: packages/agent/__tests__/messageQueries.test.ts`.
 *
 * Fija el contrato de dos consultas puras sobre el historial de mensajes.
 *
 * `getLastAssistantMessage` se llama en cada render del REPL — usar
 * `findLast` en vez de `filter().at(-1)` importa a escala.
 *
 * `hasToolCallsInLastAssistantTurn` decide si el bucle continua (uso
 * automatico de herramienta) o se detiene. Una respuesta equivocada tiene
 * dos formas, ambas caras:
 *   - `true` en un turno sin herramienta → bucle infinito
 *   - `false` en un turno con herramienta → llamadas a herramienta
 *     perdidas en silencio
 *
 * Los dos simbolos ya estaban portados por un test anterior
 * (`isEmptyMessageText.test.ts` los trajo con `messages.ts`); este archivo
 * no agrega cobertura nueva al encabezado del modulo — solo fija su
 * contrato con el juego de casos propio de la fuente.
 */
import { describe, expect, test } from 'bun:test'
import type { UUID } from 'crypto'
import {
  getLastAssistantMessage,
  hasToolCallsInLastAssistantTurn,
} from '../messages.ts'
import type { Message } from '../messageShapes.ts'

function user(content: unknown): Message {
  return {
    type: 'user',
    uuid: '00000000-0000-0000-0000-000000000001' as UUID,
    message: { content: content as never },
  } as Message
}

function assistant(content: unknown): Message {
  return {
    type: 'assistant',
    uuid: '00000000-0000-0000-0000-000000000002' as UUID,
    message: { content: content as never },
  } as Message
}

describe('getLastAssistantMessage', () => {
  test('arreglo vacio → undefined', () => {
    expect(getLastAssistantMessage([])).toBeUndefined()
  })

  test('arreglo solo-usuario → undefined', () => {
    expect(getLastAssistantMessage([user('hi'), user('bye')])).toBeUndefined()
  })

  test('devuelve el ultimo asistente cuando hay varios', () => {
    const a1 = assistant('first')
    const a2 = assistant('second')
    const r = getLastAssistantMessage([a1, user('mid'), a2])
    expect(r).toBe(a2)
  })

  test('devuelve el asistente aunque no sea el ultimo mensaje', () => {
    const a = assistant('reply')
    expect(getLastAssistantMessage([a, user('then this')])).toBe(a)
  })

  test('omite tipos que no son asistente (system, attachment, progress)', () => {
    const a = assistant('reply')
    const messages = [
      a,
      { type: 'system', uuid: 's1' as UUID } as Message,
      { type: 'attachment', uuid: 'at1' as UUID } as Message,
    ]
    expect(getLastAssistantMessage(messages)).toBe(a)
  })

  test('devuelve el ultimo de asistentes consecutivos', () => {
    const a1 = assistant('1')
    const a2 = assistant('2')
    const a3 = assistant('3')
    expect(getLastAssistantMessage([a1, a2, a3])).toBe(a3)
  })
})

describe('hasToolCallsInLastAssistantTurn', () => {
  test('arreglo vacio → false', () => {
    expect(hasToolCallsInLastAssistantTurn([])).toBe(false)
  })

  test('sin asistentes → false', () => {
    expect(
      hasToolCallsInLastAssistantTurn([user('hi'), user('bye')]),
    ).toBe(false)
  })

  test('el ultimo asistente tiene un bloque tool_use → true', () => {
    expect(
      hasToolCallsInLastAssistantTurn([
        assistant([{ type: 'tool_use', id: 't1', name: 'X', input: {} }]),
      ]),
    ).toBe(true)
  })

  test('el ultimo asistente solo tiene texto → false', () => {
    expect(
      hasToolCallsInLastAssistantTurn([
        assistant([{ type: 'text', text: 'reply' }]),
      ]),
    ).toBe(false)
  })

  test('mezcla de texto y tool_use → true (tool_use dispara)', () => {
    expect(
      hasToolCallsInLastAssistantTurn([
        assistant([
          { type: 'text', text: 'thinking...' },
          { type: 'tool_use', id: 't1', name: 'X', input: {} },
        ]),
      ]),
    ).toBe(true)
  })

  test('solo revisa el ULTIMO asistente, no los anteriores', () => {
    const earlierWithTool = assistant([
      { type: 'tool_use', id: 't1', name: 'X', input: {} },
    ])
    const laterTextOnly = assistant([{ type: 'text', text: 'done' }])
    expect(
      hasToolCallsInLastAssistantTurn([earlierWithTool, laterTextOnly]),
    ).toBe(false)
  })

  test('omite mensajes de usuario intermedios y encuentra el ultimo asistente', () => {
    expect(
      hasToolCallsInLastAssistantTurn([
        assistant([{ type: 'tool_use', id: 't1', name: 'X', input: {} }]),
        user('mid'),
        user('mid2'),
      ]),
    ).toBe(true)
  })

  test('asistente con contenido de tipo cadena (no arreglo) → false', () => {
    // La funcion solo inspecciona contenido en arreglo. El contenido en
    // cadena no es una llamada a herramienta por definicion.
    expect(
      hasToolCallsInLastAssistantTurn([assistant('plain string')]),
    ).toBe(false)
  })

  test('arreglo de contenido vacio → false', () => {
    expect(hasToolCallsInLastAssistantTurn([assistant([])])).toBe(false)
  })

  test('varios asistentes consecutivos: decide el ultimo', () => {
    expect(
      hasToolCallsInLastAssistantTurn([
        assistant([{ type: 'tool_use', id: 't1', name: 'X', input: {} }]),
        assistant([{ type: 'text', text: 'final' }]),
      ]),
    ).toBe(false)
  })
})
