// Contrato de la estimacion por mensaje del binario 2.1.275
// (`chunk-q2gh92k2.js` `Vm`/`dAo`, `chunk-8f0aeskw.js` `ige`/`R`/`xu`).
import { describe, expect, test } from 'bun:test'
import {
  roughTokenCountEstimation,
  roughTokenCountEstimationForBlock,
  roughTokenCountEstimationForContent,
  roughTokenCountEstimationForMessage,
  roughTokenCountEstimationForMessages,
} from '../tokenEstimation.js'

describe('xu: la estimacion base', () => {
  test('longitud entre bytes por token, redondeada', () => {
    expect(roughTokenCountEstimation('abcdefgh')).toBe(2)
    expect(roughTokenCountEstimation('abcdefgh', 2)).toBe(4)
  })
  test('lo que no es cadena cuenta 0', () => {
    expect(roughTokenCountEstimation(undefined as unknown as string)).toBe(0)
  })
  test('sin ajuste CJK: el binario divide la longitud igual', () => {
    expect(roughTokenCountEstimation('中文中文中文中文')).toBe(2)
  })
})

describe('R: por bloque', () => {
  test('texto, pensamiento y pensamiento redactado cuentan su cadena', () => {
    expect(roughTokenCountEstimationForBlock({ type: 'text', text: 'abcd' })).toBe(1)
    expect(roughTokenCountEstimationForBlock({ type: 'thinking', thinking: 'abcdabcd' })).toBe(2)
    expect(roughTokenCountEstimationForBlock({ type: 'redacted_thinking', data: 'abcd' })).toBe(1)
  })
  test('imagen y documento cuentan 2000 fijos', () => {
    expect(roughTokenCountEstimationForBlock({ type: 'image' })).toBe(2000)
    expect(roughTokenCountEstimationForBlock({ type: 'document' })).toBe(2000)
  })
  test('tool_use cuenta nombre mas entrada serializada', () => {
    const block = { type: 'tool_use', name: 'Bash', input: { command: 'ls' } }
    expect(roughTokenCountEstimationForBlock(block)).toBe(
      Math.round(('Bash' + JSON.stringify({ command: 'ls' })).length / 4),
    )
  })
  test('tool_result cuenta su contenido anidado', () => {
    const block = { type: 'tool_result', content: [{ type: 'text', text: 'abcdabcd' }] }
    expect(roughTokenCountEstimationForBlock(block)).toBe(2)
  })
  test('un bloque desconocido cuenta su serializacion', () => {
    const block = { type: 'otro', x: 1 }
    expect(roughTokenCountEstimationForBlock(block)).toBe(
      Math.round(JSON.stringify(block).length / 4),
    )
  })
})

describe('ige y Vm: contenido y mensajes', () => {
  test('contenido vacio cuenta 0; una cadena cuenta como texto', () => {
    expect(roughTokenCountEstimationForContent(undefined)).toBe(0)
    expect(roughTokenCountEstimationForContent('abcd')).toBe(1)
  })
  test('asistente, usuario y api_system cuentan su contenido; el resto 0', () => {
    const user = { type: 'user', message: { content: 'abcdabcd' } }
    const progress = { type: 'progress', message: { content: 'abcdabcd' } }
    expect(roughTokenCountEstimationForMessage(user)).toBe(2)
    expect(roughTokenCountEstimationForMessage(progress)).toBe(0)
  })
  test('un adjunto cuenta lo que su normalizacion produce', () => {
    const attachment = { type: 'attachment', attachment: { kind: 'x' } }
    const normalize = () => [{ message: { content: 'abcdabcdabcd' } }]
    expect(roughTokenCountEstimationForMessage(attachment, 4, normalize)).toBe(3)
  })
  test('la suma de mensajes es la suma de cada uno', () => {
    const msgs = [
      { type: 'user', message: { content: 'abcd' } },
      { type: 'assistant', message: { content: [{ type: 'text', text: 'abcdabcd' }] } },
    ]
    expect(roughTokenCountEstimationForMessages(msgs)).toBe(3)
  })
})
