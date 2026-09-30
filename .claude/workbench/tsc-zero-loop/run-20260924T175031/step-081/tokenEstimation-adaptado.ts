import type { Anthropic } from '@anthropic-ai/sdk'
import { getAPIProvider } from '@thyrox/provider/providers.js'
import { getMainLoopModel } from '@thyrox/provider/model.js'
import { getModelBetas } from '@thyrox/provider/betas.js'
import { normalizeModelStringForAPI } from '@thyrox/provider/model.js'
import { getAnthropicClient } from '@thyrox/provider'
import { VERTEX_COUNT_TOKENS_ALLOWED_BETAS } from '@thyrox/provider/betasConstants.js'
import { logError } from '@thyrox/local-observability/logging'
import { jsonStringify } from '@thyrox/local-observability/slowOperations.js'
import { createBedrockRuntimeClient } from '@thyrox/provider/model/bedrock.js'
import { isFoundationModel } from '@thyrox/provider/model/bedrock.js'
import { getInferenceProfileBackingModel } from '@thyrox/provider/model/bedrock.js'
import type { CountTokensCommandInput } from '@aws-sdk/client-bedrock-runtime'
/**
 * Estimación aproximada de tokens — porte del binario 2.1.275.
 *
 * `xu` (`chunk-8f0aeskw.js`) es la base: una cadena divide su longitud entre
 * los bytes por token y redondea; lo que no es cadena cuenta 0. `R`/`ige`
 * (mismo archivo) estiman un bloque y un contenido; `dAo`/`Vm`
 * (`chunk-q2gh92k2.js`) un mensaje y una lista.
 *
 * CORREGIDO 2026-09-24 contra el binario. Esta cabecera conservaba «verbatim»
 * un ajuste de 1.5 tokens por carácter CJK traído de ccnmt, y lo llamaba «el
 * comportamiento». Los dos estimadores de tokens de 2.1.275 no lo tienen:
 * `xu` es `round(len/n)` y `s3n` es `ceil(len/4)`. El binario SÍ trata el
 * CJK en otros tres sitios, ninguno de tokens: `nt`/`tt`/`ot` cuentan
 * palabras (han = 1/2, fonético = 1/4) sólo para descartar sugerencias de
 * prompt demasiado cortas; `o3t` clasifica caracteres para el ancho en
 * terminal; `uwo` segmenta texto por escrituras asiáticas. Gana el binario.
 *
 * Quedan sin portar, declarado: `countTokensWithAPI`,
 * `countMessagesTokensWithAPI`, `countTokensViaHaikuFallback`,
 * `countTokensWithBedrock` y `roughTokenCountEstimationForAPIRequest`, que
 * dependen del SDK del API. Y la rama de adjuntos de `dAo` llama a
 * `normalizeAttachmentForAPI` (`IJe`), que este árbol aún no tiene: aquí se
 * recibe como parámetro, y sin él un adjunto cuenta 0.
 */

export function roughTokenCountEstimation(
  content: string,
  bytesPerToken: number = 4,
): number {
  if (typeof content !== 'string') return 0
  return Math.round(content.length / bytesPerToken)
}

type Block = { type?: string; [key: string]: unknown } | string
type Content = string | readonly Block[] | null | undefined
type Message = {
  type?: string
  message?: { content?: Content }
  attachment?: unknown
  rendered?: unknown
}
type AttachmentNormalizer = (input: {
  attachment: unknown
  rendered: unknown
}) => readonly { message: { content?: Content } }[]

/** `R`: la estimación de un bloque de contenido. */
export function roughTokenCountEstimationForBlock(
  block: Block,
  bytesPerToken: number = 4,
): number {
  if (typeof block === 'string') return roughTokenCountEstimation(block, bytesPerToken)
  switch (block.type) {
    case 'text':
      return roughTokenCountEstimation(block.text as string, bytesPerToken)
    case 'image':
    case 'document':
      return 2000
    case 'tool_result':
      return roughTokenCountEstimationForContent(block.content as Content, bytesPerToken)
    case 'tool_use':
      return roughTokenCountEstimation(
        (block.name as string) + JSON.stringify(block.input ?? {}),
        bytesPerToken,
      )
    case 'thinking':
      return roughTokenCountEstimation(block.thinking as string, bytesPerToken)
    case 'redacted_thinking':
      return roughTokenCountEstimation(block.data as string, bytesPerToken)
    default:
      return roughTokenCountEstimation(JSON.stringify(block), bytesPerToken)
  }
}

