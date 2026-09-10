/**
 * Porte de `ccnmt: packages/agent/__tests__/messageHelpers.behavior.test.ts`.
 *
 * Fija los dos ayudantes de recorrido de mensajes. Ambos estan en camino
 * caliente —se llaman en cada render del REPL y en cada disparo de
 * compactacion— y ambos tienen sutilezas de implementacion que un refactor
 * facil rompe:
 *
 *  - `getLastAssistantMessage` usa `findLast`, no `filter().last`, para salir
 *    temprano por el final en historiales largos.
 *  - `hasToolCallsInLastAssistantTurn` recorre HACIA ATRAS y se detiene en el
 *    primer mensaje de asistente: solo cuenta el turno mas reciente, no
 *    «cualquier llamada a herramienta de la sesion».
 */
import { describe, expect, test } from 'bun:test'

import {
  getLastAssistantMessage,
  hasToolCallsInLastAssistantTurn,
} from '../messages.ts'

describe('ayudantes de recorrido de mensajes', () => {
  describe('getLastAssistantMessage', () => {
    test('arreglo vacio devuelve undefined', () => {
      expect(getLastAssistantMessage([])).toBeUndefined()
    })

    test('solo mensajes de usuario devuelve undefined', () => {
      const messages = [
        { type: 'user', message: { content: 'a' } } as any,
        { type: 'user', message: { content: 'b' } } as any,
      ]
      expect(getLastAssistantMessage(messages)).toBeUndefined()
    })

    test('devuelve el ULTIMO mensaje de asistente, no el primero', () => {
      const messages = [
        { type: 'assistant', message: { content: 'first', id: 'a1' } } as any,
        { type: 'user', message: { content: 'q' } } as any,
        { type: 'assistant', message: { content: 'second', id: 'a2' } } as any,
        { type: 'user', message: { content: 'q2' } } as any,
        { type: 'assistant', message: { content: 'third', id: 'a3' } } as any,
      ]
      const result = getLastAssistantMessage(messages)
      expect(result?.message.id).toBe('a3')
    })

    test('atraviesa bloques tool_use intercalados: cada turno es candidato', () => {
      const messages = [
        { type: 'assistant', message: { content: [{ type: 'text', text: 'hello' }], id: 'a1' } } as any,
        { type: 'progress', data: 'x' } as any,
        { type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1' }], id: 'a2' } } as any,
      ]
      expect(getLastAssistantMessage(messages)?.message.id).toBe('a2')
    })
  })

  describe('hasToolCallsInLastAssistantTurn', () => {
    test('vacio devuelve false', () => {
      expect(hasToolCallsInLastAssistantTurn([])).toBe(false)
    })

    test('solo mensajes de usuario devuelve false', () => {
      expect(
        hasToolCallsInLastAssistantTurn([
          { type: 'user', message: { content: 'q' } } as any,
        ]),
      ).toBe(false)
    })

    test('un mensaje de asistente CON bloque tool_use devuelve true', () => {
      const messages = [
        { type: 'user', message: { content: 'q' } } as any,
        {
          type: 'assistant',
          message: { content: [{ type: 'tool_use', id: 't1', name: 'Bash' }] },
        } as any,
      ]
      expect(hasToolCallsInLastAssistantTurn(messages)).toBe(true)
    })

    test('un mensaje de asistente SIN tool_use devuelve false', () => {
      const messages = [
        { type: 'user', message: { content: 'q' } } as any,
        {
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'just a response' }] },
        } as any,
      ]
      expect(hasToolCallsInLastAssistantTurn(messages)).toBe(false)
    })

    test('solo cuenta el ULTIMO turno, no las llamadas historicas', () => {
      // El turno anterior si llamo a una herramienta, pero el actual es solo
      // texto. La funcion debe devolver FALSE porque el ULTIMO turno de
      // asistente no llama a nada.
      const messages = [
        {
          type: 'assistant',
          message: { content: [{ type: 'tool_use', id: 't1', name: 'Bash' }] },
        } as any,
        { type: 'user', message: { content: 'q2' } } as any,
        {
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'no tools this time' }] },
        } as any,
      ]
      expect(hasToolCallsInLastAssistantTurn(messages)).toBe(false)
    })

    test('contenido en cadena, no en arreglo, devuelve false', () => {
      const messages = [
        { type: 'assistant', message: { content: 'hello' } } as any,
      ]
      expect(hasToolCallsInLastAssistantTurn(messages)).toBe(false)
    })
  })
})
