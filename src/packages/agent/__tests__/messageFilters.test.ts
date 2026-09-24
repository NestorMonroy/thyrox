/**
 * Filtros de reanudación de 2.1.275 (`chunk-q2gh92k2.js`): `blr` (asistente
 * sólo con thinking y sin hermano con contenido), `_lr` (asistente sólo con
 * texto vacío, fusionando luego usuarios contiguos) y `Oi` (desde el último
 * `compact_boundary`, inclusive).
 */
import { describe, expect, test } from 'bun:test'
import {
  filterOrphanedThinkingOnlyMessages,
  filterWhitespaceOnlyAssistantMessages,
  getMessagesAfterCompactBoundary,
} from '../messages.ts'

const asst = (uuid: string, id: string, content: unknown[]) => ({ type: 'assistant', uuid, message: { id, content } }) as never
const usr = (uuid: string, content: unknown) => ({ type: 'user', uuid, message: { content } }) as never
const thinking = { type: 'thinking', thinking: 'x', signature: 's' }
const uuids = (m: Array<{ uuid: string }>) => m.map(x => x.uuid)

describe('filterOrphanedThinkingOnlyMessages (blr)', () => {
  test('quita el mensaje sólo-thinking sin hermano con contenido', () => {
    const msgs = [usr('u1', 'hola'), asst('a1', 'm1', [thinking]), usr('u2', 'sigue'), asst('a2', 'm2', [{ type: 'text', text: 'ok' }])]
    expect(uuids(filterOrphanedThinkingOnlyMessages(msgs) as never)).toEqual(['u1', 'u2', 'a2'])
  })
  test('lo conserva si otro fragmento del mismo message.id trae contenido', () => {
    const msgs = [asst('a1', 'm1', [thinking]), asst('a2', 'm1', [{ type: 'text', text: 'ok' }])]
    expect(filterOrphanedThinkingOnlyMessages(msgs)).toBe(msgs)
  })
  test('con preserveTrailing conserva el último', () => {
    const msgs = [usr('u1', 'hola'), asst('a1', 'm1', [thinking])]
    expect(uuids(filterOrphanedThinkingOnlyMessages(msgs) as never)).toEqual(['u1'])
    expect(filterOrphanedThinkingOnlyMessages(msgs, true)).toBe(msgs)
  })
})

describe('filterWhitespaceOnlyAssistantMessages (_lr)', () => {
  test('sin nada que quitar devuelve la misma lista', () => {
    const msgs = [usr('u1', 'a'), asst('a1', 'm1', [{ type: 'text', text: 'ok' }])]
    expect(filterWhitespaceOnlyAssistantMessages(msgs)).toBe(msgs)
  })
  test('quita el asistente de texto vacío o (no content) y fusiona los usuarios que quedan juntos', () => {
    const msgs = [
      usr('u1', 'primero'),
      asst('a1', 'm1', [thinking, { type: 'text', text: '  ' }, { type: 'text', text: '(no content)' }]),
      usr('u2', [{ type: 'text', text: 'segundo' }, { type: 'tool_result', tool_use_id: 't', content: 'r' }]),
    ]
    const out = filterWhitespaceOnlyAssistantMessages(msgs) as Array<{ uuid: string; message: { content: Array<{ type: string; text?: string }> } }>
    expect(uuids(out)).toEqual(['u1'])
    expect(out[0]!.message.content.map(b => b.type)).toEqual(['tool_result', 'text', 'text'])
    expect(out[0]!.message.content[1]!.text).toBe('primero\n')
  })
  test('un fragmento vacío se conserva si su message.id trae contenido en otro', () => {
    const msgs = [asst('a1', 'm1', [{ type: 'text', text: ' ' }]), asst('a2', 'm1', [{ type: 'tool_use', id: 't', name: 'Read', input: {} }])]
    expect(filterWhitespaceOnlyAssistantMessages(msgs)).toEqual(msgs)
  })
  test('un mensaje sólo-thinking no es de espacios', () => {
    const msgs = [asst('a1', 'm1', [thinking])]
    expect(filterWhitespaceOnlyAssistantMessages(msgs)).toBe(msgs)
  })
  test('sin fusionar si se pide', () => {
    const msgs = [usr('u1', 'a'), asst('a1', 'm1', [{ type: 'text', text: '' }]), usr('u2', 'b')]
    expect(uuids(filterWhitespaceOnlyAssistantMessages(msgs, { mergeAdjacentUsers: false }) as never)).toEqual(['u1', 'u2'])
  })
})

describe('getMessagesAfterCompactBoundary (Oi)', () => {
  test('desde el último límite, inclusive; sin límite, todo', () => {
    const b1 = { type: 'system', subtype: 'compact_boundary', uuid: 'b1' }
    const b2 = { type: 'system', subtype: 'compact_boundary', uuid: 'b2' }
    const msgs = [usr('u1', 'a'), b1, usr('u2', 'b'), b2, usr('u3', 'c')] as never[]
    expect(uuids(getMessagesAfterCompactBoundary(msgs) as never)).toEqual(['b2', 'u3'])
    const plain = [usr('u1', 'a')]
    expect(getMessagesAfterCompactBoundary(plain)).toBe(plain)
  })
})
