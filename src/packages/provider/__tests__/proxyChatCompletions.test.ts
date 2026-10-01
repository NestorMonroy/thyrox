/**
 * `/v1/chat/completions` en el proxy local: un cliente que habla OpenAI
 * Chat Completions recibe servicio de un upstream que habla la API de
 * Mensajes. La petición se traduce con `openaiToMessagesRequest`, viaja por
 * el mismo camino de conmutación que `/v1/messages`, y la respuesta vuelve
 * traducida — no-stream con `messagesApiMessageToOpenAIResponse`, stream con la
 * máquina `messagesToOpenAIResponse` —. Todo es código de thyrox; el
 * upstream es un `forward` de prueba, sin red.
 */
import { describe, expect, test } from 'bun:test'
import { AccessManager, createConfigApiKeyProvider } from '../src/proxy/access.ts'
import { FillFirstSelector } from '../src/proxy/credentialSelectors.ts'
import { createProxyHandler, type ForwardRequest } from '../src/proxy/server.ts'
import { CLAUDE_OAUTH_TOOL_PREFIX } from '../src/proxy/translators/index.ts'

const KEY = 'sk-local-test'

function handler(respond: (request: ForwardRequest) => Response, seen: ForwardRequest[] = []) {
  return createProxyHandler({
    access: new AccessManager([createConfigApiKeyProvider([KEY])!]),
    routing: {
      upstreams: [{ name: 'a', provider: 'anthropic' }],
      models: [{ id: 'mx', upstream_model: { a: 'mx-a' } }],
      auto_include_builtin_models: false,
    },
    credentials: { a: [{ id: 'a1' }] },
    selector: new FillFirstSelector(),
    forward: async request => {
      seen.push(request)
      return respond(request)
    },
  })
}

function chat(body: unknown): Request {
  return new Request('http://127.0.0.1/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const messagesApiMessage = {
  id: 'msg_1',
  type: 'message',
  role: 'assistant',
  model: 'mx-a',
  content: [{ type: 'text', text: 'hola' }],
  stop_reason: 'end_turn',
  usage: { input_tokens: 3, output_tokens: 1 },
}

function messagesSse(events: Record<string, unknown>[]): Response {
  const text = events.map(e => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('')
  return new Response(text, { headers: { 'content-type': 'text/event-stream' } })
}

describe('/v1/chat/completions', () => {
  test('traduce la petición a la API de Mensajes y la envía por /v1/messages', async () => {
    const seen: ForwardRequest[] = []
    await handler(() => Response.json(messagesApiMessage), seen)(
      chat({ model: 'mx', messages: [{ role: 'system', content: 'sé breve' }, { role: 'user', content: 'hola' }] }),
    )
    expect(seen).toHaveLength(1)
    expect(seen[0]?.path).toBe('/v1/messages')
    expect(seen[0]?.body.model).toBe('mx-a')
    expect(JSON.stringify(seen[0]?.body.system)).toContain('sé breve')
    expect(seen[0]?.body.messages).toEqual([{ role: 'user', content: [{ type: 'text', text: 'hola' }] }])
    expect(seen[0]?.body).not.toHaveProperty('_toolNameMap')
  })

  test('sin stream devuelve un chat.completion con el texto y finish_reason', async () => {
    const response = await handler(() => Response.json(messagesApiMessage))(
      chat({ model: 'mx', messages: [{ role: 'user', content: 'hola' }] }),
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as { object: string; choices: { message: { content: string }; finish_reason: string }[] }
    expect(body.object).toBe('chat.completion')
    expect(body.choices[0]?.message.content).toBe('hola')
    expect(body.choices[0]?.finish_reason).toBe('stop')
  })

  test('con stream re-emite los eventos de Mensajes como trozos OpenAI y cierra con [DONE]', async () => {
    const response = await handler(() =>
      messagesSse([
        { type: 'message_start', message: { ...messagesApiMessage, content: [], stop_reason: null } },
        { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'ho' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'la' } },
        { type: 'content_block_stop', index: 0 },
        { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 1 } },
        { type: 'message_stop' },
      ]),
    )(chat({ model: 'mx', stream: true, messages: [{ role: 'user', content: 'hola' }] }))
    expect(response.headers.get('content-type')).toContain('text/event-stream')
    const lines = (await response.text()).split('\n').filter(l => l.startsWith('data: '))
    expect(lines.at(-1)).toBe('data: [DONE]')
    const chunks = lines.slice(0, -1).map(l => JSON.parse(l.slice(6)) as { choices: { delta: { content?: string }; finish_reason: string | null }[] })
    expect(chunks.map(c => c.choices[0]?.delta.content ?? '').join('')).toBe('hola')
    expect(chunks.some(c => c.choices[0]?.finish_reason === 'stop')).toBe(true)
  })

  test('el nombre de herramienta que la traducción prefija vuelve a su nombre original', async () => {
    const seen: ForwardRequest[] = []
    const response = await handler(request => {
      const tools = request.body.tools as { name: string }[]
      return Response.json({
        ...messagesApiMessage,
        content: [{ type: 'tool_use', id: 'toolu_1', name: tools[0]!.name, input: { city: 'CDMX' } }],
        stop_reason: 'tool_use',
      })
    }, seen)(
      chat({
        model: 'mx',
        messages: [{ role: 'user', content: 'clima' }],
        tools: [{ type: 'function', function: { name: 'get_weather', parameters: { type: 'object', properties: {} } } }],
      }),
    )
    expect((seen[0]?.body.tools as { name: string }[])[0]?.name).toBe(`${CLAUDE_OAUTH_TOOL_PREFIX}get_weather`)
    expect(seen[0]?.body).not.toHaveProperty('_toolNameMap')
    const body = (await response.json()) as { choices: { message: { tool_calls: { function: { name: string } }[] } }[] }
    expect(body.choices[0]?.message.tool_calls[0]?.function.name).toBe('get_weather')
  })

  test('un error del upstream vuelve con su estado y la forma de error de OpenAI', async () => {
    const response = await handler(() => Response.json({ type: 'error', error: { type: 'rate_limit_error', message: 'despacio' } }, { status: 429 }))(
      chat({ model: 'mx', messages: [{ role: 'user', content: 'hola' }] }),
    )
    expect(response.status).toBe(429)
    const body = (await response.json()) as { error: { message: string; type: string } }
    expect(body.error.message).toBe('despacio')
    expect(body.error.type).toBe('rate_limit_error')
  })

  test('sin modelo responde 400 sin tocar el upstream', async () => {
    const seen: ForwardRequest[] = []
    const response = await handler(() => Response.json(messagesApiMessage), seen)(chat({ messages: [] }))
    expect(response.status).toBe(400)
    expect(seen).toHaveLength(0)
  })

  test('sin la clave local responde 401', async () => {
    const response = await handler(() => Response.json(messagesApiMessage))(
      new Request('http://127.0.0.1/v1/chat/completions', { method: 'POST', body: '{"model":"mx"}' }),
    )
    expect(response.status).toBe(401)
  })
})
