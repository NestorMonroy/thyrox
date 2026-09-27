/**
 * Traductor de petición OpenAI Chat Completions → Mensajes Messages.
 *
 * Porte de `omniroute: open-sse/translator/request/openai-to-claude.ts`
 * (843 líneas). Cubre los mecanismos centrales — `tool_calls`⇄`tool_use`,
 * mensaje `system`/`developer`⇄`system`, `reasoning_effort`⇄
 * `thinking.budget_tokens` — más la adyacencia de `tool_result`, el prefijo
 * de nombre de herramienta de Mensajes OAuth y la inyección de
 * `response_format` como instrucción de sistema.
 *
 * pendiente: la fuente depende de un registro de capacidades por modelo
 * (`config/providerModels.ts`, `src/shared/constants/modelSpecs.ts`,
 * `config/defaultThinkingSignature.ts`) que vive fuera de `translator/` y
 * cuyo porte excede el alcance de esta tarea. Se declara cada pieza que
 * queda fuera, en el punto donde la fuente la usa:
 *
 * - `supportsMessagesMaxEffort`/`supportsXHighEffort`/`isAdaptiveThinkingOnly`/
 *   `getDefaultThinkingBudget` — exigen la tabla de capacidades por modelo;
 *   aquí `reasoning_effort` se mapea siempre a la forma manual
 *   (`type:"enabled"`+`budget_tokens`), nunca a `type:"adaptive"`.
 * - `fitThinkingToMaxTokens` (el tope de salida por modelo) — se sustituye
 *   por un ajuste local sin tabla de modelos: `max_tokens` sube para quedar
 *   por encima de `budget_tokens` con margen, sin comparar contra ningún
 *   techo por modelo.
 * - `applyKimiCodingThinking` (ruta específica del proveedor Kimi Coding) —
 *   no se porta; ninguna petición se enruta como Kimi Coding en este árbol.
 * - `DEFAULT_THINKING_CLAUDE_SIGNATURE` real — se usa un marcador propio
 *   (ver `PLACEHOLDER_THINKING_SIGNATURE`), declarado como tal.
 * - `openaiToMessagesRequestForAntigravity` (variante sin prefijo de
 *   herramienta para el formato Antigravity) — formato ajeno a este porte.
 */

import { normalizeMessagesToolInputSchema, sanitizeToolId, createDefaultMessagesCacheControl } from './schemaUtils.js'
import { openAiImagePartToMessagesBlock, normalizeToolResultImages, sanitizeToolResultId } from './messagesImageBlocks.js'
import { enforceToolResultAdjacency } from './toolResultAdjacency.js'

type JsonRecord = Record<string, unknown>

const DEFAULT_MAX_TOKENS = 64000
const DEFAULT_MIN_TOKENS = 32000

function adjustMaxTokens(body: JsonRecord): number {
  const requestedMaxTokens = (body.max_tokens ?? body.max_completion_tokens) as number | undefined
  let maxTokens = requestedMaxTokens || DEFAULT_MAX_TOKENS
  if (Array.isArray(body.tools) && body.tools.length > 0) {
    if (maxTokens < DEFAULT_MIN_TOKENS) maxTokens = DEFAULT_MIN_TOKENS
  }
  return Math.max(1, maxTokens)
}

/** Prefijo de nombre de herramienta para Mensajes OAuth (evita colisiones). */
export const CLAUDE_OAUTH_TOOL_PREFIX = 'proxy_'
const CLAUDE_TOOL_CHOICE_REQUIRED = 'an' + 'y'

/**
 * pendiente: marcador propio — la fuente usa
 * `config/defaultThinkingSignature.ts::DEFAULT_THINKING_CLAUDE_SIGNATURE`,
 * un valor de firma real que no se porta (vive fuera de `translator/`).
 */
const PLACEHOLDER_THINKING_SIGNATURE = 'thyrox_placeholder_signature'

const REASONING_EFFORT_BUDGETS: Record<string, number> = {
  low: 1024,
  medium: 10240,
  high: 131072,
  max: 131072,
}

type MessagesContentBlock = Record<string, unknown>
type MessagesApiMessage = { role: string; content: MessagesContentBlock[] }
type MessagesSystemBlock = { type: string; text: string; cache_control?: { type: string; ttl?: string } }
type MessagesTool = {
  name: string
  description: string
  input_schema: Record<string, unknown>
  cache_control?: { type: string; ttl?: string }
  defer_loading?: boolean
}

/**
 * Porte literal de `openai-to-claude.ts::stripEmptyTextBlocks` (T02).
 * Anthropic da 400 ("text content blocks must be non-empty") ante un bloque
 * de texto con `text: ""`; recursa dentro de un `tool_result` anidado.
 */
