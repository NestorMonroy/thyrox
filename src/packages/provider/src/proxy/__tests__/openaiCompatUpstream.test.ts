/**
 * El upstream compatible con OpenAI del proxy local, de extremo a extremo por
 * `startProxyServer` contra un servidor OpenAI falso en loopback
 * (`./fakeOpenAIUpstream.ts`): enrutado por el modelo declarado, texto sin
 * stream y con stream, y el recorrido de aceptación de la herramienta
 * (`tool_calls` → `tool_use` → `tool_result` → mensaje `role: tool`).
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { ALLOW_LOOPBACK_ENV } from '../netGuards.ts'
import { startProxyServer, type ProxyStartConfig, type RunningProxy } from '../startServer.ts'
import { FAKE_TOOL_ARGUMENTS, FAKE_TOOL_CALL_ID, startFakeOpenAIUpstream, type FakeOpenAIUpstream, type FakeOptions } from './fakeOpenAIUpstream.ts'

type JsonRecord = Record<string, unknown>

const KEY = 'sk-local'
const OPEN_MODEL = 'qwen-local'
const UPSTREAM_MODEL = 'qwen2.5:0.5b'
const LS_TOOL = { name: 'ls', description: 'lista', input_schema: { type: 'object', properties: { path: { type: 'string' } } } }

const cleanups: (() => Promise<void> | void)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

function fake(options: FakeOptions = {}): FakeOpenAIUpstream {
  const upstream = startFakeOpenAIUpstream(options)
  cleanups.push(upstream.stop)
  return upstream
}

function proxyFor(upstream: FakeOpenAIUpstream, apiKey?: string): RunningProxy {
  const proxy = startProxyServer(configFor(upstream.baseUrl, apiKey, { [ALLOW_LOOPBACK_ENV]: '1' }))
  cleanups.push(() => proxy.stop())
  return proxy
}

function configFor(baseUrl: string, apiKey: string | undefined, env: Record<string, string>): ProxyStartConfig {
  return {
    host: '127.0.0.1',
    port: 0,
    accessKeys: [KEY],
    routing: {
      upstreams: [{ name: 'open', provider: 'openai-compatible', models: [OPEN_MODEL] }],
      models: [{ id: OPEN_MODEL, upstream_model: { open: UPSTREAM_MODEL } }],
      auto_include_builtin_models: false,
    },
    endpoints: {},
    credentials: {},
    selector: 'fill-first',
    version: '0.1.0',
    env,
    openaiCompat: { upstreams: [{ name: 'open', baseUrl, apiKey }] },
  }
}

function send(proxy: RunningProxy, body: unknown): Promise<Response> {
  return fetch(`${proxy.url}/v1/messages`, {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Los eventos de un cuerpo SSE de Messages, en orden, como `{ event, data }`. */
async function sseEvents(response: Response): Promise<{ event: string; data: JsonRecord }[]> {
  const text = await response.text()
  return text.split('\n\n').filter(frame => frame.startsWith('event: ')).map(frame => {
    const [eventLine, dataLine] = frame.split('\n')
    return { event: (eventLine ?? '').slice('event: '.length), data: JSON.parse((dataLine ?? '').slice('data: '.length)) as JsonRecord }
  })
}

function textOf(events: { event: string; data: JsonRecord }[]): string {
  return events
    .filter(({ data }) => data.type === 'content_block_delta' && (data.delta as JsonRecord).type === 'text_delta')
    .map(({ data }) => (data.delta as JsonRecord).text as string)
    .join('')
}

describe('texto sin stream', () => {
  test('traduce a /chat/completions con el modelo del upstream y devuelve un mensaje Messages', async () => {
    const upstream = fake()
    const response = await send(proxyFor(upstream), { model: OPEN_MODEL, max_tokens: 64, system: 'eres breve', messages: [{ role: 'user', content: 'hola' }] })
    expect(response.status).toBe(200)
    const body = await response.json() as JsonRecord
    expect(body).toMatchObject({ type: 'message', role: 'assistant', stop_reason: 'end_turn', usage: { input_tokens: 11, output_tokens: 7 } })
    expect(body.content).toEqual([{ type: 'text', text: 'eco: hola' }])
    expect(upstream.paths).toEqual(['/v1/chat/completions'])
    expect(upstream.received[0]).toMatchObject({ model: UPSTREAM_MODEL, messages: [{ role: 'system', content: 'eres breve' }, { role: 'user', content: 'hola' }] })
  })

  test('la clave declarada viaja como Bearer; sin clave no hay authorization', async () => {
    const keyed = fake()
    await send(proxyFor(keyed, 'sk-open'), { model: OPEN_MODEL, max_tokens: 8, messages: [{ role: 'user', content: 'a' }] })
    const open = fake()
    await send(proxyFor(open), { model: OPEN_MODEL, max_tokens: 8, messages: [{ role: 'user', content: 'a' }] })
    expect(keyed.authorizations).toEqual(['Bearer sk-open'])
    expect(open.authorizations).toEqual([null])
  })

  test('una baseUrl insegura rehúsa arrancar el proxy', () => {
    expect(() => startProxyServer(configFor('http://127.0.0.1:9/v1', undefined, {}))).toThrow('baseUrl insegura para el upstream "open"')
  })

  test('un modelo que el upstream no declara no llega al fake', async () => {
    const upstream = fake()
    const response = await send(proxyFor(upstream), { model: 'otro-modelo', max_tokens: 8, messages: [{ role: 'user', content: 'a' }] })
    expect(response.status).toBe(400)
    expect(upstream.received).toHaveLength(0)
  })
})

