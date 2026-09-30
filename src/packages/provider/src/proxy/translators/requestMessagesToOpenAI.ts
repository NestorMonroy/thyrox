/**
 * Traductor de petición Mensajes Messages → OpenAI Chat Completions.
 *
 * Porte de `omniroute: open-sse/translator/request/claude-to-openai.ts`
 * (603 líneas). Cubre los cuatro mecanismos centrales pedidos —
 * `tool_use`⇄`tool_calls`, `system`⇄mensaje `system`, `stop_reason`⇄
 * `finish_reason` (aquí, en su forma de petición: `thinking.budget_tokens`⇄
 * `reasoning_effort`) y los eventos SSE (en `responseMessagesToOpenAI.ts`) —
 * más el reagrupado de `tool_result`, el relleno de respuestas de
 * herramienta ausentes y la conversión de `tool_choice`.
 *
 * pendiente: las siguientes piezas de la fuente NO se portan, cada una
 * declarada con su porqué:
 *
 * - `preserveCacheControl` (marcadores `cache_control` de OpenAI para
 *   DashScope/Alibaba) — opt-in detrás de `credentials._preserveCacheControl`,
 *   ajeno al mecanismo central; añadirlo exige decidir su propio contrato de
 *   credenciales en este árbol.
 * - `OMNIROUTE_SYSTEM_INSTRUCTION_APPEND` (mitigación bilingüe de
 *   razonamiento) — es una variable de entorno DE OMNIROUTE; la regla 5 de
 *   esta tarea prohíbe introducir una nueva salvo que se llame `THYROX_*`, y
 *   esta no es nuestra a secas.
 * - el camino nativo de `web_search` para el formato `openai-responses`
 *   (`isMessagesServerWebSearchTool`, `convertMessagesServerWebSearchTool`,
 *   `shouldUseNativeResponsesWebSearch`) — pertenece a la API de Responses,
 *   no a Chat Completions, que es el único destino de este porte.
 */

type JsonRecord = Record<string, unknown>

const TOOL_CHOICE_ANY = ['a', 'n', 'y'].join('')
const DEFAULT_MAX_TOKENS = 64000
const DEFAULT_MIN_TOKENS = 32000

/**
 * Porte de `helpers/maxTokensHelper.ts::adjustMaxTokens`. Sube el `max_tokens`
 * mínimo cuando la petición declara herramientas, para que una llamada con
 * argumento grande (p. ej. escribir un archivo) no se trunque.
 */
export function adjustMaxTokens(body: JsonRecord): number {
  const requestedMaxTokens = (body.max_tokens ?? body.max_completion_tokens) as
    | number
    | undefined
  let maxTokens = requestedMaxTokens || DEFAULT_MAX_TOKENS

  if (Array.isArray(body.tools) && body.tools.length > 0) {
    if (maxTokens < DEFAULT_MIN_TOKENS) {
      maxTokens = DEFAULT_MIN_TOKENS
    }
  }

  return Math.max(1, maxTokens)
}

/**
 * Porte de `claude-to-openai.ts::stripAnthropicBillingHeader`. Anthropic
 * inyecta una línea `x-anthropic-billing-header: <valor>` al principio de
 * algunos prompts de sistema; rota por petición y, reenviada a un upstream
 * no-Anthropic, destruye el acierto de la caché de prompt.
 */
function stripAnthropicBillingHeader(text: unknown): string {
  if (typeof text !== 'string') return ''
  return text.replace(/^x-anthropic-billing-header:[^\n]*(?:\r?\n)?/i, '')
}

/**
 * Porte de `claude-to-openai.ts::normalizeToolSchema`. El modo estricto de
 * OpenAI exige `properties: {}` en un esquema de tipo objeto, incluso para
 * una herramienta sin argumentos; Anthropic/MCP puede omitirlo.
 */
function normalizeToolSchema(schema: unknown): Record<string, unknown> {
  const fallback = { type: 'object', properties: {} }
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return fallback
  const s = schema as Record<string, unknown>
  if (s.type === 'object' && !s.properties) {
    return { ...s, properties: {} }
  }
  return s
}

function normalizeOpenAIReasoningEffort(effort: unknown): string | undefined {
  if (typeof effort !== 'string') return undefined
  const normalized = effort.toLowerCase()
  return normalized || undefined
}

type MessagesApiMessage = { role: string; content: unknown }

/**
 * Convierte una petición Mensajes Messages a una petición OpenAI Chat
 * Completions. `credentials` sólo se lee aquí para el flag `_ensureUserTurn`
 * (gateways de la familia GLM); el resto de flags de la fuente están
 * declarados pendientes arriba.
 */
