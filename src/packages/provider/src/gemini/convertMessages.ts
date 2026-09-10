/**
 * Traduccion del mensaje interno a la peticion GenerateContent de Gemini —
 * porte de `ccnmt: packages/provider/src/gemini/convertMessages.ts`
 * (322 lineas, 1 export).
 *
 * El puerto es COMPLETO: `anthropicMessagesToGemini` y sus once funciones
 * privadas. Ninguna queda fuera.
 *
 * Los `as unknown as` sobre los bloques de contenido son el puente entre la
 * union generica del proveedor y las formas concretas del SDK para uso y
 * resultado de herramienta. Es traduccion de SDK a SDK, y viaja del original.
 *
 * DOS DIFERENCIAS DE FONDO con el adaptador de OpenAI:
 *
 * 1. Gemini llama `model` al rol del asistente, no `assistant`.
 * 2. El `functionResponse` de un resultado de herramienta se identifica por el
 *    NOMBRE de la herramienta, no por el id de la llamada. Como el bloque de
 *    resultado solo trae el id, hace falta un mapa id-a-nombre que se va
 *    poblando con los `tool_use` del asistente conforme se recorren los
 *    mensajes. Sin el, el nombre cae al id y Gemini no reconoce la funcion.
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
import { safeParseJSON } from '../runtimeHelpers.js'
import {
  GEMINI_THOUGHT_SIGNATURE_FIELD,
  type GeminiContent,
  type GeminiGenerateContentRequest,
  type GeminiPart,
} from './types.js'

export function anthropicMessagesToGemini(
  messages: readonly ProviderMessage[],
  systemPrompt: ProviderSystemPrompt,
): Pick<GeminiGenerateContentRequest, 'contents' | 'systemInstruction'> {
  const contents: GeminiContent[] = []
  // Id de la llamada a herramienta, al nombre de la herramienta. Se puebla al
  // recorrer los mensajes de asistente y lo consume el resultado que venga
  // despues, en un mensaje de usuario.
  const toolNamesById = new Map<string, string>()

  for (const msg of messages) {
    if (msg.type === 'assistant') {
      const content = convertInternalAssistantMessage(msg as ProviderAssistantMessage)
      // Un mensaje sin partes no se emite: Gemini rechaza un `contents` con un
      // elemento de partes vacias.
      if (content.parts.length > 0) {
        contents.push(content)
      }

      const assistantContent = msg.message.content
      if (Array.isArray(assistantContent)) {
        for (const block of assistantContent) {
          if (typeof block !== 'string' && block.type === 'tool_use') {
            toolNamesById.set(block.id, block.name)
          }
        }
      }
      continue
    }

    if (msg.type === 'user') {
      const content = convertInternalUserMessage(msg as ProviderUserMessage, toolNamesById)
      if (content.parts.length > 0) {
        contents.push(content)
      }
    }
  }

  const systemText = systemPromptToText(systemPrompt)

  return {
    contents,
    // La clave se OMITE cuando no hay texto: Gemini no acepta de buen grado un
    // `systemInstruction` con partes vacias.
    ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
  }
}

function systemPromptToText(systemPrompt: ProviderSystemPrompt): string {
  if (!systemPrompt || systemPrompt.length === 0) return ''
  return systemPrompt.filter(Boolean).join('\n\n')
}

function convertInternalUserMessage(
  msg: ProviderUserMessage,
  toolNamesById: ReadonlyMap<string, string>,
): GeminiContent {
  const content = msg.message.content

  if (typeof content === 'string') {
    return { role: 'user', parts: createTextGeminiParts(content) }
  }

  if (!Array.isArray(content)) {
    return { role: 'user', parts: [] }
  }

  return {
    role: 'user',
    parts: content.flatMap(block =>
      convertUserContentBlockToGeminiParts(block, toolNamesById),
    ),
  }
}

function convertUserContentBlockToGeminiParts(
  block: string | Record<string, unknown>,
  toolNamesById: ReadonlyMap<string, string>,
): GeminiPart[] {
  if (typeof block === 'string') {
    return createTextGeminiParts(block)
  }

  if (block.type === 'text') {
    return createTextGeminiParts(block.text)
  }

  if (block.type === 'tool_result') {
    const toolResult = block as unknown as BetaToolResultBlockParam
    return [
      {
        functionResponse: {
          // Sin nombre conocido cae al id, que es lo unico que el bloque trae.
          name: toolNamesById.get(toolResult.tool_use_id) ?? toolResult.tool_use_id,
          response: toolResultToResponseObject(toolResult),
        },
      },
    ]
  }

  if (block.type === 'image') {
    const source = block.source as Record<string, unknown> | undefined
    if (source?.type === 'base64' && typeof source.data === 'string') {
      const mediaType = (source.media_type as string) || 'image/png'
      return [{ inlineData: { mimeType: mediaType, data: source.data } }]
    }
    // Gemini no admite imagenes por URL, asi que la URL viaja como texto.
    if (source?.type === 'url' && typeof source.url === 'string') {
      return createTextGeminiParts(`[image: ${source.url}]`)
    }
  }

  return []
}

function convertInternalAssistantMessage(msg: ProviderAssistantMessage): GeminiContent {
  const content = msg.message.content

  if (typeof content === 'string') {
    return { role: 'model', parts: createTextGeminiParts(content) }
  }

  if (!Array.isArray(content)) {
    return { role: 'model', parts: [] }
  }

  const parts: GeminiPart[] = []
  for (const block of content) {
    if (typeof block === 'string') {
      parts.push(...createTextGeminiParts(block))
      continue
    }

    if (block.type === 'text') {
      parts.push(
        ...createTextGeminiParts(
          block.text,
          getGeminiThoughtSignature(block as unknown as Record<string, unknown>),
        ),
      )
      continue
    }

    if (block.type === 'thinking') {
      const thinkingPart = createThinkingGeminiPart(block.thinking, block.signature)
      if (thinkingPart) {
        parts.push(thinkingPart)
      }
      continue
    }

    if (block.type === 'tool_use') {
      const toolUse = block as unknown as BetaToolUseBlock
      parts.push({
        functionCall: {
          name: toolUse.name,
          args: normalizeToolUseInput(toolUse.input),
        },
        ...(getGeminiThoughtSignature(block as unknown as Record<string, unknown>) && {
          thoughtSignature: getGeminiThoughtSignature(
            block as unknown as Record<string, unknown>,
          ),
        }),
      })
    }
  }

  return { role: 'model', parts }
}

/** Una parte de texto, o ninguna: una cadena vacia no produce parte. */
function createTextGeminiParts(value: unknown, thoughtSignature?: string): GeminiPart[] {
  if (typeof value !== 'string' || value.length === 0) {
    return []
  }

  return [{ text: value, ...(thoughtSignature && { thoughtSignature }) }]
}