describe('texto con stream', () => {
  test('reenvía stream: true y devuelve eventos SSE Messages completos', async () => {
    const upstream = fake()
    const response = await send(proxyFor(upstream), { model: OPEN_MODEL, max_tokens: 64, stream: true, messages: [{ role: 'user', content: 'hola' }] })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/event-stream')
    const events = await sseEvents(response)
    expect(events[0]?.event).toBe('message_start')
    expect(events[events.length - 1]?.event).toBe('message_stop')
    expect(textOf(events)).toBe('eco: hola')
    const delta = events.find(({ event }) => event === 'message_delta')?.data
    expect(delta).toMatchObject({ delta: { stop_reason: 'end_turn' }, usage: { input_tokens: 11, output_tokens: 7 } })
    expect(upstream.received[0]).toMatchObject({ stream: true })
  })

  test('sin chunk de uso tardío, el cierre diferido se purga y el stream termina con message_stop', async () => {
    const upstream = fake({ omitTrailingUsage: true })
    const events = await sseEvents(await send(proxyFor(upstream), { model: OPEN_MODEL, max_tokens: 64, stream: true, messages: [{ role: 'user', content: 'hola' }] }))
    expect(events.find(({ event }) => event === 'message_delta')?.data).toMatchObject({ delta: { stop_reason: 'end_turn' } })
    expect(events[events.length - 1]?.event).toBe('message_stop')
  })
})

describe('recorrido de aceptación de la herramienta', () => {
  const first = { role: 'user', content: 'lista /etc' }

  async function toolUseTurn(proxy: RunningProxy): Promise<JsonRecord> {
    const response = await send(proxy, { model: OPEN_MODEL, max_tokens: 64, tools: [LS_TOOL], messages: [first] })
    expect(response.status).toBe(200)
    return response.json() as Promise<JsonRecord>
  }

  function continuation(assistant: JsonRecord, stream: boolean): JsonRecord {
    const toolResult = { role: 'user', content: [{ type: 'tool_result', tool_use_id: FAKE_TOOL_CALL_ID, content: 'passwd hosts' }] }
    return { model: OPEN_MODEL, max_tokens: 64, stream, tools: [LS_TOOL], messages: [first, { role: 'assistant', content: assistant.content }, toolResult] }
  }

  test('tool_calls del upstream vuelven como tool_use con stop_reason tool_use', async () => {
    const upstream = fake()
    const assistant = await toolUseTurn(proxyFor(upstream))
    expect(assistant.stop_reason).toBe('tool_use')
    expect(assistant.content).toEqual([{ type: 'tool_use', id: FAKE_TOOL_CALL_ID, name: 'ls', input: FAKE_TOOL_ARGUMENTS }])
    expect(upstream.received[0]?.tools).toEqual([{ type: 'function', function: { name: 'ls', description: 'lista', parameters: LS_TOOL.input_schema } }])
  })

  test('el tool_result llega al upstream como role: tool con el mismo id, y su texto vuelve al cliente', async () => {
    const upstream = fake()
    const proxy = proxyFor(upstream)
    const assistant = await toolUseTurn(proxy)
    const response = await send(proxy, continuation(assistant, false))
    expect(response.status).toBe(200)
    const body = await response.json() as JsonRecord
    const toolMessage = (upstream.received[1]?.messages as JsonRecord[]).find(message => message.role === 'tool')
    expect(toolMessage).toEqual({ role: 'tool', tool_call_id: FAKE_TOOL_CALL_ID, content: 'passwd hosts' })
    expect(body.content).toEqual([{ type: 'text', text: `resultado de ${FAKE_TOOL_CALL_ID}: passwd hosts` }])
    expect(body.stop_reason).toBe('end_turn')
  })

  test('con stream, el tool_use llega por eventos y la continuación también', async () => {
    const upstream = fake()
    const proxy = proxyFor(upstream)
    const toolTurn = await sseEvents(await send(proxy, { model: OPEN_MODEL, max_tokens: 64, stream: true, tools: [LS_TOOL], messages: [first] }))
    const start = toolTurn.find(({ data }) => data.type === 'content_block_start')?.data.content_block as JsonRecord
    expect(start).toMatchObject({ type: 'tool_use', id: FAKE_TOOL_CALL_ID, name: 'ls' })
    const argumentsJson = toolTurn
      .filter(({ data }) => data.type === 'content_block_delta' && (data.delta as JsonRecord).type === 'input_json_delta')
      .map(({ data }) => (data.delta as JsonRecord).partial_json as string)
      .join('')
    expect(JSON.parse(argumentsJson)).toEqual(FAKE_TOOL_ARGUMENTS)
    expect(toolTurn.find(({ event }) => event === 'message_delta')?.data).toMatchObject({ delta: { stop_reason: 'tool_use' } })
    const assistant = { content: [{ type: 'tool_use', id: FAKE_TOOL_CALL_ID, name: 'ls', input: FAKE_TOOL_ARGUMENTS }] }
    const answer = await sseEvents(await send(proxy, continuation(assistant, true)))
    expect(textOf(answer)).toBe(`resultado de ${FAKE_TOOL_CALL_ID}: passwd hosts`)
  })
})
