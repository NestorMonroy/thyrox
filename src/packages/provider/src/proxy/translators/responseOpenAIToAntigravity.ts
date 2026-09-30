/**
 * Una respuesta OpenAI Chat Completions en la forma de cloudcode que espera
 * el IDE Antigravity: `{ response: { candidates: [{ content: { role: 'model',
 * parts } , finishReason }], usageMetadata, modelVersion, responseId } }`.
 *
 * Con stream, cada trozo se traduce aparte con un estado compartido: el
 * razonamiento va como parte `thought`, el texto como parte de texto, y las
 * llamadas a herramienta se acumulan y salen UNA vez, completas, al llegar el
 * `finish_reason` —OpenAI reparte sus argumentos entre trozos—. Sin stream,
 * el mensaje entero produce la misma forma.
 *
 * Porte de `omniroute: open-sse/translator/response/openai-to-antigravity.ts` y de
 * `convertOpenAINonStreamingToGeminiFamily` en `open-sse/handlers/responseTranslator.ts` (MIT).
 */
type JsonRecord = Record<string, unknown>

interface AntigravityCandidate {
  content: { role: string; parts: JsonRecord[] }
  finishReason?: string
  index?: number
}

interface AntigravityUsageMetadata {
  promptTokenCount: number
  candidatesTokenCount: number
  totalTokenCount: number
  thoughtsTokenCount?: number
  cachedContentTokenCount?: number
}

interface AccumulatedToolCall {
  id: string
  name: string
  arguments: string
}

/** Lo que un stream arrastra de un trozo al siguiente. */
export interface OpenAIToAntigravityState {
  toolCalls?: Record<number, AccumulatedToolCall>
  responseId?: string
  modelVersion?: string
  usage?: JsonRecord
}

const FINISH_REASONS: Record<string, string> = {
  stop: 'STOP',
  length: 'MAX_TOKENS',
  tool_calls: 'STOP',
  content_filter: 'SAFETY',
}

function finishReasonOf(reason: unknown): string {
  return FINISH_REASONS[String(reason)] ?? 'STOP'
}

function parseArgs(text: unknown): unknown {
  if (typeof text !== 'string') return text && typeof text === 'object' ? text : {}
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

function usageMetadataOf(usage: JsonRecord): AntigravityUsageMetadata {
  const prompt = Number(usage.prompt_tokens) || 0
  const completion = Number(usage.completion_tokens) || 0
  const metadata: AntigravityUsageMetadata = {
    promptTokenCount: prompt,
    candidatesTokenCount: completion,
    totalTokenCount: Number(usage.total_tokens) || prompt + completion,
  }
  const reasoningTokens = (usage.completion_tokens_details as JsonRecord | undefined)?.reasoning_tokens
  if (reasoningTokens) metadata.thoughtsTokenCount = Number(reasoningTokens)
  const cachedTokens = (usage.prompt_tokens_details as JsonRecord | undefined)?.cached_tokens
  if (cachedTokens) metadata.cachedContentTokenCount = Number(cachedTokens)
  return metadata
}

function accumulateToolCalls(state: OpenAIToAntigravityState, deltas: JsonRecord[]): void {
  state.toolCalls ??= {}
  for (const delta of deltas) {
    const index = Number(delta.index ?? 0)
    const accumulated = (state.toolCalls[index] ??= { id: '', name: '', arguments: '' })
    const fn = (delta.function ?? {}) as JsonRecord
    if (delta.id) accumulated.id = String(delta.id)
    if (fn.name) accumulated.name += String(fn.name)
    if (fn.arguments) accumulated.arguments += String(fn.arguments)
  }
}

export interface AntigravityResponse {
  candidates: AntigravityCandidate[]
  modelVersion?: string
  responseId?: string
  usageMetadata?: AntigravityUsageMetadata
}

/** Un trozo SSE de OpenAI como evento de cloudcode, o `null` si no hay nada que emitir todavía. */
export function openaiToAntigravityResponse(chunk: JsonRecord | null, state: OpenAIToAntigravityState): { response: AntigravityResponse } | null {
  if (!chunk) return null
  const choice = (chunk.choices as JsonRecord[] | undefined)?.[0]
  if (!choice) {
    if (chunk.usage) state.usage = chunk.usage as JsonRecord
    return null
  }

  const delta = (choice.delta ?? {}) as JsonRecord
  const finishReason = choice.finish_reason
  state.responseId ??= (chunk.id as string | undefined) || `resp_${Date.now()}`
  state.modelVersion ??= (chunk.model as string | undefined) || ''

  const parts: JsonRecord[] = []
  if (delta.reasoning_content) parts.push({ thought: true, text: delta.reasoning_content })
  if (delta.content) parts.push({ text: delta.content })
  if (Array.isArray(delta.tool_calls)) {
    accumulateToolCalls(state, delta.tool_calls as JsonRecord[])
    // Los argumentos siguen llegando: se espera al finish_reason.
    if (parts.length === 0 && !finishReason) return null
  }
  if (finishReason) {
    for (const call of Object.values(state.toolCalls ?? {})) {
      parts.push({ functionCall: { name: call.name, args: parseArgs(call.arguments) } })
    }
  }
  if (parts.length === 0 && !finishReason) return null
  if (parts.length === 0) parts.push({ text: '' })

  const candidate: AntigravityCandidate = { content: { role: 'model', parts } }
  if (finishReason) candidate.finishReason = finishReasonOf(finishReason)
  const response: AntigravityResponse = { candidates: [candidate], modelVersion: state.modelVersion, responseId: state.responseId }
  const usage = (chunk.usage as JsonRecord | undefined) ?? state.usage
  if (usage) response.usageMetadata = usageMetadataOf(usage)
  return { response }
}

/** Los campos donde un mensaje OpenAI puede traer su razonamiento, en orden. */
const REASONING_FIELDS = ['reasoning_content', 'reasoning', 'reasoning_text', 'thinking', 'thought'] as const

function reasoningTextOf(message: JsonRecord): string {
  for (const field of REASONING_FIELDS) {
    const value = message[field]
    if (typeof value === 'string' && value) return value
  }
  return ''
}

/** Un `chat.completion` entero como respuesta de cloudcode; lo que no parezca OpenAI se devuelve tal cual. */
export function openaiCompletionToAntigravity(completion: JsonRecord): JsonRecord {
  const choices = completion.choices
  if (!Array.isArray(choices) && completion.object !== 'chat.completion') return completion
  const choice = ((Array.isArray(choices) ? choices[0] : undefined) ?? {}) as JsonRecord
  const message = (choice.message ?? {}) as JsonRecord

  const parts: JsonRecord[] = []
  const reasoning = reasoningTextOf(message)
  if (reasoning) parts.push({ text: reasoning, thought: true })
  if (typeof message.content === 'string' && message.content) parts.push({ text: message.content })
  for (const call of Array.isArray(message.tool_calls) ? (message.tool_calls as JsonRecord[]) : []) {
    const fn = (call.function ?? {}) as JsonRecord
    parts.push({ functionCall: { name: String(fn.name ?? ''), args: parseArgs(fn.arguments) } })
  }
  if (parts.length === 0) parts.push({ text: '' })

  return {
    response: {
      candidates: [{ content: { role: 'model', parts }, finishReason: finishReasonOf(choice.finish_reason ?? 'stop'), index: 0 }],
      usageMetadata: usageMetadataOf((completion.usage ?? {}) as JsonRecord),
      modelVersion: typeof completion.model === 'string' ? completion.model : 'unknown',
      responseId: typeof completion.id === 'string' ? completion.id : `resp_${Date.now()}`,
    },
  }
}
