/**
 * `responseMessagesToOpenAI.ts` — porte de
 * `omniroute: open-sse/translator/response/claude-to-openai.ts` (la
 * máquina de estados de eventos SSE).
 *
 * Casos con la misma forma que
 * `omniroute: tests/unit/translator-resp-claude-to-openai.test.ts` (el
 * camino no-stream, aquí vía `messagesApiMessageToOpenAIResponse`) y
 * `claude-to-openai-think-close-5123.test.ts` (el bloque `thinking` →
 * `reasoning_content`, sin el marcador `</think>` diferido, declarado
 * pendiente en el módulo).
 */
import { describe, expect, test } from 'bun:test'
import {
  messagesToOpenAIResponse,
  messagesApiMessageToOpenAIResponse,
  createMessagesToOpenAIState,
} from '../src/proxy/translators/responseMessagesToOpenAI.js'

function collectChunks(results: (any[] | null)[]): any[] {
  return results.flatMap((r) => (Array.isArray(r) ? r : r ? [r] : []))
}

describe('messagesApiMessageToOpenAIResponse — no-stream', () => {
  test('texto, thinking y tool_use se convierten en un mensaje de asistente OpenAI', () => {
    const result = messagesApiMessageToOpenAIResponse(
      {
        id: 'msg_123',
        model: 'claude-3-7-sonnet',
        content: [
          { type: 'thinking', thinking: 'Plan first.' },
          { type: 'text', text: 'Final answer' },
          { type: 'tool_use', id: 'tool_1', name: 'proxy_read_file', input: { path: '/tmp/a' } },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 10, output_tokens: 4 },
      },
      new Map([['proxy_read_file', 'read_file']])
    ) as any

    expect(result.id).toBe('chatcmpl-msg_123')
    expect(result.model).toBe('claude-3-7-sonnet')
    expect(result.choices[0].message.content).toBe('Final answer')
    expect(result.choices[0].message.reasoning_content).toBe('Plan first.')
    expect(result.choices[0].message.tool_calls[0].id).toBe('tool_1')
    expect(result.choices[0].message.tool_calls[0].function.name).toBe('read_file')
    expect(result.choices[0].message.tool_calls[0].function.arguments).toBe(JSON.stringify({ path: '/tmp/a' }))
    expect(result.choices[0].finish_reason).toBe('tool_calls')
    expect(result.usage).toEqual({ prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 })
  })

  test('end_turn se convierte en "stop" y un texto vacío se conserva', () => {
    const result = messagesApiMessageToOpenAIResponse({
      id: 'msg_empty',
      model: 'claude-3-5-haiku',
      content: [{ type: 'text', text: '' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 2, output_tokens: 1 },
    }) as any
    expect(result.choices[0].message.content).toBe('')
    expect(result.choices[0].finish_reason).toBe('stop')
    expect(result.model).toBe('claude-3-5-haiku')
  })
})

describe('eventos SSE — stop_reason ⇄ finish_reason', () => {
  test('max_tokens se traduce a "length" y stop_sequence a "stop"', () => {
    const s1 = createMessagesToOpenAIState()
    messagesToOpenAIResponse({ type: 'message_start', message: { id: 'm1', model: 'x' } }, s1)
    const chunks1 = collectChunks([
      messagesToOpenAIResponse({ type: 'message_delta', delta: { stop_reason: 'max_tokens' } }, s1),
    ])
    expect(chunks1[0].choices[0].finish_reason).toBe('length')

    const s2 = createMessagesToOpenAIState()
    messagesToOpenAIResponse({ type: 'message_start', message: { id: 'm2', model: 'x' } }, s2)
    const chunks2 = collectChunks([
      messagesToOpenAIResponse({ type: 'message_delta', delta: { stop_reason: 'stop_sequence' } }, s2),
    ])
    expect(chunks2[0].choices[0].finish_reason).toBe('stop')
  })
})

describe('#5123 — bloque thinking seguido de tool_use', () => {
  test('thinking_delta se emite como reasoning_content, sin filtrarse a content', () => {
    const state = createMessagesToOpenAIState()
    const all = collectChunks([
      messagesToOpenAIResponse({ type: 'message_start', message: { id: 'msg_1', model: 'claude-3-7-sonnet' } }, state),
      messagesToOpenAIResponse({ type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } }, state),
      messagesToOpenAIResponse(
        { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'Let me think...' } },
        state
      ),
      messagesToOpenAIResponse({ type: 'content_block_stop', index: 0 }, state),
      messagesToOpenAIResponse({ type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'tu_1', name: 'ls' } }, state),
      messagesToOpenAIResponse({ type: 'content_block_stop', index: 1 }, state),
      messagesToOpenAIResponse({ type: 'message_delta', delta: { stop_reason: 'tool_use' } }, state),
      messagesToOpenAIResponse({ type: 'message_stop' }, state),
    ])

    const anyContentChunk = all.find((c) => typeof c.choices?.[0]?.delta?.content === 'string')
    expect(anyContentChunk).toBeUndefined()
    const reasoningChunk = all.find((c) => c.choices?.[0]?.delta?.reasoning_content === 'Let me think...')
    expect(reasoningChunk).toBeTruthy()
    const finish = all.find((c) => c.choices?.[0]?.finish_reason)
    expect(finish.choices[0].finish_reason).toBe('tool_calls')
  })
})

describe('tool_use ⇄ tool_calls en streaming', () => {
  test('input_json_delta se acumula en el argumento del tool_call', () => {
    const state = createMessagesToOpenAIState()
    messagesToOpenAIResponse({ type: 'message_start', message: { id: 'm', model: 'x' } }, state)
    messagesToOpenAIResponse({ type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'tu_1', name: 'search' } }, state)
    messagesToOpenAIResponse({ type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"q":' } }, state)
    messagesToOpenAIResponse({ type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '"x"}' } }, state)

    const toolCall = state.toolCalls.get(0) as any
    expect(toolCall.function.arguments).toBe('{"q":"x"}')
  })
})
