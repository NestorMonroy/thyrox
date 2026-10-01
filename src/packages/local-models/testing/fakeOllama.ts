/**
 * Servidor Ollama falso para las pruebas: responde `/api/tags`, `/api/show`,
 * `/api/copy` y `/api/chat` en loopback con lo que la prueba declara, y anota
 * cada petición recibida. No hay red ni Ollama reales.
 */

export interface RecordedRequest {
  readonly path: string
  readonly body: unknown
}

export interface FakeChatReply {
  readonly content?: string
  readonly toolCalls?: readonly { readonly name: string, readonly arguments: Record<string, unknown> }[]
  readonly evalCount?: number
  readonly evalDurationNs?: number
  readonly status?: number
}

export interface FakeOllamaScript {
  readonly tags?: readonly { readonly name: string, readonly digest: string }[]
  readonly show?: Readonly<Record<string, unknown>>
  readonly copyStatus?: number
  /** Respuesta del chat según el contenido del primer mensaje del usuario. */
  readonly chat?: (firstUserContent: string, body: Record<string, unknown>) => FakeChatReply
}

export interface FakeOllama {
  readonly port: number
  readonly baseUrl: string
  readonly requests: RecordedRequest[]
  stop(): Promise<void>
}

const DEFAULT_EVAL_COUNT = 20
const DEFAULT_EVAL_DURATION_NS = 1_000_000_000
const HTTP_OK = 200
const HTTP_NOT_FOUND = 404

function json(value: unknown, status = HTTP_OK): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })
}

function firstUserContent(body: Record<string, unknown>): string {
  const messages = (body.messages ?? []) as { role: string, content: string }[]
  return messages.find(message => message.role === 'user')?.content ?? ''
}

function chatResponse(reply: FakeChatReply): Response {
  const message: Record<string, unknown> = { role: 'assistant', content: reply.content ?? '' }
  if (reply.toolCalls) message.tool_calls = reply.toolCalls.map(call => ({ function: call }))
  return json({
    message,
    done: true,
    eval_count: reply.evalCount ?? DEFAULT_EVAL_COUNT,
    eval_duration: reply.evalDurationNs ?? DEFAULT_EVAL_DURATION_NS,
  }, reply.status ?? HTTP_OK)
}

function route(script: FakeOllamaScript, path: string, body: Record<string, unknown>): Response {
  if (path === '/api/tags') return json({ models: script.tags ?? [] })
  if (path === '/api/show') return script.show ? json(script.show) : json({ error: 'model not found' }, HTTP_NOT_FOUND)
  if (path === '/api/copy') return new Response(null, { status: script.copyStatus ?? HTTP_OK })
  if (path === '/api/chat' && script.chat) return chatResponse(script.chat(firstUserContent(body), body))
  return json({ error: `ruta no declarada: ${path}` }, HTTP_NOT_FOUND)
}

/** Arranca el servidor en un puerto libre de loopback. */
export function startFakeOllama(script: FakeOllamaScript): FakeOllama {
  const requests: RecordedRequest[] = []
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const path = new URL(request.url).pathname
      const text = await request.text()
      const body = (text === '' ? {} : JSON.parse(text)) as Record<string, unknown>
      requests.push({ path, body })
      return route(script, path, body)
    },
  })
  const port = server.port as number
  return {
    port,
    baseUrl: `http://127.0.0.1:${port}`,
    requests,
    stop: () => server.stop(true),
  }
}

/** Respuesta correcta de cada caso de `tool-calling@1`, por su primer mensaje. */
export const CORRECT_TOOL_CALLING_REPLIES: Readonly<Record<string, FakeChatReply>> = {
  'What is the weather in Madrid right now?': { toolCalls: [{ name: 'get_weather', arguments: { city: 'Madrid' } }] },
  'Use the tool to add 17 and 25.': { toolCalls: [{ name: 'add', arguments: { b: 25, a: 17 } }] },
  'Show me the contents of the file /etc/hostname.': { toolCalls: [{ name: 'read_file', arguments: { path: '/etc/hostname' } }] },
  'Switch the operating mode to safe.': { toolCalls: [{ name: 'set_mode', arguments: { mode: 'safe' } }] },
  'Reply with the single word: hello': { content: 'hello' },
  'Use the tool to add 17 and 25, then tell me the result.': { content: 'The result is 42.' },
}