export function messagesToOpenAIRequest(
  model: string,
  body: JsonRecord,
  stream?: unknown,
  credentials: unknown = null
): JsonRecord {
  const result: {
    model: string
    messages: JsonRecord[]
    stream: unknown
    [key: string]: unknown
  } = {
    model,
    messages: [],
    stream,
  }

  if (body.max_tokens) {
    result.max_tokens = adjustMaxTokens(body)
  }

  if (body.temperature !== undefined) result.temperature = body.temperature
  if (body.top_p !== undefined) result.top_p = body.top_p
  if (body.stop_sequences !== undefined) result.stop = body.stop_sequences

  // Mensaje de sistema — se colapsa a una cadena única, unida por saltos de
  // línea cuando llega como arreglo de bloques (forma nativa de Anthropic).
  if (body.system) {
    const systemContent = Array.isArray(body.system)
      ? (body.system as JsonRecord[])
          .map((s) => stripAnthropicBillingHeader((s as JsonRecord)?.text ?? ''))
          .filter(Boolean)
          .join('\n')
      : stripAnthropicBillingHeader(body.system)

    if (systemContent) {
      result.messages.push({ role: 'system', content: systemContent })
    }
  }

  if (Array.isArray(body.messages)) {
    for (const msg of body.messages as MessagesApiMessage[]) {
      const converted = convertMessagesApiMessage(msg)
      if (!converted) continue

      // Un contexto de hook de thyrox (SessionStart/PreToolUse) puede
      // llegar como role:"system" a mitad del arreglo — válido para la API de
      // Mensajes de Anthropic, pero varios upstreams con forma OpenAI
      // rechazan un turno de sistema que no está en la posición 0. Se
      // degrada a "user" conservando el contenido byte a byte; el system de
      // índice 0 (el que este traductor ya puso arriba, o el que el cliente
      // puso primero) queda intacto.
      const demoteMidSystem = (out: JsonRecord) => {
        if (out.role === 'system' && result.messages.length > 0) out.role = 'user'
      }
      if (Array.isArray(converted)) {
        converted.forEach(demoteMidSystem)
        result.messages.push(...(converted as JsonRecord[]))
      } else {
        demoteMidSystem(converted as JsonRecord)
        result.messages.push(converted as JsonRecord)
      }
    }
  }

  // Reagrupa cada mensaje role:"tool" inmediatamente después del turno de
  // asistente cuyo tool_calls lo emitió (descartando huérfanos genuinos), y
  // luego rellena cualquier tool_call que quede sin respuesta.
  result.messages = regroupToolMessages(result.messages)
  fixMissingToolResponses(result.messages)

  // Gateways de la familia GLM (Z.AI/Zhipu) rechazan una petición cuyo
  // arreglo de mensajes no tiene NINGÚN turno role:"user" — thyrox
  // puede producir esa forma cuando cada turno de usuario entrante lleva
  // sólo bloques tool_result. Se activa con `credentials._ensureUserTurn`.
  const ensureUserTurn =
    credentials !== null &&
    typeof credentials === 'object' &&
    !Array.isArray(credentials) &&
    (credentials as JsonRecord)._ensureUserTurn === true
  if (ensureUserTurn && !result.messages.some((m) => m && m.role === 'user')) {
    result.messages.push({ role: 'user', content: '(continue)' })
  }

  if (Array.isArray(body.tools)) {
    const normalizedTools = (body.tools as JsonRecord[])
      .map((tool) => {
        if (!tool || typeof tool !== 'object' || Array.isArray(tool)) return null
        const record = tool as JsonRecord
        const name = typeof record.name === 'string' ? record.name.trim() : ''
        if (!name) return null

        return {
          type: 'function',
          function: {
            name,
            description: typeof record.description === 'string' ? record.description : '',
            parameters: normalizeToolSchema(record.input_schema),
          },
        }
      })
      .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool))

    if (normalizedTools.length > 0) result.tools = normalizedTools as unknown as JsonRecord[]
  }

  if (body.tool_choice) {
    result.tool_choice = convertToolChoice(body.tool_choice)
  }

  // Efecto de razonamiento: mapea el control de pensamiento de Mensajes a
  // `reasoning_effort` de OpenAI. Prioridad: `output_config.effort` >
  // `thinking.budget_tokens`. Los cubos de presupuesto son el espejo exacto
  // de `requestOpenAIToMessages.ts::REASONING_EFFORT_BUDGETS`.
  const outputEffort = normalizeOpenAIReasoningEffort((body.output_config as JsonRecord)?.effort) || ''
  const thinking = body.thinking as JsonRecord | undefined
  if (outputEffort) {
    result.reasoning_effort = outputEffort
  } else if (thinking?.type === 'enabled' && typeof thinking.budget_tokens === 'number') {
    const budget = thinking.budget_tokens
    if (budget <= 0) {
      // deshabilitado — se deja reasoning_effort sin fijar
    } else if (budget <= 1024) {
      result.reasoning_effort = 'low'
    } else if (budget <= 10240) {
      result.reasoning_effort = 'medium'
    } else if (budget < 131072) {
      result.reasoning_effort = 'high'
    } else {
      result.reasoning_effort = 'xhigh'
    }
  }

  return result
}

