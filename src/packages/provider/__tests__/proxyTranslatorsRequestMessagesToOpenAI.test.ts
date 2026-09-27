/**
 * `requestMessagesToOpenAI.ts` — porte de
 * `omniroute: open-sse/translator/request/claude-to-openai.ts`.
 *
 * Los casos reproducen, con la misma forma de entrada/salida, los de
 * `omniroute: tests/unit/translator-claude-to-openai.test.ts`,
 * `translator-claude-to-openai-orphan-tool-4385.test.ts`,
 * `translator-claude-to-openai-strip-billing-header.test.ts`,
 * `claude-to-openai-image-toolresult.test.ts`,
 * `claude-to-openai-system-role-6954.test.ts`,
 * `claude-to-openai-mid-system-user-normalize.test.ts` y
 * `claude-to-openai-glm-user-turn.test.ts` — sin las ramas declaradas
 * pendientes en el docstring del módulo (web_search nativo de Responses,
 * `preserveCacheControl`, `OMNIROUTE_SYSTEM_INSTRUCTION_APPEND`).
 */
import { describe, expect, test } from 'bun:test'
import { messagesToOpenAIRequest } from '../src/proxy/translators/requestMessagesToOpenAI.js'

describe('messagesToOpenAIRequest — mecanismos centrales', () => {
  test('mapea bloques de sistema, parámetros, declaraciones de herramienta y tool_choice', () => {
    const result = messagesToOpenAIRequest(
      'gpt-4o',
      {
        system: [{ text: 'Rule A' }, { text: 'Rule B' }],
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }],
        tools: [
          { name: 'weather', description: null, input_schema: { type: 'object' } },
          { name: '   ', description: 'skip', input_schema: { type: 'object' } },
        ],
        tool_choice: { type: 'tool', name: 'weather' },
        max_tokens: 40000,
        temperature: 0.4,
        top_p: 0.7,
        stop_sequences: ['DONE'],
      },
      true
    ) as any

    expect(result.model).toBe('gpt-4o')
    expect(result.stream).toBe(true)
    expect(result.max_tokens).toBe(40000)
    expect(result.temperature).toBe(0.4)
    expect(result.top_p).toBe(0.7)
    expect(result.stop).toEqual(['DONE'])
    expect(result.messages[0]).toEqual({ role: 'system', content: 'Rule A\nRule B' })
    expect(result.messages[1]).toEqual({ role: 'user', content: 'Hello' })
    expect(result.tools.length).toBe(1)
    expect(result.tools[0]).toEqual({
      type: 'function',
      function: { name: 'weather', description: '', parameters: { type: 'object', properties: {} } },
    })
    expect(result.tool_choice).toEqual({ type: 'function', function: { name: 'weather' } })
  })

  test('tool_choice "any" se mapea a "required"', () => {
    const result = messagesToOpenAIRequest(
      'gpt-4o',
      { messages: [{ role: 'user', content: 'hi' }], tool_choice: { type: 'any' } },
      false
    ) as any
    expect(result.tool_choice).toBe('required')
  })

  test('thinking.budget_tokens se mapea a reasoning_effort por cubos', () => {
    const low = messagesToOpenAIRequest(
      'gpt-4o',
      { messages: [{ role: 'user', content: 'hi' }], thinking: { type: 'enabled', budget_tokens: 500 } },
      false
    ) as any
    expect(low.reasoning_effort).toBe('low')

    const xhigh = messagesToOpenAIRequest(
      'gpt-4o',
      { messages: [{ role: 'user', content: 'hi' }], thinking: { type: 'enabled', budget_tokens: 200000 } },
      false
    ) as any
    expect(xhigh.reasoning_effort).toBe('xhigh')
  })
})

