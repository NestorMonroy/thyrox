/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/mcpValidation.ts` —
 * sus 6 exportaciones (2 constantes, 4 funciones), ninguna omitida.
 *
 * Repuntado (subpath declarado y símbolo verificado con resolución real):
 * `@thyrox/local-observability/logging` (`logError`),
 * `@thyrox/config/feature-flags` (`getFeatureValue_CACHED_MAY_BE_STALE`) y
 * `@thyrox/agent/tokenEstimation.js` (`countMessagesTokensWithAPI`,
 * `roughTokenCountEstimation`). Los tres son `import` ESTÁTICO.
 *
 * Los dos últimos llegaron por `require()` diferido mientras su subpath no
 * resolvía —un `import` estático de un specifier inexistente hace fallar la
 * carga del MÓDULO ENTERO, no sólo la función que lo usa—. Esa razón se
 * cerró: el `exports` de cada paquete declara hoy su patrón `./*` / `./*.js`,
 * y `feature-flags.ts` existe en `@thyrox/config` (el sitio que la fuente le
 * da). Sin la razón, el diferido es un lazy import sin excepción declarada
 * (`no-lazy-imports.md`), así que se retira.
 *
 * `@thyrox/storage/imageResizer.js` (`compressImageBlock`) SÍ sigue como
 * `require()` diferido, y la razón NO es la que este docstring afirmaba. Decía
 * que el módulo «no está portado»; es falso, y medirlo lo desmiente:
 * `storage/src/imageResizer.ts` existe y exporta `compressImageBlock`. Lo que
 * falta es la ARISTA DE PAQUETE — `@thyrox/storage` no figura en las
 * `dependencies` de `@thyrox/mcp-runtime` (ni la fuente declara ninguna: su
 * `packages/mcp-runtime/package.json` trae `dependencies` vacías, y resuelve
 * por el `workspaces` de su raíz, que este árbol todavía no declara).
 *
 * La distinción decide el arreglo, y por eso se escribe: un módulo ausente se
 * paga portándolo; una arista ausente se paga cableando `workspaces` y
 * reinstalando (#239). Hasta entonces el diferido es lo que impide que un
 * specifier irresoluble tumbe la carga del módulo entero.
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
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import * as AgentTokenEstimation from '@thyrox/agent/tokenEstimation.js'

function requireStorageImageResizer(): {
  compressImageBlock: (
    block: ImageBlockParam,
    maxBytes: number,
  ) => Promise<ImageBlockParam>
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/storage/imageResizer.js')
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
  const overrides = getFeatureValue_CACHED_MAY_BE_STALE<Record<
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
    return AgentTokenEstimation.roughTokenCountEstimation(content)
  }

  const { roughTokenCountEstimation } = AgentTokenEstimation
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

    const tokenCount = await AgentTokenEstimation.countMessagesTokensWithAPI(messages, [])
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