/**
 * Porte literal de `claude-to-openai.ts::regroupToolMessages` (#4714/#4385).
 * thyrox puede emitir varios `tool_use` en un mismo turno de asistente
 * y recibir sus `tool_result` repartidos en turnos de usuario separados con
 * texto intercalado; la conversión ingenua deja un role:"tool" varado tras
 * un mensaje de usuario, que los upstreams con forma OpenAI rechazan.
 */
function regroupToolMessages(messages: JsonRecord[]): JsonRecord[] {
  const callIdToAssistant = new Map<string, number>()
  messages.forEach((msg, idx) => {
    if (msg.role === 'assistant' && Array.isArray(msg.tool_calls)) {
      for (const tc of msg.tool_calls as { id?: string }[]) {
        if (tc.id && !callIdToAssistant.has(String(tc.id))) {
          callIdToAssistant.set(String(tc.id), idx)
        }
      }
    }
  })

  const toolsByAssistant = new Map<number, Map<string, JsonRecord>>()
  for (const msg of messages) {
    if (msg.role !== 'tool') continue
    const callId = String(msg.tool_call_id ?? '')
    const assistantIdx = callIdToAssistant.get(callId)
    if (assistantIdx === undefined) continue // huérfano -> se descarta
    let group = toolsByAssistant.get(assistantIdx)
    if (!group) {
      group = new Map()
      toolsByAssistant.set(assistantIdx, group)
    }
    if (!group.has(callId)) group.set(callId, msg)
  }

  const out: JsonRecord[] = []
  messages.forEach((msg, idx) => {
    if (msg.role === 'tool') return // se mueve al grupo de su asistente
    out.push(msg)
    if (msg.role === 'assistant' && Array.isArray(msg.tool_calls)) {
      const group = toolsByAssistant.get(idx)
      if (group) {
        for (const tc of msg.tool_calls as { id?: string }[]) {
          const tool = tc.id ? group.get(String(tc.id)) : undefined
          if (tool) out.push(tool)
        }
      }
    }
  })
  return out
}

/**
 * Porte literal de `claude-to-openai.ts::fixMissingToolResponses`. OpenAI
 * exige que todo `tool_call` tenga respuesta; se rellenan con un marcador
 * los que quedaron sin una.
 */
function fixMissingToolResponses(messages: JsonRecord[]): void {
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i] as JsonRecord
    const toolCalls = msg.tool_calls as { id?: string }[] | undefined
    if (msg.role === 'assistant' && toolCalls && toolCalls.length > 0) {
      const toolCallIds = toolCalls.map((tc) => tc.id)

      const respondedIds = new Set<string | undefined>()
      let insertPosition = i + 1
      for (let j = i + 1; j < messages.length; j++) {
        const nextMsg = messages[j] as JsonRecord
        if (nextMsg.role === 'tool' && nextMsg.tool_call_id) {
          respondedIds.add(nextMsg.tool_call_id as string)
          insertPosition = j + 1
        } else {
          break
        }
      }

      const missingIds = toolCallIds.filter((id) => !respondedIds.has(id))
      if (missingIds.length > 0) {
        const missingResponses = missingIds.map((id) => ({
          role: 'tool',
          tool_call_id: id,
          content: '[No response received]',
        }))
        messages.splice(insertPosition, 0, ...missingResponses)
        i = insertPosition + missingResponses.length - 1
      }
    }
  }
}

/**
 * Porte de `claude-to-openai.ts::convertMessagesApiMessage`. Devuelve un único
 * mensaje OpenAI, un arreglo de ellos (cuando el turno lleva `tool_result`),
 * o `null` cuando no hay nada que emitir.
 */
