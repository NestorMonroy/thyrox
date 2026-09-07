/**
 * Puerto FIEL y COMPLETO de la LÓGICA de
 * `ccnmt: packages/tool-registry/src/tools/ListMcpResourcesTool/
 * ListMcpResourcesTool.ts` (TASK #232, porte de `tool-registry`).
 *
 * `isOutputLineTruncated` se importa del sustituto local
 * (`internal/pendingCrossPackageDeps.ts`), no de
 * `@thyrox/output/terminal.js`: ese subpath no existe todavía en el
 * paquete hermano `output` — ver el docstring del sustituto para la
 * fidelidad exacta.
 *
 * `renderToolResultMessage` (de `./UI.js`) está BLOQUEADO ahí — ver
 * `ListMcpResourcesTool/UI.ts` — pero el módulo entero carga sin fallar:
 * este archivo importa el símbolo (una función), no lo invoca en carga.
 */
import { z } from 'zod/v4'
import {
  ensureConnectedClient,
  fetchResourcesForClient,
} from '@thyrox/mcp-runtime/clientRuntime.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { errorMessage } from '@thyrox/local-observability/errorHelpers.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { logMCPError } from '@thyrox/local-observability/log.js'
import { jsonStringify } from '@thyrox/local-observability/slowOperations.js'
import { isOutputLineTruncated } from '../../internal/pendingCrossPackageDeps.js'
import { DESCRIPTION, LIST_MCP_RESOURCES_TOOL_NAME, PROMPT } from './prompt.js'
import { renderToolResultMessage, renderToolUseMessage } from './UI.js'

const inputSchema = lazySchema(() =>
  z.object({
    server: z
      .string()
      .optional()
      .describe('Optional server name to filter resources by'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.array(
    z.object({
      uri: z.string().describe('Resource URI'),
      name: z.string().describe('Resource name'),
      mimeType: z.string().optional().describe('MIME type of the resource'),
      description: z.string().optional().describe('Resource description'),
      server: z.string().describe('Server that provides this resource'),
    }),
  ),
)
type OutputSchema = ReturnType<typeof outputSchema>

export type Output = z.infer<OutputSchema>

export const ListMcpResourcesTool = buildTool({
  isConcurrencySafe() {
    return true
  },
  isReadOnly() {
    return true
  },
  toAutoClassifierInput(input) {
    return input.server ?? ''
  },
  shouldDefer: true,
  name: LIST_MCP_RESOURCES_TOOL_NAME,
  searchHint: 'list resources from connected MCP servers',
  maxResultSizeChars: 100_000,
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return PROMPT
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  async call(input, { options: { mcpClients } }) {
    const { server: targetServer } = input

    const clientsToProcess = targetServer
      ? mcpClients.filter(client => client.name === targetServer)
      : mcpClients

    if (targetServer && clientsToProcess.length === 0) {
      throw new Error(
        `Server "${targetServer}" not found. Available servers: ${mcpClients.map(c => c.name).join(', ')}`,
      )
    }

    // fetchResourcesForClient está cacheado con LRU (por nombre de
    // servidor) y ya viene caliente del prefetch al arrancar. La caché se
    // invalida en onclose y en notificaciones resources/list_changed, así
    // que los resultados nunca quedan obsoletos. ensureConnectedClient es
    // un no-op cuando está sano (hit de memoize), pero tras onclose
    // devuelve una conexión fresca para que el re-fetch tenga éxito.
    const results = await Promise.all(
      clientsToProcess.map(async client => {
        if (client.type !== 'connected') return []
        try {
          const fresh = await ensureConnectedClient(client)
          return await fetchResourcesForClient(fresh)
        } catch (error) {
          // El fallo de reconexión de un servidor no debe hundir el
          // resultado entero.
          logMCPError(client.name, errorMessage(error))
          return []
        }
      }),
    )

    return {
      data: results.flat(),
    }
  },
  renderToolUseMessage,
  userFacingName: () => 'listMcpResources',
  renderToolResultMessage,
  isResultTruncated(output: Output): boolean {
    return isOutputLineTruncated(jsonStringify(output))
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    if (!content || content.length === 0) {
      return {
        tool_use_id: toolUseID,
        type: 'tool_result',
        content:
          'No resources found. MCP servers may still provide tools even if they have no resources.',
      }
    }
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: jsonStringify(content),
    }
  },
} satisfies ToolDef<InputSchema, Output>)
