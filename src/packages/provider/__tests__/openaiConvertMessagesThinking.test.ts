/**
 * Porte del contrato de `ccnmt: packages/provider/src/openai/__tests__/convertMessages.test.ts`
 * (4 casos): el ida y vuelta del bloque de pensamiento hacia
 * `reasoning_content`.
 *
 * Es la segunda suite que la fuente dedica al MISMO modulo, y no es redundante
 * con la primera: aquella mide `content` y el orden; esta mide el campo
 * `reasoning_content`, que la primera no interroga ni una vez. `reasoning_content`
 * no es un campo del tipo de OpenAI — lo exigen proveedores compatibles
 * (DeepSeek, MoonshotAI) en el turno de asistente cuando el pensamiento esta
 * activo.
 */
import { describe, expect, test } from 'bun:test'
import { anthropicMessagesToOpenAI } from '../src/openai/convertMessages.js'

type ConReasoning = {
  role: string
  content: string | null
  reasoning_content?: string
  tool_calls?: Array<{ function: { name: string } }>
}

describe('convertMessages — ida y vuelta del bloque de pensamiento', () => {
  test('conserva reasoning_content del bloque de pensamiento en el asistente', () => {
    const messages = [
      { type: 'user' as const, uuid: 'u1', message: { role: 'user', content: 'hello' } },
      {
        type: 'assistant' as const,
        uuid: 'a1',
        message: {
          role: 'assistant',
          content: [
            { type: 'thinking', thinking: 'Let me think...', signature: 'sig123' },
            { type: 'text', text: 'Hi there!' },
          ],
        },
      },
    ]

    const openaiMessages = anthropicMessagesToOpenAI(messages as never, [] as never)
    const assistantMsg = openaiMessages.find(
      m => m.role === 'assistant',
    ) as ConReasoning

    expect(assistantMsg).toBeDefined()
    expect(assistantMsg.reasoning_content).toBe('Let me think...')
    expect(assistantMsg.content).toBe('Hi there!')
  })

  test('concatena varios bloques de pensamiento en un solo reasoning_content', () => {
    const messages = [
      {
        type: 'assistant' as const,
        uuid: 'a1',
        message: {
          role: 'assistant',
          content: [
            { type: 'thinking', thinking: 'Part A. ', signature: 'sig1' },
            { type: 'thinking', thinking: 'Part B.', signature: 'sig2' },
            { type: 'text', text: 'Answer' },
          ],
        },
      },
    ]

    const openaiMessages = anthropicMessagesToOpenAI(messages as never, [] as never)
    const assistantMsg = openaiMessages.find(
      m => m.role === 'assistant',
    ) as ConReasoning

    expect(assistantMsg.reasoning_content).toBe('Part A. Part B.')
  })

  test('NO agrega reasoning_content cuando no hay bloques de pensamiento', () => {
    const messages = [
      {
        type: 'assistant' as const,
        uuid: 'a1',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'No thinking here' }],
        },
      },
    ]

    const openaiMessages = anthropicMessagesToOpenAI(messages as never, [] as never)
    const assistantMsg = openaiMessages.find(
      m => m.role === 'assistant',
    ) as ConReasoning

    expect(assistantMsg.reasoning_content).toBeUndefined()
    expect(assistantMsg.content).toBe('No thinking here')
  })

  test('incluye reasoning_content junto a tool_calls', () => {
    const messages = [
      {
        type: 'assistant' as const,
        uuid: 'a1',
        message: {
          role: 'assistant',
          content: [
            { type: 'thinking', thinking: 'Need to use a tool.', signature: 'sig1' },
            { type: 'tool_use', id: 'tool_1', name: 'bash', input: { command: 'ls' } },
          ],
        },
      },
    ]

    const openaiMessages = anthropicMessagesToOpenAI(messages as never, [] as never)
    const assistantMsg = openaiMessages.find(
      m => m.role === 'assistant',
    ) as ConReasoning

    expect(assistantMsg.reasoning_content).toBe('Need to use a tool.')
    expect(assistantMsg.tool_calls).toHaveLength(1)
    expect(assistantMsg.tool_calls?.[0]?.function.name).toBe('bash')
  })
})
