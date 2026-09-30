/**
 * El stream SSE de Chat Completions leído como eventos Messages: cada línea
 * `data:` pasa por `openaiToMessagesResponse`, y al terminar se purga el
 * cierre diferido (el traductor espera un chunk de uso tardío). Un `data:`
 * que no es JSON, o un stream que termina sin un solo chunk, se entregan como
 * un evento `error` que nombra al upstream, en vez de un stream vacío.
 */
import { createOpenAIToMessagesState, openaiToMessagesResponse } from '../translators/index.ts'

type JsonRecord = Record<string, unknown>

const DATA_PREFIX = 'data:'
const DONE_MARKER = '[DONE]'

class UpstreamStreamError extends Error {}

/** El texto de cada línea `data:` del stream, hasta `[DONE]` o el final. */
async function* dataLinesOf(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const decoder = new TextDecoder()
  let pending = ''
  for await (const chunk of body) {
    pending += decoder.decode(chunk, { stream: true })
    const lines = pending.split('\n')
    pending = lines.pop() ?? ''
    for (const line of lines) if (line.startsWith(DATA_PREFIX)) yield line.slice(DATA_PREFIX.length).trim()
  }
  if (pending.startsWith(DATA_PREFIX)) yield pending.slice(DATA_PREFIX.length).trim()
}

function parsedChunk(data: string, source: string): JsonRecord {
  try {
    return JSON.parse(data) as JsonRecord
  } catch {
    throw new UpstreamStreamError(`${source} emitió un chunk SSE que no es JSON: ${data.slice(0, 200)}`)
  }
}

async function* translatedEvents(body: ReadableStream<Uint8Array> | null, source: string): AsyncGenerator<JsonRecord> {
  if (!body) throw new UpstreamStreamError(`${source} respondió sin cuerpo`)
  const state = createOpenAIToMessagesState()
  let chunks = 0
  for await (const data of dataLinesOf(body)) {
    if (data === DONE_MARKER) break
    chunks += 1
    yield* openaiToMessagesResponse(parsedChunk(data, source), state) ?? []
  }
  if (chunks === 0) throw new UpstreamStreamError(`${source} terminó el stream sin ningún chunk SSE`)
  yield* openaiToMessagesResponse(null, state) ?? []
}

function errorEvent(message: string): JsonRecord {
  return { type: 'error', error: { type: 'api_error', message } }
}

export async function* messagesEventsFromOpenAISse(body: ReadableStream<Uint8Array> | null, source: string): AsyncGenerator<JsonRecord> {
  try {
    yield* translatedEvents(body, source)
  } catch (error) {
    const message = error instanceof UpstreamStreamError ? error.message : `${source} cortó el stream: ${error instanceof Error ? error.message : String(error)}`
    yield errorEvent(message)
  }
}
