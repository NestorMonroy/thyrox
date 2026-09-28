/**
 * `/v1/antigravity` en el proxy local: el sobre cloudcode del IDE Antigravity
 * se traduce a OpenAI Chat Completions, viaja por el mismo camino que
 * `/v1/chat/completions`, y la respuesta vuelve en la forma de cloudcode
 * (`{ response: { candidates, usageMetadata } }`). El upstream es un
 * `forward` de prueba, sin red.
 */
import { describe, expect, test } from 'bun:test'
import { AccessManager, createConfigApiKeyProvider } from '../src/proxy/access.ts'
import { FillFirstSelector } from '../src/proxy/credentialSelectors.ts'
import { createProxyHandler, type ForwardRequest } from '../src/proxy/server.ts'

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

function antigravity(body: unknown, key = KEY): Request {
  return new Request('http://127.0.0.1/v1/antigravity', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const envelope = {
  model: 'mx',
  project: 'projects/1',
  request: {
    systemInstruction: { parts: [{ text: 'be brief' }] },
    contents: [{ role: 'user', parts: [{ text: 'hola' }] }],
  },
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

describe('/v1/antigravity', () => {
  test('translates the cloudcode envelope and sends it through /v1/messages', async () => {
    const seen: ForwardRequest[] = []
    await handler(() => Response.json(messagesApiMessage), seen)(antigravity(envelope))
    expect(seen).toHaveLength(1)
    expect(seen[0]?.path).toBe('/v1/messages')
    expect(seen[0]?.body.model).toBe('mx-a')
    expect(JSON.stringify(seen[0]?.body.system)).toContain('be brief')
    expect(seen[0]?.body.messages).toEqual([{ role: 'user', content: [{ type: 'text', text: 'hola' }] }])
  })

  test('without stream it answers one cloudcode response with candidates and usage', async () => {
    const response = await handler(() => Response.json(messagesApiMessage))(antigravity(envelope))
    expect(response.status).toBe(200)
    const body = (await response.json()) as { response: Record<string, unknown> }
    expect(body.response).toMatchObject({
      candidates: [{ content: { role: 'model', parts: [{ text: 'hola' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 1, totalTokenCount: 4 },
    })
    expect(body).not.toHaveProperty('choices')
  })

  test('with stream it re-emits the chunks as cloudcode SSE events', async () => {
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
    )(antigravity({ ...envelope, stream: true }))
    expect(response.headers.get('content-type')).toBe('text/event-stream')
    const events = (await response.text())
      .split('\n\n')
      .filter(Boolean)
      .map(e => JSON.parse(e.replace(/^data: /, '')) as { response: { candidates: { content: { parts: { text?: string }[] }; finishReason?: string }[] } })
    const text = events.flatMap(e => e.response.candidates[0]!.content.parts.map(p => p.text ?? '')).join('')
    expect(text).toBe('hola')
    expect(events.at(-1)!.response.candidates[0]!.finishReason).toBe('STOP')
  })

  test('an upstream error keeps its status', async () => {
    const response = await handler(() =>
      Response.json({ type: 'error', error: { type: 'rate_limit_error', message: 'slow down' } }, { status: 429 }),
    )(antigravity(envelope))
    expect(response.status).toBe(429)
    expect(((await response.json()) as { error: { message: string } }).error.message).toBe('slow down')
  })

  test('a body without model is refused before any upstream call', async () => {
    const seen: ForwardRequest[] = []
    const response = await handler(() => Response.json(messagesApiMessage), seen)(antigravity({ request: envelope.request }))
    expect(response.status).toBe(400)
    expect(seen).toHaveLength(0)
  })

  test('the route asks for the local key like every other one', async () => {
    const response = await handler(() => Response.json(messagesApiMessage))(antigravity(envelope, 'wrong'))
    expect(response.status).toBe(401)
  })
})