/**
 * La parte de pensamiento: en Gemini no es un tipo de bloque aparte sino una
 * parte de TEXTO marcada con `thought: true`.
 */
function createThinkingGeminiPart(
  value: unknown,
  thoughtSignature?: string,
): GeminiPart | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined
  }

  return { text: value, thought: true, ...(thoughtSignature && { thoughtSignature }) }
}

/**
 * Los argumentos de una llamada a funcion, que Gemini exige como OBJETO.
 *
 * Lo que no sea objeto se envuelve en `{ value }` en vez de descartarse; lo
 * ausente y el `null` analizado dan objeto vacio.
 */
function normalizeToolUseInput(input: unknown): Record<string, unknown> {
  if (typeof input === 'string') {
    const parsed = safeParseJSON(input)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return parsed === null ? {} : ({ value: parsed } as Record<string, unknown>)
  }

  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return input as Record<string, unknown>
  }

  return input === undefined ? {} : ({ value: input } as Record<string, unknown>)
}

/**
 * La respuesta de una funcion, que Gemini tambien exige como objeto.
 *
 * Un resultado que ya es objeto viaja tal cual —con `is_error` anadido si lo
 * hubo—; cualquier otra cosa se envuelve en `{ result }`.
 */
function toolResultToResponseObject(
  block: BetaToolResultBlockParam,
): Record<string, unknown> {
  const result = normalizeToolResultContent(block.content)
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const objectResult = result as Record<string, unknown>
    return block.is_error ? { ...objectResult, is_error: true } : objectResult
  }

  return { result, ...(block.is_error ? { is_error: true } : {}) }
}

/**
 * El contenido de un resultado de herramienta, analizado a objeto cuando se
 * puede. Un texto que no sea JSON valido viaja como texto.
 */
function normalizeToolResultContent(content: unknown): unknown {
  if (typeof content === 'string') {
    const parsed = safeParseJSON(content)
    return parsed ?? content
  }

  if (Array.isArray(content)) {
    const text = content
      .map(part => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
          return part.text
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')

    const parsed = safeParseJSON(text)
    return parsed ?? text
  }

  return content ?? ''
}

/**
 * La firma de pensamiento que el bloque lleve adosada.
 *
 * Vive en un campo de nombre propio porque la forma de Anthropic no tiene
 * sitio para ella: es lo que permite devolverle a Gemini la firma que el mismo
 * emitio, y que sin este rodeo se perderia al cruzar la frontera.
 */
function getGeminiThoughtSignature(block: Record<string, unknown>): string | undefined {
  const signature = block[GEMINI_THOUGHT_SIGNATURE_FIELD]
  return typeof signature === 'string' && signature.length > 0 ? signature : undefined
}