function convertMessagesApiMessage(msg: MessagesApiMessage): JsonRecord | JsonRecord[] | null {
  // #6954 — un role:"system" a mitad de conversación se conserva como tal
  // (y se degrada a "user" más arriba); ya no se atribuye al asistente.
  const role = msg.role === 'user' || msg.role === 'tool' ? 'user' : msg.role === 'system' ? 'system' : 'assistant'

  if (typeof msg.content === 'string') {
    return { role, content: msg.content }
  }

  if (!Array.isArray(msg.content)) return null

  const parts: JsonRecord[] = []
  const toolCalls: JsonRecord[] = []
  const toolResults: JsonRecord[] = []
  let reasoningContent: string | null = null

  for (const block of msg.content as JsonRecord[]) {
    switch (block.type) {
      case 'text':
        parts.push({ type: 'text', text: block.text })
        break

      case 'image': {
        const source = block.source as JsonRecord | undefined
        if (source?.type === 'base64') {
          parts.push({
            type: 'image_url',
            image_url: { url: `data:${source.media_type};base64,${source.data}` },
          })
        } else if (source?.type === 'url' && typeof source.url === 'string') {
          parts.push({ type: 'image_url', image_url: { url: source.url } })
        }
        break
      }

      case 'thinking':
        reasoningContent = (block.thinking as string) ?? (block.text as string) ?? ''
        break

      case 'redacted_thinking':
        if (reasoningContent == null) reasoningContent = ''
        break

      case 'tool_use':
        toolCalls.push({
          id: block.id,
          type: 'function',
          function: {
            name: block.name,
            arguments: typeof block.input === 'string' ? block.input : JSON.stringify(block.input || {}),
          },
        })
        break

      case 'tool_result': {
        let resultContent = ''
        if (typeof block.content === 'string') {
          resultContent = block.content
        } else if (Array.isArray(block.content)) {
          // El texto se queda en el mensaje `tool`; una imagen se ELEVA a un
          // turno de usuario siguiente, porque un mensaje `tool` de OpenAI
          // no puede llevar imagen. Sin esto, un tool_result de sólo-imagen
          // se serializa como base64 en texto y dispara "input exceeds the
          // context window" en upstreams con protocolo OpenAI.
          const textParts: string[] = []
          let hasImage = false
          for (const c of block.content as JsonRecord[]) {
            if (c.type === 'text') {
              textParts.push(c.text as string)
            } else if (c.type === 'image' && (c.source as JsonRecord)?.type === 'base64') {
              const source = c.source as JsonRecord
              parts.push({
                type: 'image_url',
                image_url: { url: `data:${source.media_type};base64,${source.data}` },
              })
              hasImage = true
            } else if (
              c.type === 'image' &&
              (c.source as JsonRecord)?.type === 'url' &&
              (c.source as JsonRecord).url
            ) {
              parts.push({ type: 'image_url', image_url: { url: (c.source as JsonRecord).url } })
              hasImage = true
            }
          }
          resultContent =
            textParts.join('\n') ||
            (hasImage ? '[tool returned an image; see attached]' : JSON.stringify(block.content))
        } else if (block.content) {
          resultContent = JSON.stringify(block.content)
        }

        toolResults.push({ role: 'tool', tool_call_id: block.tool_use_id, content: resultContent })
        break
      }
    }
  }

  if (toolResults.length > 0) {
    if (parts.length > 0) {
      const textContent = parts.length === 1 && parts[0]?.type === 'text' ? parts[0].text : parts
      return [...toolResults, { role: 'user', content: textContent }]
    }
    return toolResults
  }

  if (toolCalls.length > 0) {
    const result: JsonRecord = { role: 'assistant' }
    if (parts.length > 0) {
      result.content = parts.length === 1 && parts[0]?.type === 'text' ? parts[0].text : parts
    }
    result.tool_calls = toolCalls
    if (reasoningContent !== null) result.reasoning_content = reasoningContent
    return result
  }

  if (parts.length > 0) {
    const result: JsonRecord = {
      role,
      content: parts.length === 1 && parts[0]?.type === 'text' ? parts[0].text : parts,
    }
    if (reasoningContent !== null && role === 'assistant') result.reasoning_content = reasoningContent
    return result
  }

  if ((msg.content as unknown[]).length === 0) {
    const result: JsonRecord = { role, content: '' }
    if (reasoningContent !== null && role === 'assistant') result.reasoning_content = reasoningContent
    return result
  }

  if (reasoningContent !== null && role === 'assistant') {
    return { role, content: '', reasoning_content: reasoningContent }
  }

  return null
}

/** Porte de `claude-to-openai.ts::convertToolChoice`, sin la rama de `web_search` nativo. */
function convertToolChoice(choice: unknown): unknown {
  if (!choice) return 'auto'
  if (typeof choice === 'string') return choice

  const record = choice as JsonRecord
  switch (record.type) {
    case 'auto':
      return 'auto'
    case 'none':
      return 'none'
    case TOOL_CHOICE_ANY:
      return 'required'
    case 'tool':
      return { type: 'function', function: { name: record.name } }
    default:
      return 'auto'
  }
}
