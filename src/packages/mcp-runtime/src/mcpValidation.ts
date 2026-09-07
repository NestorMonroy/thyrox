/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/mcpValidation.ts` —
 * sus 6 exportaciones (2 constantes, 4 funciones), ninguna omitida.
 *
 * Repuntado (subpath declarado y símbolo verificado con resolución real):
 * `@thyrox/local-observability/logging` (`logError`).
 *
 * `@claude-code-how-works/config/feature-flags`
 * (`getFeatureValue_CACHED_MAY_BE_STALE`),
 * `@claude-code-how-works/agent/tokenEstimation.js`
 * (`countMessagesTokensWithAPI`, `roughTokenCountEstimation`) y
 * `@claude-code-how-works/storage/imageResizer.js` (`compressImageBlock`)
 * NO resuelven — ninguno de los tres subpaths existe en el `exports` del
 * paquete correspondiente (`@thyrox/config`, `@thyrox/agent`,
 * `@thyrox/storage`), verificado contra la lista completa de cada uno.
 * Los tres se usan sólo dentro de cuerpos de función (nunca a nivel de
 * módulo), así que se envuelven con `require()` diferido: un `import`
 * estático de un paquete cuya base (`@claude-code-how-works/*`) no existe
 * en este árbol hace fallar la carga del MÓDULO ENTERO (`Cannot find
 * module`, medido con `bun -e "import(...)"` antes de esta corrección),
 * no sólo la función que los usa. Mismo patrón que ya evita
 * `appStateHooks.ts` de este puerto.
 *
 * Trunca y estima el tamaño del resultado de una herramienta MCP contra el
 * tope de tokens de salida configurado.
 */
import type {
  ContentBlockParam,
  ImageBlockParam,
  TextBlockParam,
} from '@anthropic-ai/sdk/resources/index.mjs'
import { logError } from '@thyrox/local-observability/logging'

function requireConfigFeatureFlags(): {
  getFeatureValue_CACHED_MAY_BE_STALE: <T>(flag: string, fallback: T) => T
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@claude-code-how-works/config/feature-flags')
}

function requireAgentTokenEstimation(): {
  countMessagesTokensWithAPI: (
    messages: Array<{ role: 'user'; content: unknown }>,
    tools: unknown[],
  ) => Promise<number | undefined>
  roughTokenCountEstimation: (text: string) => number
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@claude-code-how-works/agent/tokenEstimation.js')
}

function requireStorageImageResizer(): {
  compressImageBlock: (
    block: ImageBlockParam,
    maxBytes: number,
  ) => Promise<ImageBlockParam>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@claude-code-how-works/storage/imageResizer.js')
}

export const MCP_TOKEN_COUNT_THRESHOLD_FACTOR = 0.5
export const IMAGE_TOKEN_ESTIMATE = 1600
const DEFAULT_MAX_MCP_OUTPUT_TOKENS = 25000

/**
 * Resuelve el tope de tokens de salida de MCP. Precedencia:
 *   1. Variable de entorno MAX_MCP_OUTPUT_TOKENS (override explícito del usuario)
 *   2. La clave `mcp_tool` de la bandera GrowthBook tengu_satin_quoll (tokens, no
 *      caracteres — a diferencia de las demás claves de ese mapa, que
 *      getPersistenceThreshold lee como caracteres; MCP tiene su propia capa
 *      de truncado, aguas arriba de esa)
 *   3. Default fijo en el código
 */