/** `ige`: la estimación de un contenido, cadena o lista de bloques. */
export function roughTokenCountEstimationForContent(
  content: Content,
  bytesPerToken: number = 4,
): number {
  if (!content) return 0
  if (typeof content === 'string') return roughTokenCountEstimation(content, bytesPerToken)
  let total = 0
  for (const block of content) total += roughTokenCountEstimationForBlock(block, bytesPerToken)
  return total
}

/** `dAo`: la estimación de un mensaje del transcript. */
export function roughTokenCountEstimationForMessage(
  message: Message,
  bytesPerToken: number = 4,
  normalizeAttachment?: AttachmentNormalizer,
): number {
  if (
    (message.type === 'assistant' || message.type === 'user' || message.type === 'api_system') &&
    message.message?.content
  ) {
    return roughTokenCountEstimationForContent(message.message.content, bytesPerToken)
  }
  if (message.type === 'attachment' && message.attachment && normalizeAttachment) {
    let total = 0
    for (const normalized of normalizeAttachment({
      attachment: message.attachment,
      rendered: message.rendered,
    })) {
      total += roughTokenCountEstimationForContent(normalized.message.content, bytesPerToken)
    }
    return total
  }
  return 0
}

/** `Vm`: la suma sobre una lista de mensajes. */
export function roughTokenCountEstimationForMessages(
  messages: readonly Message[],
  bytesPerToken: number = 4,
  normalizeAttachment?: AttachmentNormalizer,
): number {
  let total = 0
  for (const message of messages) {
    total += roughTokenCountEstimationForMessage(message, bytesPerToken, normalizeAttachment)
  }
  return total
}

/**
 * Devuelve una razón bytes-por-token estimada para una extensión de
 * archivo dada. El JSON denso tiene muchos tokens de un solo carácter
 * (`{`, `}`, `:`, `,`, `"`), lo que hace que la razón real sea más
 * cercana a 2 que al 4 por defecto.
 */
export function bytesPerTokenForFileType(fileExtension: string): number {
  switch (fileExtension) {
    case 'json':
    case 'jsonl':
    case 'jsonc':
      return 2
    default:
      return 4
  }
}

/**
 * Como {@link roughTokenCountEstimation} pero usa una razón bytes-por-token
 * más precisa cuando el tipo de archivo es conocido.
 *
 * Importa cuando el conteo de tokens vía API no está disponible (p. ej. en
 * Bedrock) y se cae al estimado aproximado — un subconteo puede dejar
 * pasar un resultado de herramienta sobredimensionado.
 */
export function roughTokenCountEstimationForFileType(
  content: string,
  fileExtension: string,
): number {
  return roughTokenCountEstimation(
    content,
    bytesPerTokenForFileType(fileExtension),
  )
}

// Production noop of withTokenCountVCR — the src/ version gates on
// NODE_ENV==='test' || (USER_TYPE==='ant' && FORCE_VCR) and returns await f()
// in all other cases. Token counting has no test fixtures in this repo
// (see src/utils/__tests__/tokens.test.ts which mocks countMessagesTokensWithAPI),
// so the vcr gate is always false at runtime. Inlining breaks the @thyrox/
// agent → src/services/vcr import cycle without behavior change.
async function withTokenCountVCR(
  _messages: unknown[],
  _tools: unknown[],
  f: () => Promise<number | null>,
): Promise<number | null> {
  return await f()
}
// Minimal values for token counting with thinking enabled
// API constraint: max_tokens must be greater than thinking.budget_tokens
const TOKEN_COUNT_THINKING_BUDGET = 1024
const TOKEN_COUNT_MAX_TOKENS = 2048
/**
 * Check if messages contain thinking blocks
 */
