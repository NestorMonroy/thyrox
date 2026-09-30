/**
 * `requestOpenAIToMessages.ts` — porte de
 * `omniroute: open-sse/translator/request/openai-to-claude.ts`.
 *
 * Casos con la misma forma que
 * `omniroute: tests/unit/translator-openai-to-claude.test.ts`,
 * `openai-to-claude-bare-tool.test.ts`,
 * `openai-to-claude-empty-messages-5245.test.ts`,
 * `openai-to-claude-strip-empty.test.ts`,
 * `openai-to-claude-undefined-signature-12105.test.ts` — sin las ramas
 * pendientes declaradas en el docstring del módulo (registro de capacidades
 * por modelo, Kimi Coding, Antigravity).
 */
import { describe, expect, test } from 'bun:test'
import { openaiToMessagesRequest, CLAUDE_OAUTH_TOOL_PREFIX } from '../src/proxy/translators/requestOpenAIToMessages.js'

describe('openaiToMessagesRequest — mecanismos centrales', () => {
  test('mapea system/developer, mensajes y max_tokens', () => {
    const result = openaiToMessagesRequest(
      'claude-3-7-sonnet',
      {
        max_tokens: 512,
        messages: [
          { role: 'system', content: 'Be concise.' },
          { role: 'user', content: 'Hello' },
        ],
      },
      false
    ) as any

    expect(result.model).toBe('claude-3-7-sonnet')
    expect(result.max_tokens).toBe(512)
    expect(result.system).toEqual([{ type: 'text', text: 'Be concise.', cache_control: { type: 'ephemeral', ttl: '1h' } }])
    expect(result.messages).toEqual([{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }])
  })

  test('rol "developer" se eleva a system, igual que "system"', () => {
    const result = openaiToMessagesRequest(
      'claude-3-7-sonnet',
      { messages: [{ role: 'developer', content: 'Follow the spec.' }, { role: 'user', content: 'hi' }] },
      false
    ) as any
    expect(result.system).toEqual([{ type: 'text', text: 'Follow the spec.', cache_control: { type: 'ephemeral', ttl: '1h' } }])
  })

  test('tool_calls se convierten a tool_use con el prefijo de Mensajes OAuth', () => {
    const result = openaiToMessagesRequest(
      'claude-3-7-sonnet',
      {
        messages: [
          {
            role: 'assistant',
            content: null,
            tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'get_weather', arguments: '{"city":"NYC"}' } }],
          },
          { role: 'tool', tool_call_id: 'call_1', content: 'sunny' },
        ],
      },
      false
    ) as any

    const assistantMsg = result.messages.find((m: any) => m.role === 'assistant')
    const toolUse = assistantMsg.content.find((b: any) => b.type === 'tool_use')
    expect(toolUse.name).toBe(`${CLAUDE_OAUTH_TOOL_PREFIX}get_weather`)
    expect(toolUse.input).toEqual({ city: 'NYC' })

    const toolResultMsg = result.messages.find((m: any) =>
      Array.isArray(m.content) && m.content.some((b: any) => b.type === 'tool_result')
    )
    const toolResult = toolResultMsg.content.find((b: any) => b.type === 'tool_result')
    expect(toolResult.tool_use_id).toBe(toolUse.id)
    expect(toolResult.content).toBe('sunny')
  })

  test('el nombre de herramienta se registra en _toolNameMap para la traducción de respuesta', () => {
    const result = openaiToMessagesRequest(
      'claude-3-7-sonnet',
      { messages: [{ role: 'user', content: 'hi' }], tools: [{ type: 'function', function: { name: 'search', parameters: { type: 'object' } } }] },
      false
    ) as any
    expect(result.tools[0].name).toBe(`${CLAUDE_OAUTH_TOOL_PREFIX}search`)
    expect(result._toolNameMap.get(`${CLAUDE_OAUTH_TOOL_PREFIX}search`)).toBe('search')
    expect(result.tools[0].cache_control).toEqual({ type: 'ephemeral', ttl: '1h' })
  })

  test('reasoning_effort se mapea a thinking.budget_tokens', () => {
    const result = openaiToMessagesRequest(
      'claude-3-5-haiku',
      { messages: [{ role: 'user', content: 'hi' }], reasoning_effort: 'medium' },
      false
    ) as any
    expect(result.thinking).toEqual({ type: 'enabled', budget_tokens: 10240 })
    expect(result.temperature).toBeUndefined()
  })

  test('response_format json_object inyecta instrucción de sistema', () => {
    const result = openaiToMessagesRequest(
      'claude-3-7-sonnet',
      { messages: [{ role: 'user', content: 'hi' }], response_format: { type: 'json_object' } },
      false
    ) as any
    expect(result.system[0].text.includes('valid JSON')).toBe(true)
  })
})