export function stripEmptyTextBlocks(content: unknown[] | undefined): unknown[] {
  if (!Array.isArray(content)) return content ?? []
  return content
    .filter((block: unknown) => {
      if (block && typeof block === 'object' && (block as JsonRecord).type === 'text') {
        const text = (block as JsonRecord).text
        if (text === '' || text == null) return false
      }
      return true
    })
    .map((block: unknown) => {
      if (
        block &&
        typeof block === 'object' &&
        (block as JsonRecord).type === 'tool_result' &&
        Array.isArray((block as JsonRecord).content)
      ) {
        return {
          ...(block as JsonRecord),
          content: stripEmptyTextBlocks((block as JsonRecord).content as unknown[]),
        }
      }
      return block
    })
}

/** Porte literal de `openai-to-claude.ts::normalizeContentToString` (T15). */
export function normalizeContentToString(content: string | unknown[] | null | undefined): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return (content as JsonRecord[])
      .filter((b) => b.type === 'text')
      .map((b) => String(b.text ?? ''))
      .join('\n')
  }
  return ''
}

/**
 * Ajuste local de presupuesto de pensamiento, sin tabla de techos por modelo
 * (ver la nota "pendiente" de cabecera). Sube `max_tokens` para que quede
 * por encima de `budget_tokens` con un margen fijo.
 */
function fitThinkingBudgetLocally(
  maxTokens: number,
  thinking: JsonRecord | undefined
): { maxTokens: number; thinking: JsonRecord | undefined } {
  if (!thinking || thinking.type === 'disabled') return { maxTokens, thinking }
  const budget = typeof thinking.budget_tokens === 'number' ? thinking.budget_tokens : 0
  const margin = 8192
  const fittedMaxTokens = budget > 0 ? Math.max(maxTokens, budget + margin) : maxTokens
  return { maxTokens: fittedMaxTokens, thinking }
}

