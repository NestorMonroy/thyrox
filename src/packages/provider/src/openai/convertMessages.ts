/**
 * Traduccion del mensaje interno al mensaje de ChatCompletion de OpenAI —
 * porte de `ccnmt: packages/provider/src/openai/convertMessages.ts`
 * (264 lineas).
 *
 * El puerto es COMPLETO: la fuente declara `anthropicMessagesToOpenAI` (su
 * unico export) y cinco funciones privadas —`systemPromptToText`,
 * `convertInternalUserMessage`, `convertToolResult`,
 * `convertInternalAssistantMessage`, `convertImageBlockToOpenAI`—, y las seis
 * estan aqui. Ninguna queda fuera.
 *
 * DIVERGENCIA DECLARADA — los tipos del lado OpenAI. La fuente los toma del
 * paquete `openai`, que NO resuelve en este arbol. Se declaran aqui las formas
 * estructurales, con el mismo criterio que `convertTools.ts` y que
 * `agent/messageShapes.ts`: se declara la forma, no se arrastra el paquete por
 * un tipo.
 */
import type {
  BetaToolResultBlockParam,
  BetaToolUseBlock,
} from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type {
  ProviderAssistantMessage,
  ProviderMessage,
  ProviderSystemPrompt,
  ProviderUserMessage,
} from '../contracts.js'

type OpenAITextPart = { type: 'text'; text: string }
type OpenAIImagePart = { type: 'image_url'; image_url: { url: string } }

export type ChatCompletionToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export type ChatCompletionSystemMessageParam = {
  role: 'system'
  content: string
}

export type ChatCompletionUserMessageParam = {
  role: 'user'
  content: string | Array<OpenAITextPart | OpenAIImagePart>
}

export type ChatCompletionToolMessageParam = {
  role: 'tool'
  tool_call_id: string
  content: string
}

export type ChatCompletionAssistantMessageParam = {
  role: 'assistant'
  content: string | null
  tool_calls?: ChatCompletionToolCall[]
  /**
   * Campo NO estandar que los proveedores compatibles con OpenAI —DeepSeek,
   * MoonshotAI— exigen en el turno de asistente cuando el pensamiento esta
   * activo. No esta en el tipo propio de OpenAI, asi que la fuente ensancha el
   * tipo del resultado en vez de castear a `any`; aqui vive declarado en el
   * tipo directamente, con el mismo efecto y sin perder la comprobacion.
   */
  reasoning_content?: string
}

export type ChatCompletionMessageParam =
  | ChatCompletionSystemMessageParam
  | ChatCompletionUserMessageParam
  | ChatCompletionToolMessageParam
  | ChatCompletionAssistantMessageParam

/**
 * Convierte la lista interna de mensajes al formato de OpenAI.
 *
 * Las conversiones que importan:
 *
 * - el prompt de sistema se antepone como mensaje `role: "system"`;
 * - los bloques `tool_use` pasan a `tool_calls[]` del mensaje de asistente;
 * - los bloques `tool_result` pasan a mensajes `role: "tool"`;
 * - los bloques de pensamiento no entran en `content` — viajan a
 *   `reasoning_content`;
 * - `cache_control` se descarta.
 */
export function anthropicMessagesToOpenAI(
  messages: readonly ProviderMessage[],
  systemPrompt: ProviderSystemPrompt,
): ChatCompletionMessageParam[] {
  const result: ChatCompletionMessageParam[] = []

  const systemText = systemPromptToText(systemPrompt)
  if (systemText) {
    result.push({ role: 'system', content: systemText })
  }

  for (const msg of messages) {
    switch (msg.type) {
      case 'user':
        result.push(...convertInternalUserMessage(msg as ProviderUserMessage))
        break
      case 'assistant':
        result.push(
          ...convertInternalAssistantMessage(msg as ProviderAssistantMessage),
        )
        break
      default:
        break
    }
  }

  return result
}

function systemPromptToText(systemPrompt: ProviderSystemPrompt): string {
  if (!systemPrompt || systemPrompt.length === 0) return ''
  return systemPrompt.filter(Boolean).join('\n\n')
}