describe('guarda de mensajes vacíos (#5245)', () => {
  test('una petición sólo con system produce un turno de usuario sintético', () => {
    const result = openaiToMessagesRequest('claude-3-7-sonnet', { messages: [{ role: 'system', content: 'hi' }] }, false) as any
    expect(result.messages.length).toBe(1)
    expect(result.messages[0].role).toBe('user')
  })
})

describe('herramientas sin envoltorio (bare)', () => {
  test('desenvuelve tool.function aunque falte el type:"function" del padre', () => {
    const result = openaiToMessagesRequest(
      'claude-3-7-sonnet',
      { messages: [{ role: 'user', content: 'hi' }], tools: [{ function: { name: 'bare_tool', parameters: { type: 'object' } } }] },
      false
    ) as any
    expect(result.tools[0].name).toBe(`${CLAUDE_OAUTH_TOOL_PREFIX}bare_tool`)
  })
})

describe('firma indefinida en bloques de pensamiento (#12105 / #6953)', () => {
  test('un bloque thinking sin firma se descarta en vez de fabricar una', () => {
    const result = openaiToMessagesRequest(
      'claude-3-7-sonnet',
      { messages: [{ role: 'assistant', content: [{ type: 'thinking', thinking: 'plan' }] }] },
      false
    ) as any
    const assistantMsg = result.messages.find((m: any) => m.role === 'assistant')
    expect((assistantMsg?.content ?? []).some((b: any) => b.type === 'thinking')).toBe(false)
  })

  test('un bloque thinking CON firma se conserva verbatim', () => {
    const result = openaiToMessagesRequest(
      'claude-3-7-sonnet',
      { messages: [{ role: 'assistant', content: [{ type: 'thinking', thinking: 'plan', signature: 'sig-1' }] }] },
      false
    ) as any
    const assistantMsg = result.messages.find((m: any) => m.role === 'assistant')
    const thinkingBlock = assistantMsg.content.find((b: any) => b.type === 'thinking')
    expect(thinkingBlock.signature).toBe('sig-1')
  })
})

describe('bloques de texto vacíos (T02)', () => {
  test('un tool_result con un bloque de texto vacío se despoja de él', () => {
    const result = openaiToMessagesRequest(
      'claude-3-7-sonnet',
      {
        messages: [
          {
            role: 'assistant',
            content: null,
            tool_calls: [{ id: 'toolu_1', type: 'function', function: { name: 'ls', arguments: '{}' } }],
          },
          {
            role: 'user',
            content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: [{ type: 'text', text: '' }, { type: 'text', text: 'ok' }] }],
          },
        ],
      },
      false
    ) as any
    const toolResultMsg = result.messages.find(
      (m: any) => Array.isArray(m.content) && m.content.some((b: any) => b.type === 'tool_result')
    )
    const toolResult = toolResultMsg.content.find((b: any) => b.type === 'tool_result')
    expect(toolResult.content).toEqual([{ type: 'text', text: 'ok' }])
  })
})

describe('adyacencia de tool_result', () => {
  test('un tool_result que llega tras texto de usuario se reordena junto al tool_use', () => {
    const result = openaiToMessagesRequest(
      'claude-3-7-sonnet',
      {
        messages: [
          { role: 'user', content: 'start' },
          {
            role: 'assistant',
            content: null,
            tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'ls', arguments: '{}' } }],
          },
          { role: 'user', content: 'meanwhile, some text' },
          { role: 'tool', tool_call_id: 'call_1', content: 'a.ts' },
        ],
      },
      false
    ) as any

    const assistantIdx = result.messages.findIndex((m: any) => m.role === 'assistant')
    const nextMsg = result.messages[assistantIdx + 1]
    expect(nextMsg.content.some((b: any) => b.type === 'tool_result' && b.tool_use_id === 'call_1')).toBe(true)
  })
})