/** Porte de `openai-to-claude.ts::openaiToMessagesRequest`. */
export function openaiToMessagesRequest(
  model: string,
  body: JsonRecord,
  stream?: unknown,
  credentials: unknown = null
): JsonRecord {
  const disableToolPrefix = body?._disableToolPrefix === true
  const toolNameMap = new Map<string, string>()

  const result: {
    [key: string]: unknown
    model: string
    max_tokens: number
    stream: unknown
    messages: MessagesApiMessage[]
    system?: MessagesSystemBlock[]
    tools?: MessagesTool[]
    tool_choice?: Record<string, unknown> | string
    thinking?: Record<string, unknown>
    _toolNameMap?: Map<string, string>
  } = {
    model,
    max_tokens: adjustMaxTokens(body),
    stream,
    messages: [],
  }

  // Mensajes rechaza `temperature` mientras el pensamiento extendido está
  // activo. Se detecta también por el nombre del modelo (familias 4.x que
  // fuerzan pensamiento vía Mensajes OAuth sin declarar `body.thinking`).
  const modelForcesThinking = /claude-(?:opus|sonnet)-4/i.test(String(model))
  if (body.temperature !== undefined && !modelForcesThinking) {
    result.temperature = body.temperature
  }
  if (body.temperature === undefined && body.top_p !== undefined) {
    result.top_p = body.top_p
  }
  if (body.stop !== undefined) {
    result.stop_sequences = Array.isArray(body.stop) ? body.stop : [body.stop]
  }

  // Configuración de pensamiento — antes de convertir los mensajes, para que
  // la conversión sepa si el pensamiento extendido está activo en ESTA
  // petición (gobierna la inyección de `redacted_thinking` de repuesto).
  if (body.thinking) {
    const thinkingRecord = body.thinking as JsonRecord
    result.thinking = {
      type: thinkingRecord.type || 'enabled',
      ...(thinkingRecord.budget_tokens ? { budget_tokens: thinkingRecord.budget_tokens } : {}),
      ...(thinkingRecord.max_tokens ? { max_tokens: thinkingRecord.max_tokens } : {}),
    }
  } else if (body.reasoning_effort) {
    const normalizedEffort = String(body.reasoning_effort).toLowerCase()
    const budget = REASONING_EFFORT_BUDGETS[normalizedEffort]
    if (budget !== undefined && budget > 0) {
      result.thinking = { type: 'enabled', budget_tokens: budget }
    }
  }

  const fitted = fitThinkingBudgetLocally(Number(result.max_tokens) || 0, result.thinking)
  result.max_tokens = fitted.maxTokens
  if (fitted.thinking === undefined) {
    delete result.thinking
  } else {
    result.thinking = fitted.thinking
  }

  if (result.thinking && result.temperature !== undefined) {
    delete result.temperature
  }

  const thinkingEnabledForRequest = result.thinking !== undefined && result.thinking.type !== 'disabled'

  const systemParts: string[] = []

  if (Array.isArray(body.messages)) {
    // El rol "developer" (API de Responses de OpenAI) también es sistema.
    for (const msg of body.messages as JsonRecord[]) {
      if (msg.role === 'system' || msg.role === 'developer') {
        systemParts.push(
          typeof msg.content === 'string' ? msg.content : normalizeContentToString(msg.content as unknown[])
        )
      }
    }

    const nonSystemMessages = (body.messages as JsonRecord[]).filter(
      (m) => m.role !== 'system' && m.role !== 'developer'
    )

    // CRÍTICO: un `tool_result` va en un mensaje SEPARADO, inmediatamente
    // tras el `tool_use` que responde.
    let currentRole: string | undefined
    let currentParts: MessagesContentBlock[] = []

    const flushCurrentMessage = () => {
      if (currentRole && currentParts.length > 0) {
        result.messages.push({ role: currentRole, content: currentParts })
        currentParts = []
      }
    }

    for (const msg of nonSystemMessages) {
      const newRole = msg.role === 'user' || msg.role === 'tool' ? 'user' : 'assistant'
      const blocks = getContentBlocksFromMessage(msg, toolNameMap, disableToolPrefix, thinkingEnabledForRequest)
      const hasToolUse = blocks.some((b) => b.type === 'tool_use')
      const hasToolResult = blocks.some((b) => b.type === 'tool_result')

      if (hasToolResult) {
        const toolResultBlocks = blocks.filter((b) => b.type === 'tool_result')
        const otherBlocks = blocks.filter((b) => b.type !== 'tool_result')

        flushCurrentMessage()
        if (toolResultBlocks.length > 0) result.messages.push({ role: 'user', content: toolResultBlocks })
        if (otherBlocks.length > 0) {
          currentRole = newRole
          currentParts.push(...otherBlocks)
        }
        continue
      }

      if (currentRole !== newRole) {
        flushCurrentMessage()
        currentRole = newRole
      }
      currentParts.push(...blocks)
      if (hasToolUse) flushCurrentMessage()
    }
    flushCurrentMessage()

    result.messages = result.messages.filter((msg) => {
      if (msg.role === 'assistant' && Array.isArray(msg.content) && msg.content.length === 0) return false
      return true
    })

    result.messages = enforceToolResultAdjacency(result.messages)

    for (let i = result.messages.length - 1; i >= 0; i--) {
      const message = result.messages[i] as MessagesApiMessage
      if (message.role === 'assistant' && Array.isArray(message.content) && message.content.length > 0) {
        const lastBlock = message.content[message.content.length - 1] as JsonRecord
        if (lastBlock) {
          lastBlock.cache_control = { type: 'ephemeral' }
          break
        }
      }
    }
  }

  if (Array.isArray(body.tools)) {
    result.tools = (body.tools as JsonRecord[])
      .map((tool) => {
        const toolData = (tool.function ?? tool) as JsonRecord
        const originalName = typeof toolData.name === 'string' ? toolData.name.trim() : ''
        if (!originalName) return null

        const toolName = disableToolPrefix ? originalName : CLAUDE_OAUTH_TOOL_PREFIX + originalName
        if (!disableToolPrefix) toolNameMap.set(toolName, originalName)

        const rawSchema =
          (toolData.parameters as JsonRecord) ||
          (toolData.input_schema as JsonRecord) || { type: 'object', properties: {}, required: [] }
        const withProperties =
          rawSchema.type === 'object' && !rawSchema.properties ? { ...rawSchema, properties: {} } : rawSchema
        const normalizedSchema = normalizeMessagesToolInputSchema(withProperties)

        return { name: toolName, description: toolData.description || '', input_schema: normalizedSchema }
      })
      .filter((tool): tool is MessagesTool => Boolean(tool))

    result.tools = result.tools.filter((tool) => tool.name && tool.name.trim())

    for (let i = result.tools.length - 1; i >= 0; i--) {
      if (!result.tools[i]?.defer_loading) {
        ;(result.tools[i] as MessagesTool).cache_control = createDefaultMessagesCacheControl(
          (credentials as JsonRecord | null)?._provider as string | undefined
        )
        break
      }
    }
  }

  if (body.tool_choice) result.tool_choice = convertOpenAIToolChoice(body.tool_choice)

  // `response_format` no tiene equivalente nativo en Mensajes: se inyecta como
  // instrucción de sistema.
  if (body.response_format) {
    const fmt = body.response_format as JsonRecord
    if (fmt.type === 'json_schema' && (fmt.json_schema as JsonRecord)?.schema) {
      const schemaJson = JSON.stringify((fmt.json_schema as JsonRecord).schema, null, 2)
      systemParts.push(
        `You must respond with valid JSON that strictly follows this JSON schema:\n\`\`\`json\n${schemaJson}\n\`\`\`\nRespond ONLY with the JSON object, no other text.`
      )
    } else if (fmt.type === 'json_object') {
      systemParts.push('You must respond with valid JSON. Respond ONLY with a JSON object, no other text.')
    }
  }

  if (systemParts.length > 0) {
    const systemText = systemParts.join('\n')
    const systemBlock: MessagesSystemBlock = {
      type: 'text',
      text: systemText,
      cache_control: createDefaultMessagesCacheControl((credentials as JsonRecord | null)?._provider as string | undefined),
    }
    if (Array.isArray(body.system)) {
      result.system = [...(body.system as MessagesSystemBlock[]), systemBlock]
    } else if (typeof body.system === 'string' && body.system.length > 0) {
      result.system = [{ type: 'text', text: body.system }, systemBlock]
    } else {
      result.system = [systemBlock]
    }
  } else if (body.system) {
    result.system = Array.isArray(body.system)
      ? (body.system as MessagesSystemBlock[])
      : [{ type: 'text', text: String(body.system) }]
  }

  if (toolNameMap.size > 0) result._toolNameMap = toolNameMap

  // Guarda de mensajes vacíos: la API de Mensajes de Mensajes rechaza un
  // arreglo `messages` vacío. Ocurre cuando la petición entrante sólo traía
  // turnos `system`/`developer` (todos elevados a `result.system` arriba).
  if (result.messages.length === 0) {
    result.messages.push({ role: 'user', content: [{ type: 'text', text: '.' }] })
  }

  return result
}