function convertInternalUserMessage(
  msg: ProviderUserMessage,
): ChatCompletionMessageParam[] {
  const result: ChatCompletionMessageParam[] = []
  const content = msg.message.content

  if (typeof content === 'string') {
    result.push({ role: 'user', content })
  } else if (Array.isArray(content)) {
    const textParts: string[] = []
    const toolResults: BetaToolResultBlockParam[] = []
    const imageParts: OpenAIImagePart[] = []

    for (const block of content) {
      if (typeof block === 'string') {
        textParts.push(block)
      } else if (block.type === 'text') {
        textParts.push(block.text)
      } else if (block.type === 'tool_result') {
        toolResults.push(block as BetaToolResultBlockParam)
      } else if (block.type === 'image') {
        const imagePart = convertImageBlockToOpenAI(
          block as unknown as Record<string, unknown>,
        )
        if (imagePart) {
          imageParts.push(imagePart)
        }
      }
    }

    // CRITICO: los mensajes tool tienen que salir ANTES de cualquier mensaje de
    // usuario. El API de OpenAI exige que un mensaje tool siga inmediatamente
    // al mensaje de asistente que trae `tool_calls`. Si se emite antes el de
    // usuario, la peticion se rechaza con «insufficient tool messages
    // following tool_calls».
    for (const tr of toolResults) {
      result.push(convertToolResult(tr))
    }

    // Con imagenes presentes, el contenido pasa a ser un arreglo multimodal.
    if (imageParts.length > 0) {
      const multiContent: Array<OpenAITextPart | OpenAIImagePart> = []
      if (textParts.length > 0) {
        multiContent.push({ type: 'text', text: textParts.join('\n') })
      }
      multiContent.push(...imageParts)
      result.push({ role: 'user', content: multiContent })
    } else if (textParts.length > 0) {
      result.push({ role: 'user', content: textParts.join('\n') })
    }
  }

  return result
}

function convertToolResult(
  block: BetaToolResultBlockParam,
): ChatCompletionToolMessageParam {
  let content: string
  if (typeof block.content === 'string') {
    content = block.content
  } else if (Array.isArray(block.content)) {
    content = block.content
      .map(c => {
        if (typeof c === 'string') return c
        if ('text' in c) return c.text
        return ''
      })
      .filter(Boolean)
      .join('\n')
  } else {
    content = ''
  }

  return { role: 'tool', tool_call_id: block.tool_use_id, content }
}

function convertInternalAssistantMessage(
  msg: ProviderAssistantMessage,
): ChatCompletionMessageParam[] {
  const content = msg.message.content

  if (typeof content === 'string') {
    return [{ role: 'assistant', content }]
  }

  if (!Array.isArray(content)) {
    return [{ role: 'assistant', content: '' }]
  }

  const textParts: string[] = []
  const toolCalls: ChatCompletionToolCall[] = []
  let reasoningContent: string | undefined

  for (const block of content) {
    if (typeof block === 'string') {
      textParts.push(block)
    } else if (block.type === 'text') {
      textParts.push(block.text)
    } else if (block.type === 'tool_use') {
      const tu = block as BetaToolUseBlock
      toolCalls.push({
        id: tu.id,
        type: 'function',
        function: {
          name: tu.name,
          arguments:
            typeof tu.input === 'string' ? tu.input : JSON.stringify(tu.input),
        },
      })
    } else if (block.type === 'thinking') {
      const thinkingText = block.thinking
      if (typeof thinkingText === 'string') {
        reasoningContent = (reasoningContent || '') + thinkingText
      }
    }
    // Se saltan redacted_thinking, server_tool_use y los demas.
  }

  const result: ChatCompletionAssistantMessageParam = {
    role: 'assistant',
    content: textParts.length > 0 ? textParts.join('\n') : null,
    ...(toolCalls.length > 0 && { tool_calls: toolCalls }),
    ...(reasoningContent !== undefined && { reasoning_content: reasoningContent }),
  }

  return [result]
}

/**
 * Convierte un bloque de imagen de Anthropic al formato `image_url` de OpenAI.
 *
 * Anthropic: `{ type: "image", source: { type: "base64", media_type, data } }`
 * OpenAI:    `{ type: "image_url", image_url: { url: "data:<tipo>;base64,..." } }`
 *
 * Una imagen por URL pasa directo. Cualquier otra forma —o la ausencia de
 * `source`— devuelve `null` y el bloque no emite nada.
 */
function convertImageBlockToOpenAI(
  block: Record<string, unknown>,
): OpenAIImagePart | null {
  const source = block.source as Record<string, unknown> | undefined
  if (!source) return null

  if (source.type === 'base64' && typeof source.data === 'string') {
    const mediaType = (source.media_type as string) || 'image/png'
    return {
      type: 'image_url',
      image_url: { url: `data:${mediaType};base64,${source.data}` },
    }
  }

  if (source.type === 'url' && typeof source.url === 'string') {
    return { type: 'image_url', image_url: { url: source.url } }
  }

  return null
}
