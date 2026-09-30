/**
 * `responseOpenAIToMessages.ts` — porte de
 * `omniroute: open-sse/translator/response/openai-to-claude.ts` (la
 * máquina de estados de eventos SSE).
 *
 * Casos con la misma forma que
 * `omniroute: tests/unit/translator-resp-openai-to-claude.test.ts` y
 * `openai-to-claude-glm-split-tool-name-2077.test.ts` (id y nombre de
 * herramienta en chunks separados) — sin las ramas declaradas pendientes en
 * el docstring del módulo (XML/DSML, frontera Markdown, despojadores de
 * preámbulo, parche de argumentos, remapeo anti-huella-digital).
 */
import { describe, expect, test } from 'bun:test'
import {
  openaiToMessagesResponse,
  openaiMessageToMessagesApiMessage,
  createOpenAIToMessagesState,
} from '../src/proxy/translators/responseOpenAIToMessages.js'

function collectEvents(results: (any[] | null)[]): any[] {
  return results.flatMap((r) => (Array.isArray(r) ? r : r ? [r] : []))
}

describe('openaiMessageToMessagesApiMessage — no-stream', () => {
  test('texto, tool_calls y finish_reason se convierten a un mensaje Mensajes', () => {
    const result = openaiMessageToMessagesApiMessage(
      {
        id: 'chatcmpl-abcdefgh12345',
        model: 'gpt-4o',
        choices: [
          {
            index: 0,
            finish_reason: 'tool_calls',
            message: {
              role: 'assistant',
              content: 'Here is the result',
              tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'proxy_search', arguments: '{"q":"cats"}' } }],
            },
          },
        ],
        usage: { input_tokens: 5, output_tokens: 3 },
      },
      new Map([['proxy_search', 'search']])
    ) as any

    expect(result.id).toBe('abcdefgh12345')
    expect(result.role).toBe('assistant')
    expect(result.stop_reason).toBe('tool_use')
    const textBlock = result.content.find((b: any) => b.type === 'text')
    expect(textBlock.text).toBe('Here is the result')
    const toolUse = result.content.find((b: any) => b.type === 'tool_use')
    expect(toolUse.name).toBe('search')
    expect(toolUse.input).toEqual({ q: 'cats' })
  })

  test('finish_reason "stop" se convierte en end_turn', () => {
    const result = openaiMessageToMessagesApiMessage({
      id: 'chatcmpl-def',
      model: 'gpt-4o',
      choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'ok' } }],
    }) as any
    expect(result.stop_reason).toBe('end_turn')
  })

  test('finish_reason "length" se convierte en max_tokens', () => {
    const result = openaiMessageToMessagesApiMessage({
      id: 'chatcmpl-ghi',
      model: 'gpt-4o',
      choices: [{ index: 0, finish_reason: 'length', message: { role: 'assistant', content: 'cut off' } }],
    }) as any
    expect(result.stop_reason).toBe('max_tokens')
  })

  test('un motivo de aborto (Gemini/Antigravity) se surge como tool_use, no como end_turn', () => {
    const result = openaiMessageToMessagesApiMessage({
      id: 'chatcmpl-jkl',
      model: 'gemini-x',
      choices: [{ index: 0, finish_reason: 'malformed_function_call', message: { role: 'assistant', content: '' } }],
    }) as any
    expect(result.stop_reason).toBe('tool_use')
  })

  test('reasoning_content se convierte en un bloque thinking cuando el cliente lo pidió', () => {
    const result = openaiMessageToMessagesApiMessage(
      {
        id: 'chatcmpl-mno',
        model: 'deepseek-v4',
        choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'answer', reasoning_content: 'thinking aloud' } }],
      },
      undefined,
      true
    ) as any
    const thinkingBlock = result.content.find((b: any) => b.type === 'thinking')
    expect(thinkingBlock.thinking).toBe('thinking aloud')
  })
})

describe('#2077 — id y nombre de herramienta en chunks SSE separados', () => {
  test('content_block_start se DIFIERE hasta que el nombre llega', () => {
    const state = createOpenAIToMessagesState()
    const idOnly = collectEvents([
      openaiToMessagesResponse(
        { id: 'chatcmpl-abc', model: 'glm-5.2', choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: 'call_1' }] } }] },
        state
      ),
    ])
    expect(idOnly.some((e) => e.type === 'content_block_start')).toBe(false)

    const nameArrives = collectEvents([
      openaiToMessagesResponse(
        {
          choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { name: 'proxy_ls' } }] } }],
        },
        state
      ),
    ])
    const start = nameArrives.find((e) => e.type === 'content_block_start')
    expect(start).toBeTruthy()
    expect(start.content_block.id).toBe('call_1')
    // El upstream ya devuelve el nombre SIN el prefijo de Mensajes OAuth (a
    // ese modelo se le declaró "ls", no "proxy_ls"); sin un `toolNameMap`
    // que lo traduzca, el nombre vuelve verbatim.
    expect(start.content_block.name).toBe('ls')
  })
})

describe('eventos SSE — texto y cierre', () => {
  test('el primer chunk siempre emite message_start', () => {
    const state = createOpenAIToMessagesState()
    const events = collectEvents([
      openaiToMessagesResponse({ id: 'chatcmpl-xyz', model: 'gpt-4o', choices: [{ index: 0, delta: { content: 'Hi' } }] }, state),
    ])
    expect(events[0].type).toBe('message_start')
    expect(events.some((e) => e.type === 'content_block_start' && e.content_block.type === 'text')).toBe(true)
    expect(events.some((e) => e.type === 'content_block_delta' && e.delta.text === 'Hi')).toBe(true)
  })

  test('finish_reason cierra el bloque de texto y emite message_delta + message_stop', () => {
    const state = createOpenAIToMessagesState()
    openaiToMessagesResponse({ id: 'chatcmpl-xyz', model: 'gpt-4o', choices: [{ index: 0, delta: { content: 'Hi' } }] }, state)
    const events = collectEvents([
      openaiToMessagesResponse({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 4, completion_tokens: 2 } }, state),
    ])
    expect(events.some((e) => e.type === 'content_block_stop')).toBe(true)
    const messageDelta = events.find((e) => e.type === 'message_delta')
    expect(messageDelta.delta.stop_reason).toBe('end_turn')
    expect(events.some((e) => e.type === 'message_stop')).toBe(true)
  })
})