function hasThinkingBlocks(
  messages: Anthropic.Beta.Messages.BetaMessageParam[],
): boolean {
  for (const message of messages) {
    if (message.role === 'assistant' && Array.isArray(message.content)) {
      for (const block of message.content) {
        if (
          typeof block === 'object' &&
          block !== null &&
          'type' in block &&
          (block.type === 'thinking' || block.type === 'redacted_thinking')
        ) {
          return true
        }
      }
    }
  }
  return false
}
export async function countTokensWithAPI(
  content: string,
): Promise<number | null> {
  // Special case for empty content - API doesn't accept empty messages
  if (!content) {
    return 0
  }

  const message: Anthropic.Beta.Messages.BetaMessageParam = {
    role: 'user',
    content: content,
  }

  return countMessagesTokensWithAPI([message], [])
}
export async function countMessagesTokensWithAPI(
  messages: Anthropic.Beta.Messages.BetaMessageParam[],
  tools: Anthropic.Beta.Messages.BetaToolUnion[],
): Promise<number | null> {
  return withTokenCountVCR(messages, tools, async () => {
    try {
      const provider = getAPIProvider()
      if (provider === 'gemini') {
        return roughTokenCountEstimationForAPIRequest(messages, tools)
      }

      const model = getMainLoopModel()
      const betas = getModelBetas(model)
      const containsThinking = hasThinkingBlocks(messages)

      if (provider === 'bedrock') {
        // @anthropic-sdk/bedrock-sdk doesn't support countTokens currently
        return countTokensWithBedrock({
          model: normalizeModelStringForAPI(model),
          messages,
          tools,
          betas,
          containsThinking,
        })
      }

      const anthropic = await getAnthropicClient({
        maxRetries: 1,
        model,
        source: 'count_tokens',
      })

      const filteredBetas =
        getAPIProvider() === 'vertex'
          ? betas.filter(b => VERTEX_COUNT_TOKENS_ALLOWED_BETAS.has(b))
          : betas

      const response = await anthropic.beta.messages.countTokens({
        model: normalizeModelStringForAPI(model),
        messages:
          // When we pass tools and no messages, we need to pass a dummy message
          // to get an accurate tool token count.
          messages.length > 0 ? messages : [{ role: 'user', content: 'foo' }],
        tools,
        ...(filteredBetas.length > 0 && { betas: filteredBetas }),
        // Enable thinking if messages contain thinking blocks
        ...(containsThinking && {
          thinking: {
            type: 'enabled',
            budget_tokens: TOKEN_COUNT_THINKING_BUDGET,
          },
        }),
      })

      if (typeof response.input_tokens !== 'number') {
        // Vertex client throws
        // Bedrock client succeeds with { Output: { __type: 'com.amazon.coral.service#UnknownOperationException' }, Version: '1.0' }
        return null
      }

      return response.input_tokens
    } catch (error) {
      logError(error)
      return null
    }
  })
}
function roughTokenCountEstimationForAPIRequest(
  messages: Anthropic.Beta.Messages.BetaMessageParam[],
  tools: Anthropic.Beta.Messages.BetaToolUnion[],
): number {
  let totalTokens = 0

  for (const message of messages) {
    totalTokens += roughTokenCountEstimationForContent(
      // El contenido de la API es una interfaz sin firma de índice, y el
      // Block de este archivo la exige: se lee como el Content que la
      // función declara.
      message.content as Content,
    )
  }

  if (tools.length > 0) {
    totalTokens += roughTokenCountEstimation(jsonStringify(tools))
  }

  return totalTokens
}
async function countTokensWithBedrock({
  model,
  messages,
  tools,
  betas,
  containsThinking,
}: {
  model: string
  messages: Anthropic.Beta.Messages.BetaMessageParam[]
  tools: Anthropic.Beta.Messages.BetaToolUnion[]
  betas: string[]
  containsThinking: boolean
}): Promise<number | null> {
  try {
    const client = await createBedrockRuntimeClient()
    // Bedrock CountTokens requires a model ID, not an inference profile / ARN
    const modelId = isFoundationModel(model)
      ? model
      : await getInferenceProfileBackingModel(model)
    if (!modelId) {
      return null
    }

    const requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      // When we pass tools and no messages, we need to pass a dummy message
      // to get an accurate tool token count.
      messages:
        messages.length > 0 ? messages : [{ role: 'user', content: 'foo' }],
      max_tokens: containsThinking ? TOKEN_COUNT_MAX_TOKENS : 1,
      ...(tools.length > 0 && { tools }),
      ...(betas.length > 0 && { anthropic_beta: betas }),
      ...(containsThinking && {
        thinking: {
          type: 'enabled',
          budget_tokens: TOKEN_COUNT_THINKING_BUDGET,
        },
      }),
    }

    const { CountTokensCommand } = await import(
      '@aws-sdk/client-bedrock-runtime'
    )
    const input: CountTokensCommandInput = {
      modelId,
      input: {
        invokeModel: {
          body: new TextEncoder().encode(jsonStringify(requestBody)),
        },
      },
    }
    const response = await client.send(new CountTokensCommand(input))
    const tokenCount = response.inputTokens ?? null
    return tokenCount
  } catch (error) {
    logError(error)
    return null
  }
}