/**
 * El sobre cloudcode del IDE Antigravity como petición OpenAI Chat
 * Completions: `{ model, project, reasoningEffortOverride?, request: {
 * contents, systemInstruction, tools, generationConfig } }` → `{ model,
 * messages, tools, max_tokens, … }`.
 *
 * - El pensamiento (`thought: true`) va a `reasoning_content`; una parte con
 *   `thoughtSignature` es texto normal tras pensar. Un texto vacío se omite:
 *   el upstream rechaza bloques de contenido vacíos.
 * - `functionCall`/`functionResponse` se vuelven `tool_calls` y mensajes
 *   `tool`, emparejados por `geminiToolCallIds`. Un resultado sin llamada se
 *   retira con `fixToolPairs`: el IDE puede mandar un historial truncado.
 * - El presupuesto de pensamiento se vuelve `reasoning_effort`, salvo que el
 *   alias del MITM fije uno (`reasoningEffortOverride`): ése gana, y `none`
 *   lo quita del todo.
 * - Los esquemas de herramienta van con los tipos en minúscula y sin las
 *   claves de Draft 2020-12 que el upstream no acepta, conservando `required`.
 *
 * Porte de `omniroute: open-sse/translator/request/antigravity-to-openai.ts` (MIT).
 */
import { normalizeReasoningEffort } from '@thyrox/agent/effort.js'

import { fixToolPairs } from '../context/contextManager.ts'
import { createGeminiToolCallIdPairing, type GeminiToolCallIdPairing } from './geminiToolCallIds.ts'
import { adjustMaxTokens } from './requestMessagesToOpenAI.ts'

type JsonRecord = Record<string, unknown>

interface GeminiPart {
  text?: string
  thought?: boolean
  thoughtSignature?: string
  inlineData?: { mimeType?: string; data?: string }
  functionCall?: { id?: string; name?: string; args?: unknown }
  functionResponse?: { id?: string; name?: string; response?: unknown }
}

interface GeminiContent {
  role?: string
  parts?: GeminiPart[]
}

/** Los presupuestos de pensamiento que separan un nivel del siguiente. */
const LOW_EFFORT_MAX_BUDGET = 2048
const MEDIUM_EFFORT_MAX_BUDGET = 16384

function effortFromBudget(budget: number): string | undefined {
  if (budget <= 0) return undefined
  if (budget <= LOW_EFFORT_MAX_BUDGET) return 'low'
  if (budget <= MEDIUM_EFFORT_MAX_BUDGET) return 'medium'
  return 'high'
}

function applyGenerationConfig(result: JsonRecord, req: JsonRecord, effortOverride: string | undefined): void {
  const config = req.generationConfig as JsonRecord | undefined
  if (config) {
    if (config.maxOutputTokens) result.max_tokens = adjustMaxTokens({ max_tokens: config.maxOutputTokens, tools: req.tools })
    if (config.temperature !== undefined) result.temperature = config.temperature
    if (config.topP !== undefined) result.top_p = config.topP
    if (config.topK !== undefined) result.top_k = config.topK
    const thinking = config.thinkingConfig as { thinkingBudget?: number } | undefined
    const derived = effortOverride === undefined && thinking ? effortFromBudget(thinking.thinkingBudget || 0) : undefined
    if (derived) result.reasoning_effort = derived
  }
  if (effortOverride === 'none') delete result.reasoning_effort
  else if (effortOverride !== undefined) result.reasoning_effort = effortOverride
}

function extractText(instruction: unknown): string {
  if (typeof instruction === 'string') return instruction
  const parts = (instruction as GeminiContent | undefined)?.parts
  return Array.isArray(parts) ? parts.map(p => p.text || '').join('') : ''
}

/** Un único bloque de texto va como cadena; varios, como arreglo de partes. */
function contentOf(textParts: JsonRecord[]): unknown {
  return textParts.length === 1 && textParts[0]!.type === 'text' ? textParts[0]!.text : textParts
}

function assistantMessage(role: string, textParts: JsonRecord[], reasoning: string, toolCalls: JsonRecord[]): JsonRecord {
  const message: JsonRecord = { role }
  if (textParts.length > 0) message.content = contentOf(textParts)
  if (reasoning) message.reasoning_content = reasoning
  if (toolCalls.length > 0) message.tool_calls = toolCalls
  return message
}