/** Porte de `openai-to-claude.ts::getContentBlocksFromMessage`. */
function getContentBlocksFromMessage(
  msg: JsonRecord,
  // La firma de la fuente lo recibe y su cuerpo no lo lee; se conserva la posición.
  _toolNameMap: Map<string, string> = new Map(),
  disableToolPrefix = false,
  thinkingEnabledForRequest = false
): MessagesContentBlock[] {
  const blocks: MessagesContentBlock[] = []

  if (msg.role === 'tool') {
    const sanitizedToolUseId = sanitizeToolResultId(msg.tool_call_id)
    if (!sanitizedToolUseId) return blocks
    const toolContent = normalizeToolResultImages(
      Array.isArray(msg.content) ? stripEmptyTextBlocks(msg.content as unknown[]) : msg.content
    )
    blocks.push({ type: 'tool_result', tool_use_id: sanitizedToolUseId, content: toolContent })
  } else if (msg.role === 'user') {
    if (typeof msg.content === 'string') {
      if (msg.content) blocks.push({ type: 'text', text: msg.content })
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content as JsonRecord[]) {
        if (part.type === 'text' && part.text) {
          blocks.push({ type: 'text', text: part.text })
        } else if (part.type === 'tool_result') {
          if (!part.tool_use_id) continue
          const resultContent = normalizeToolResultImages(
            Array.isArray(part.content) ? stripEmptyTextBlocks(part.content as unknown[]) : part.content
          )
          blocks.push({
            type: 'tool_result',
            tool_use_id: sanitizeToolId(part.tool_use_id as string),
            content: resultContent,
            ...(part.is_error ? { is_error: part.is_error } : {}),
          })
        } else if (part.type === 'image_url' || part.type === 'image') {
          const imageBlock = openAiImagePartToMessagesBlock(part)
          if (imageBlock) blocks.push(imageBlock)
        } else if (part.type === 'file' && ((part.file as JsonRecord)?.file_data || (part.file as JsonRecord)?.data)) {
          const file = part.file as JsonRecord
          const fileData = file.file_data || file.data
          const fmatch = typeof fileData === 'string' ? fileData.match(/^data:([^;]+);base64,(.+)$/) : null
          if (fmatch) {
            const mediaType = fmatch[1] as string
            if (mediaType === 'application/pdf') {
              blocks.push({
                type: 'document',
                source: { type: 'base64', media_type: mediaType, data: fmatch[2] },
                ...(file.filename ? { title: file.filename } : {}),
              })
            } else if (mediaType.startsWith('image/')) {
              blocks.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: fmatch[2] } })
            }
          } else if (typeof fileData === 'string' && /^https?:\/\//i.test(fileData)) {
            blocks.push({
              type: 'document',
              source: { type: 'url', url: fileData },
              ...(file.filename ? { title: file.filename } : {}),
            })
          }
        }
      }
    }
  } else if (msg.role === 'assistant') {
    if (Array.isArray(msg.content)) {
      for (const part of msg.content as JsonRecord[]) {
        if (part.type === 'text' && part.text) {
          blocks.push({ type: 'text', text: part.text })
        } else if (part.type === 'thinking' || part.type === 'redacted_thinking') {
          // Un bloque de pensamiento sin firma reproducible (`signature`
          // ausente o vacía; `data` vacío en `redacted_thinking`) no puede
          // volver a Anthropic — se descarta en vez de fabricarle una firma,
          // porque una firma fabricada 400ea igual (#6953).
          if (part.type === 'thinking' && !part.signature) continue
          if (part.type === 'redacted_thinking' && part.data === '') continue
          blocks.push({ ...part, signature: part.signature || PLACEHOLDER_THINKING_SIGNATURE })
        } else if (part.type === 'tool_use') {
          if (part.name && (part.name as string).trim()) {
            blocks.push({ type: 'tool_use', id: sanitizeToolId(part.id as string), name: part.name, input: part.input })
          }
        }
      }
    } else if (msg.content) {
      const text = typeof msg.content === 'string' ? msg.content : extractTextContent(msg.content)
      if (text) blocks.push({ type: 'text', text })
    }

    if (Array.isArray(msg.tool_calls)) {
      for (const tc of msg.tool_calls as JsonRecord[]) {
        if (tc.type === 'function') {
          const fn = tc.function as JsonRecord
          const fnName = fn?.name as string | undefined
          if (!fnName || !fnName.trim()) continue

          const toolName = disableToolPrefix ? fnName : CLAUDE_OAUTH_TOOL_PREFIX + fnName
          blocks.push({
            type: 'tool_use',
            id: sanitizeToolId(tc.id as string),
            name: toolName,
            input: tryParseJSON(fn.arguments),
          })
        }
      }
    }

    // Marcador de repuesto para `reasoning_content` (formato de pensamiento
    // extendido de OpenAI) — SÓLO cuando el esquema de Anthropic realmente
    // lo exige: pensamiento activo en esta petición Y este turno de
    // asistente lleva un `tool_use` (Anthropic rechaza un turno `tool_use`
    // sin un bloque `thinking`/`redacted_thinking` previo cuando el
    // pensamiento está activo).
    const hasThinkingBlock = blocks.some((b) => b.type === 'thinking' || b.type === 'redacted_thinking')
    const hasToolUseBlock = blocks.some((b) => b.type === 'tool_use')
    if (msg.reasoning_content && thinkingEnabledForRequest && hasToolUseBlock && !hasThinkingBlock) {
      blocks.unshift({ type: 'redacted_thinking', data: PLACEHOLDER_THINKING_SIGNATURE })
    }
  }

  return blocks
}

