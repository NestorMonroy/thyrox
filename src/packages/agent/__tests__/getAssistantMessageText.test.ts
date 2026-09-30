/**
 * `getAssistantMessageText` ≙ `qO` de 2.1.275 (`chunk-q2gh92k2.js`).
 */
import { describe, expect, test } from 'bun:test'
import { getAssistantMessageText } from '../messages.js'

const assistant = (content: unknown) => ({ type: 'assistant', uuid: 'u', message: { content } }) as never

describe('getAssistantMessageText (qO)', () => {
  test('une los bloques de texto con salto de línea y recorta', () => {
    expect(getAssistantMessageText(assistant([{ type: 'text', text: ' uno' }, { type: 'tool_use' }, { type: 'text', text: 'dos ' }]))).toBe('uno\ndos')
  })
  test('sin texto, null', () => {
    expect(getAssistantMessageText(assistant([{ type: 'tool_use' }]))).toBeNull()
    expect(getAssistantMessageText(assistant([{ type: 'text', text: '   ' }]))).toBeNull()
  })
  test('un contenido que no es arreglo, null', () => {
    expect(getAssistantMessageText(assistant('texto plano'))).toBeNull()
  })
  test('un mensaje que no es del asistente, null', () => {
    expect(getAssistantMessageText({ type: 'user', uuid: 'u', message: { content: [{ type: 'text', text: 'x' }] } } as never)).toBeNull()
  })
})