/** Un `content` de Gemini como uno o varios mensajes de OpenAI, o nada. */
function convertContent(content: GeminiContent, toolCallIds: GeminiToolCallIdPairing): JsonRecord | JsonRecord[] | null {
  const role = content.role === 'model' ? 'assistant' : content.role === 'user' ? 'user' : (content.role ?? 'user')
  if (!Array.isArray(content.parts)) return null

  const textParts: JsonRecord[] = []
  const toolCalls: JsonRecord[] = []
  const toolResults: JsonRecord[] = []
  let reasoning = ''

  for (const part of content.parts) {
    if (part.thought === true && part.text) {
      reasoning += part.text
      continue
    }
    if (part.thoughtSignature && part.text !== undefined) {
      if (part.text) textParts.push({ type: 'text', text: part.text })
      continue
    }
    if (part.text !== undefined && part.text !== '') textParts.push({ type: 'text', text: part.text })
    if (part.inlineData) {
      textParts.push({ type: 'image_url', image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` } })
    }
    if (part.functionCall) {
      toolCalls.push({
        id: toolCallIds.callId(part.functionCall),
        type: 'function',
        function: { name: part.functionCall.name, arguments: JSON.stringify(part.functionCall.args || {}) },
      })
    }
    if (part.functionResponse) {
      const response = part.functionResponse.response
      const payload = response && typeof response === 'object' && 'result' in response ? (response as JsonRecord).result : (response ?? {})
      toolResults.push({ role: 'tool', tool_call_id: toolCallIds.responseId(part.functionResponse), content: JSON.stringify(payload) })
    }
  }

  // Los resultados pueden venir junto con llamadas, texto o pensamiento del
  // mismo contenido: se emiten los resultados Y el mensaje del asistente.
  if (toolResults.length > 0) {
    const accompanied = toolCalls.length > 0 || textParts.length > 0 || reasoning
    return accompanied ? [...toolResults, assistantMessage('assistant', textParts, reasoning, toolCalls)] : toolResults
  }
  if (toolCalls.length > 0) return assistantMessage('assistant', textParts, reasoning, toolCalls)
  if (textParts.length > 0 || reasoning) return assistantMessage(role, textParts, reasoning, [])
  return null
}

function convertTools(tools: unknown): JsonRecord[] {
  const converted: JsonRecord[] = []
  for (const tool of Array.isArray(tools) ? (tools as JsonRecord[]) : []) {
    for (const declaration of Array.isArray(tool.functionDeclarations) ? (tool.functionDeclarations as JsonRecord[]) : []) {
      converted.push({
        type: 'function',
        function: {
          name: declaration.name,
          description: declaration.description || '',
          parameters: cleanSchemaPreservingRequired(declaration.parameters) || { type: 'object', properties: {} },
        },
      })
    }
  }
  return converted
}

let generatedCallSequence = 0

function newCallId(): string {
  generatedCallSequence += 1
  return `call_${Date.now()}_${generatedCallSequence.toString(36)}`
}

export interface OpenAIChatRequest {
  model: string
  messages: JsonRecord[]
  stream: boolean
  tools?: JsonRecord[]
  [key: string]: unknown
}

export function antigravityToOpenAIRequest(model: string, body: JsonRecord, stream: boolean): OpenAIChatRequest {
  const req = ((body.request as JsonRecord | undefined) ?? body) as JsonRecord
  const result: OpenAIChatRequest = { model, messages: [], stream }
  // El esfuerzo del alias viaja al nivel de `model`, hermano de `.request`.
  applyGenerationConfig(result, req, normalizeReasoningEffort(body.reasoningEffortOverride))

  const messages = result.messages
  const systemText = req.systemInstruction ? extractText(req.systemInstruction) : ''
  if (systemText) messages.push({ role: 'system', content: systemText })

  if (Array.isArray(req.contents)) {
    const toolCallIds = createGeminiToolCallIdPairing(newCallId)
    for (const content of req.contents as GeminiContent[]) {
      toolCallIds.beginContent(content)
      const converted = convertContent(content, toolCallIds)
      if (Array.isArray(converted)) messages.push(...converted)
      else if (converted) messages.push(converted)
    }
  }

  if (Array.isArray(req.tools)) result.tools = convertTools(req.tools)
  result.messages = fixToolPairs(messages)
  return result
}

/** Los tipos del esquema en minúscula, sin `enumDescriptions`, recursivamente. */
function normalizeSchemaTypes(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') return schema
  const result = (Array.isArray(schema) ? [...schema] : { ...(schema as JsonRecord) }) as JsonRecord
  if (typeof result.type === 'string') result.type = result.type.toLowerCase()
  delete result.enumDescriptions
  if (result.properties && typeof result.properties === 'object') {
    result.properties = Object.fromEntries(
      Object.entries(result.properties as JsonRecord).map(([key, value]) => [key, normalizeSchemaTypes(value)]),
    )
  }
  if (result.items) result.items = normalizeSchemaTypes(result.items)
  return result
}

/** Las claves de Draft 2020-12 que el upstream de Antigravity no acepta. */
const DRAFT_META_KEYS = new Set([
  '$schema',
  '$defs',
  'definitions',
  '$ref',
  '$comment',
  'const',
  'additionalProperties',
  'propertyNames',
  'patternProperties',
  'title',
])

function stripDraftMeta(value: unknown): void {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    for (const item of value) stripDraftMeta(item)
    return
  }
  const record = value as JsonRecord
  for (const key of Object.keys(record)) if (DRAFT_META_KEYS.has(key) || key.startsWith('x-')) delete record[key]
  for (const child of Object.values(record)) stripDraftMeta(child)
}

/** En cada nodo, `required` sólo nombra propiedades que siguen existiendo; vacío, se retira. */
function preserveRequired(value: unknown): void {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    for (const item of value) preserveRequired(item)
    return
  }
  const record = value as JsonRecord
  if (Array.isArray(record.required) && record.properties && typeof record.properties === 'object') {
    const properties = record.properties as JsonRecord
    const valid = (record.required as unknown[]).filter(
      field => typeof field === 'string' && Object.prototype.hasOwnProperty.call(properties, field),
    )
    if (valid.length === 0) delete record.required
    else record.required = valid
  }
  for (const child of Object.values(record)) preserveRequired(child)
}

function cleanSchemaPreservingRequired(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') return schema
  const normalized = normalizeSchemaTypes(structuredClone(schema))
  stripDraftMeta(normalized)
  preserveRequired(normalized)
  return normalized
}