/** Porte de `openai-to-claude.ts::convertOpenAIToolChoice`. */
function convertOpenAIToolChoice(choice: unknown): Record<string, unknown> | string {
  if (!choice) return { type: 'auto' }
  if (typeof choice === 'object' && (choice as JsonRecord).type) {
    const record = choice as JsonRecord
    if (record.type === 'function' && (record.function as JsonRecord)?.name) {
      return { type: 'tool', name: (record.function as JsonRecord).name }
    }
    if (record.type === 'auto') return { type: 'auto' }
    if (record.type === 'none') return { type: 'none' }
    if (record.type === 'required' || record.type === 'any') return { type: CLAUDE_TOOL_CHOICE_REQUIRED }
    if (record.type === 'tool' && record.name) return record
    return { type: 'auto' }
  }
  if (choice === 'auto') return { type: 'auto' }
  if (choice === 'none') return { type: 'none' }
  if (choice === 'required') return { type: CLAUDE_TOOL_CHOICE_REQUIRED }
  if (typeof choice === 'object' && (choice as JsonRecord).function) {
    return { type: 'tool', name: ((choice as JsonRecord).function as JsonRecord).name }
  }
  return { type: 'auto' }
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return (content as JsonRecord[])
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n')
  }
  return ''
}

/** Porte de `openai-to-claude.ts::tryParseJSON` (pasa el original si falla el parseo). */
function tryParseJSON(str: unknown): unknown {
  if (typeof str !== 'string') return str
  try {
    return JSON.parse(str)
  } catch {
    return str
  }
}