export function getMaxMcpOutputTokens(): number {
  const envValue = process.env.MAX_MCP_OUTPUT_TOKENS
  if (envValue) {
    const parsed = parseInt(envValue, 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }
  const overrides = requireConfigFeatureFlags().getFeatureValue_CACHED_MAY_BE_STALE<Record<
    string,
    number
  > | null>('tengu_satin_quoll', {})
  const override = overrides?.['mcp_tool']
  if (
    typeof override === 'number' &&
    Number.isFinite(override) &&
    override > 0
  ) {
    return override
  }
  return DEFAULT_MAX_MCP_OUTPUT_TOKENS
}

export type MCPToolResult = string | ContentBlockParam[] | undefined

function isTextBlock(block: ContentBlockParam): block is TextBlockParam {
  return block.type === 'text'
}

function isImageBlock(block: ContentBlockParam): block is ImageBlockParam {
  return block.type === 'image'
}

export function getContentSizeEstimate(content: MCPToolResult): number {
  if (!content) return 0

  if (typeof content === 'string') {
    return requireAgentTokenEstimation().roughTokenCountEstimation(content)
  }

  const { roughTokenCountEstimation } = requireAgentTokenEstimation()
  return content.reduce((total, block) => {
    if (isTextBlock(block)) {
      return total + roughTokenCountEstimation(block.text)
    } else if (isImageBlock(block)) {
      // Estimación para tokens de imagen.
      return total + IMAGE_TOKEN_ESTIMATE
    }
    return total
  }, 0)
}

function getMaxMcpOutputChars(): number {
  return getMaxMcpOutputTokens() * 4
}

function getTruncationMessage(): string {
  return `\n\n[OUTPUT TRUNCATED - exceeded ${getMaxMcpOutputTokens()} token limit]

The tool output was truncated. If this MCP server provides pagination or filtering tools, use them to retrieve specific portions of the data. If pagination is not available, inform the user that you are working with truncated output and results may be incomplete.`
}

function truncateString(content: string, maxChars: number): string {
  if (content.length <= maxChars) {
    return content
  }
  return content.slice(0, maxChars)
}

async function truncateContentBlocks(
  blocks: ContentBlockParam[],
  maxChars: number,
): Promise<ContentBlockParam[]> {
  const result: ContentBlockParam[] = []
  let currentChars = 0

  for (const block of blocks) {
    if (isTextBlock(block)) {
      const remainingChars = maxChars - currentChars
      if (remainingChars <= 0) break

      if (block.text.length <= remainingChars) {
        result.push(block)
        currentChars += block.text.length
      } else {
        result.push({ type: 'text', text: block.text.slice(0, remainingChars) })
        break
      }
    } else if (isImageBlock(block)) {
      // Incluye las imágenes pero cuenta su tamaño estimado.
      const imageChars = IMAGE_TOKEN_ESTIMATE * 4
      if (currentChars + imageChars <= maxChars) {
        result.push(block)
        currentChars += imageChars
      } else {
        // La imagen excede el presupuesto — intenta comprimirla para caber
        // en el espacio restante.
        const remainingChars = maxChars - currentChars
        if (remainingChars > 0) {
          // Convierte los caracteres restantes a bytes para la compresión.
          // base64 usa ~4/3 del tamaño original, así que se calculan los
          // bytes máximos.
          const remainingBytes = Math.floor(remainingChars * 0.75)
          try {
            const compressedBlock = await requireStorageImageResizer().compressImageBlock(
              block,
              remainingBytes,
            )
            result.push(compressedBlock)
            // Actualiza currentChars según el tamaño comprimido de la imagen.
            if (compressedBlock.source.type === 'base64') {
              currentChars += compressedBlock.source.data.length
            } else {
              currentChars += imageChars
            }
          } catch {
            // Si la compresión falla, se omite la imagen.
          }
        }
      }
    } else {
      result.push(block)
    }
  }

  return result
}

export async function mcpContentNeedsTruncation(
  content: MCPToolResult,
): Promise<boolean> {
  if (!content) return false

  // Usa un chequeo de tamaño como heurística para evitar llamadas
  // innecesarias a la API de conteo de tokens.
  const contentSizeEstimate = getContentSizeEstimate(content)
  if (
    contentSizeEstimate <=
    getMaxMcpOutputTokens() * MCP_TOKEN_COUNT_THRESHOLD_FACTOR
  ) {
    return false
  }

  try {
    const messages =
      typeof content === 'string'
        ? [{ role: 'user' as const, content }]
        : [{ role: 'user' as const, content }]

    const tokenCount = await requireAgentTokenEstimation().countMessagesTokensWithAPI(messages, [])
    return !!(tokenCount && tokenCount > getMaxMcpOutputTokens())
  } catch (error) {
    logError(error)
    // Asume que no hace falta truncar ante un error.
    return false
  }
}

export async function truncateMcpContent(
  content: MCPToolResult,
): Promise<MCPToolResult> {
  if (!content) return content

  const maxChars = getMaxMcpOutputChars()
  const truncationMsg = getTruncationMessage()

  if (typeof content === 'string') {
    return truncateString(content, maxChars) + truncationMsg
  } else {
    const truncatedBlocks = await truncateContentBlocks(
      content as ContentBlockParam[],
      maxChars,
    )
    truncatedBlocks.push({ type: 'text', text: truncationMsg })
    return truncatedBlocks
  }
}

export async function truncateMcpContentIfNeeded(
  content: MCPToolResult,
): Promise<MCPToolResult> {
  if (!(await mcpContentNeedsTruncation(content))) {
    return content
  }

  return await truncateMcpContent(content)
}
