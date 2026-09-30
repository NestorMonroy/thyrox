/**
 * Un servidor OpenAI Chat Completions falso en loopback (`Bun.serve`, puerto
 * 0) para las pruebas del upstream compatible con OpenAI del proxy local.
 * Registra cada petición recibida y decide su respuesta por el último
 * mensaje: sin mensaje `role: tool` y con `tools` declaradas pide la primera
 * tool (`tool_calls`); con un mensaje `role: tool` responde texto que cita el
 * `tool_call_id` y el contenido recibidos; en otro caso, eco del último texto.
 * Contesta en SSE si la petición trae `stream: true`.
 *
 * `failure` fuerza una respuesta rota para probar el camino de error: un
 * estado HTTP con cuerpo propio, un 200 cuyo cuerpo no es JSON, o un stream
 * cuyo chunk `data:` no es JSON. `omitTrailingUsage` corta el stream tras el
 * `finish_reason`, sin el chunk de uso tardío que algunos upstreams no envían.
 */
type JsonRecord = Record<string, unknown>

export type FakeFailure = { kind: 'status'; status: number; body: string } | { kind: 'invalid-json' } | { kind: 'invalid-sse-chunk' }

export type FakeOptions = { failure?: FakeFailure; omitTrailingUsage?: boolean }

export type FakeOpenAIUpstream = {
  /** La base al estilo del SDK de OpenAI: incluye `/v1`. */
  baseUrl: string
  received: JsonRecord[]
  paths: string[]
  authorizations: (string | null)[]
  stop: () => void
}

export const FAKE_TOOL_CALL_ID = 'call_fake_1'
export const FAKE_TOOL_ARGUMENTS = { path: '/etc' }
const COMPLETION_ID = 'chatcmpl-fakeopenai01'
const USAGE = { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 }

type Reply = { content: string | null; toolCalls?: JsonRecord[]; finishReason: string }

function lastMessage(body: JsonRecord): JsonRecord {
  const messages = (body.messages as JsonRecord[] | undefined) ?? []
  return messages[messages.length - 1] ?? {}
}

function firstToolName(body: JsonRecord): string | undefined {
  const tools = body.tools as { function?: { name?: string } }[] | undefined
  return tools?.[0]?.function?.name
}

function replyTo(body: JsonRecord): Reply {
  const last = lastMessage(body)
  if (last.role === 'tool') {
    return { content: `resultado de ${String(last.tool_call_id)}: ${String(last.content)}`, finishReason: 'stop' }
  }
  const toolName = firstToolName(body)
  if (toolName) {
    const call = { id: FAKE_TOOL_CALL_ID, type: 'function', function: { name: toolName, arguments: JSON.stringify(FAKE_TOOL_ARGUMENTS) } }
    return { content: null, toolCalls: [call], finishReason: 'tool_calls' }
  }
  return { content: `eco: ${typeof last.content === 'string' ? last.content : JSON.stringify(last.content)}`, finishReason: 'stop' }
}

function completion(model: unknown, reply: Reply): JsonRecord {
  const message = { role: 'assistant', content: reply.content, ...(reply.toolCalls && { tool_calls: reply.toolCalls }) }
  return { id: COMPLETION_ID, object: 'chat.completion', model, choices: [{ index: 0, message, finish_reason: reply.finishReason }], usage: USAGE }
}

/** Los chunks de un stream: el rol, el contenido o las llamadas partidas en dos (nombre y argumentos), y el cierre con uso. */
function chunks(model: unknown, reply: Reply, omitTrailingUsage: boolean): JsonRecord[] {
  const frame = (delta: JsonRecord, extra: JsonRecord = {}) => ({ id: COMPLETION_ID, object: 'chat.completion.chunk', model, choices: [{ index: 0, delta, ...extra }] })
  const out: JsonRecord[] = [frame({ role: 'assistant' })]
  if (reply.content) out.push(frame({ content: reply.content }))
  for (const [index, call] of (reply.toolCalls ?? []).entries()) {
    const fn = call.function as JsonRecord
    out.push(frame({ tool_calls: [{ index, id: call.id, type: 'function', function: { name: fn.name, arguments: '' } }] }))
    out.push(frame({ tool_calls: [{ index, function: { arguments: fn.arguments } }] }))
  }
  out.push(frame({}, { finish_reason: reply.finishReason }))
  if (!omitTrailingUsage) out.push({ id: COMPLETION_ID, object: 'chat.completion.chunk', model, choices: [], usage: USAGE })
  return out
}

function sse(frames: JsonRecord[]): Response {
  const text = `${frames.map(frame => `data: ${JSON.stringify(frame)}\n\n`).join('')}data: [DONE]\n\n`
  return new Response(text, { headers: { 'content-type': 'text/event-stream' } })
}

function failed(failure: FakeFailure): Response {
  if (failure.kind === 'invalid-json') return new Response('<html>no soy json', { headers: { 'content-type': 'application/json' } })
  if (failure.kind === 'invalid-sse-chunk') return new Response('data: {roto\n\n', { headers: { 'content-type': 'text/event-stream' } })
  return new Response(failure.body, { status: failure.status, headers: { 'content-type': 'application/json' } })
}

export function startFakeOpenAIUpstream({ failure, omitTrailingUsage = false }: FakeOptions = {}): FakeOpenAIUpstream {
  const received: JsonRecord[] = []
  const paths: string[] = []
  const authorizations: (string | null)[] = []
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const body = (await request.json()) as JsonRecord
      received.push(body)
      paths.push(new URL(request.url).pathname)
      authorizations.push(request.headers.get('authorization'))
      if (failure) return failed(failure)
      const reply = replyTo(body)
      return body.stream === true ? sse(chunks(body.model, reply, omitTrailingUsage)) : Response.json(completion(body.model, reply))
    },
  })
  return { baseUrl: `http://127.0.0.1:${server.port}/v1`, received, paths, authorizations, stop: () => server.stop(true) }
}