describe('#4385 — huérfanos de tool_result', () => {
  test('descarta un tool_result huérfano sin tool_use previo', () => {
    const result = messagesToOpenAIRequest(
      'deepseek/deepseek-v4-pro',
      {
        messages: [
          { role: 'user', content: 'start the task' },
          {
            role: 'user',
            content: [
              { type: 'tool_result', tool_use_id: 'orphan_tu', content: 'stale output' },
              { type: 'text', text: 'please continue' },
            ],
          },
        ],
      },
      false
    ) as any

    const toolMsgs = result.messages.filter((m: any) => m.role === 'tool')
    expect(toolMsgs.length).toBe(0)
    const userTexts = result.messages.filter((m: any) => m.role === 'user')
    expect(userTexts.length).toBe(2)
  })

  test('conserva un tool_result emparejado con su tool_call', () => {
    const result = messagesToOpenAIRequest(
      'deepseek/deepseek-v4-pro',
      {
        messages: [
          { role: 'user', content: 'list files' },
          { role: 'assistant', content: [{ type: 'tool_use', id: 'tu_1', name: 'ls', input: {} }] },
          { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu_1', content: 'a.ts' }] },
        ],
      },
      false
    ) as any

    const toolMsgs = result.messages.filter((m: any) => m.role === 'tool')
    expect(toolMsgs.length).toBe(1)
    expect(toolMsgs[0].tool_call_id).toBe('tu_1')
  })
})

describe('cabecera de facturación de Anthropic', () => {
  test('se despoja de bloques de sistema en arreglo', () => {
    const result = messagesToOpenAIRequest(
      'gpt-4o',
      {
        system: [{ text: 'x-anthropic-billing-header: abc123\nReal system rule A' }, { text: 'Real system rule B' }],
        messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      },
      true
    ) as any
    const sys = result.messages.find((m: any) => m.role === 'system')
    expect(sys).toBeTruthy()
    expect(sys.content.includes('x-anthropic-billing-header')).toBe(false)
    expect(sys.content.includes('Real system rule A')).toBe(true)
    expect(sys.content.includes('Real system rule B')).toBe(true)
  })

  test('se despoja de un campo system en cadena', () => {
    const result = messagesToOpenAIRequest(
      'gpt-4o',
      {
        system: 'x-anthropic-billing-header: zzz\nFollow these rules.',
        messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      },
      true
    ) as any
    const sys = result.messages.find((m: any) => m.role === 'system')
    expect(sys.content).toBe('Follow these rules.')
  })
})

describe('tool_result de sólo imagen', () => {
  test('produce image_url en el turno de usuario siguiente, no texto base64', () => {
    const FAKE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const MEDIA_TYPE = 'image/png'
    const result = messagesToOpenAIRequest(
      'gpt-4o',
      {
        messages: [
          { role: 'assistant', content: [{ type: 'tool_use', id: 'tool-abc', name: 'screenshot', input: {} }] },
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'tool-abc',
                content: [{ type: 'image', source: { type: 'base64', media_type: MEDIA_TYPE, data: FAKE_BASE64 } }],
              },
            ],
          },
        ],
      },
      false
    ) as any

    const msgs = result.messages as any[]
    const toolMsg = msgs.find((m) => m.role === 'tool')
    expect(toolMsg).toBeTruthy()
    expect(JSON.stringify(toolMsg.content).includes(FAKE_BASE64)).toBe(false)

    const followingUser = msgs[msgs.indexOf(toolMsg) + 1]
    expect(followingUser.role).toBe('user')
    const imagePart = (followingUser.content as any[]).find((p) => p.type === 'image_url')
    expect(imagePart.image_url.url).toBe(`data:${MEDIA_TYPE};base64,${FAKE_BASE64}`)
  })
})

describe('#6954 y degradación de sistema a mitad de conversación', () => {
  test('un system a mitad de conversación se degrada a "user", nunca a "assistant"', () => {
    const result = messagesToOpenAIRequest(
      'gpt-4o',
      {
        messages: [
          { role: 'user', content: 'hello' },
          { role: 'assistant', content: 'hi' },
          { role: 'system', content: 'Reminder: be concise.' },
          { role: 'user', content: 'ok' },
        ],
      },
      false
    ) as any
    const roles = result.messages.map((m: any) => m.role)
    expect(roles).toEqual(['user', 'assistant', 'user', 'user'])
  })

  test('la degradación conserva el contenido exacto (contexto de hook de thyrox)', () => {
    const body = {
      max_tokens: 64,
      messages: [
        { role: 'user', content: [{ type: 'text', text: 'plan the deploy' }] },
        { role: 'system', content: 'SessionStart hook context' },
        { role: 'assistant', content: [{ type: 'tool_use', id: 'toolu-1', name: 'Read', input: { file_path: '/x' } }] },
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu-1', content: 'file contents' }] },
        { role: 'system', content: 'PreToolUse hook context' },
      ],
    }
    const result = messagesToOpenAIRequest('hcp-vision-latest', body, false, null) as any
    const roles = result.messages.map((m: any) => m.role)
    expect(roles).toEqual(['user', 'user', 'assistant', 'tool', 'user'])
    expect(roles.includes('system')).toBe(false)
    expect(result.messages[1].content).toBe('SessionStart hook context')
  })
})

describe('#GLM — turno de usuario sintético', () => {
  const TOOL_LOOP_BODY = {
    system: 'You are helpful.',
    max_tokens: 64,
    messages: [
      { role: 'assistant', content: [{ type: 'tool_use', id: 'tool-1', name: 'Read', input: { file_path: '/x' } }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tool-1', content: 'file contents' }] },
    ],
  }

  test('con _ensureUserTurn gana un turno de usuario sintético al final', () => {
    const result = messagesToOpenAIRequest('ox-alpha-free', TOOL_LOOP_BODY, false, { _ensureUserTurn: true }) as any
    const roles = result.messages.map((m: any) => m.role)
    expect(roles.includes('user')).toBe(true)
    const last = result.messages[result.messages.length - 1]
    expect(last.role).toBe('user')
  })

  test('sin el flag, no se inyecta ningún usuario', () => {
    const result = messagesToOpenAIRequest('gpt-4o', TOOL_LOOP_BODY, false, null) as any
    const roles = result.messages.map((m: any) => m.role)
    expect(roles.includes('user')).toBe(false)
  })
})
