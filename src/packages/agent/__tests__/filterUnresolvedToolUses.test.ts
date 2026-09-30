/**
 * `filterUnresolvedToolUses` de `messages.ts` opera sobre el `Message`
 * canónico de `messageShapes.ts`, no sobre el plano del bucle propio.
 *
 * MITAD ROJA, medida antes del cambio: `messages.ts` reexportaba la versión
 * de `loop/session/reconcile.ts`, tipada contra `loop/types.ts::Message`
 * (`{role, content}`), y sus consumidores —`conversationRecovery.tsx`,
 * `resumeAgent.ts`— le pasan mensajes canónicos (`{type, message}`): 8
 * diagnósticos del tsc raíz (paso 157 del lazo).
 *
 * CONTROL DE ANULACIÓN: quitar un `assistant` con CUALQUIER `tool_use` sin
 * resultado —en vez de sólo cuando todos lo están— hace caer el caso 3.
 */
import { describe, expect, test } from 'bun:test'
import { filterUnresolvedToolUses } from '../messages.ts'
import type { Message } from '../messageShapes.ts'

const assistant = (uuid: string, ...ids: string[]) => ({
  type: 'assistant', uuid, message: { role: 'assistant', content: ids.map((id) => ({ type: 'tool_use', id, name: 'Bash', input: {} })) },
}) as unknown as Message
const text = (uuid: string) => ({
  type: 'assistant', uuid, message: { role: 'assistant', content: [{ type: 'text', text: 'hola' }] },
}) as unknown as Message
const result = (uuid: string, id: string) => ({
  type: 'user', uuid, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: 'ok' }] },
}) as unknown as Message

const uuids = (messages: Message[]): string[] => messages.map((m) => String(m.uuid))

describe('filterUnresolvedToolUses — sobre el Message canónico', () => {
  test('1. un tool_use con su resultado se conserva', () => {
    expect(uuids(filterUnresolvedToolUses([assistant('a1', 'x'), result('u1', 'x')]))).toEqual(['a1', 'u1'])
  })

  test('2. un assistant cuyo único tool_use quedó sin resultado se retira', () => {
    expect(uuids(filterUnresolvedToolUses([text('t'), assistant('a2', 'y')]))).toEqual(['t'])
  })

  test('3. si al menos uno de sus tool_use tiene resultado, el mensaje se queda', () => {
    expect(uuids(filterUnresolvedToolUses([assistant('a3', 'x', 'y'), result('u1', 'x')]))).toEqual(['a3', 'u1'])
  })

  test('4. sin nada sin resolver devuelve la misma lista', () => {
    const messages = [text('t'), assistant('a1', 'x'), result('u1', 'x')]
    expect(filterUnresolvedToolUses(messages)).toBe(messages)
  })
})
