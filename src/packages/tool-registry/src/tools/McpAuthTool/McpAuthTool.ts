/**
 * Puerto FIEL y COMPLETO de
 * `ccnmt: packages/tool-registry/src/tools/McpAuthTool/McpAuthTool.ts`
 * (TASK #232, porte de `tool-registry`). Sin componente `.tsx` en la
 * fuente — este archivo no depende de React/Ink en ningún punto.
 *
 * `logMCPDebug`/`logMCPError` se importan de `@thyrox/local-observability/log.js`,
 * no de `.../logging` como la fuente: el `package.json` de ese paquete
 * hermano declara el subpath `"./logging"` apuntando a
 * `src/logging/index.ts`, que no existe ahí — el archivo real que exporta
 * ambos símbolos es `src/log.ts` (subpath `./log.js`, medido que sí
 * resuelve). Mismo símbolo, mismo comportamiento; sólo cambia la ruta por
 * la que se alcanza en este árbol. No es responsabilidad de este paquete
 * corregir el `package.json` de `local-observability`.
 *
 * `performMCPOAuthFlow` (`@thyrox/mcp-runtime/auth.js`),
 * `clearMcpAuthCache`/`reconnectMcpServerImpl`
 * (`@thyrox/mcp-runtime/clientRuntime.js`) — genuinamente ausentes hoy: son
 * 2 de los 13 módulos de `mcp-runtime` bloqueados por la ausencia HISTÓRICA
 * de `tool-registry` (ver la descripción de `mcp-runtime/package.json`).
 * Es el ciclo inverso: este archivo ya no bloquea en `tool-registry` — el
 * import se deja apuntando al sitio real y queda pendiente de que
 * `mcp-runtime` porte esos dos archivos.
 */
import reject from 'lodash-es/reject.js'
import { z } from 'zod/v4'
import { performMCPOAuthFlow } from '@thyrox/mcp-runtime/auth.js'
import {
  clearMcpAuthCache,
  reconnectMcpServerImpl,
} from '@thyrox/mcp-runtime/clientRuntime.js'
import {
  buildMcpToolName,
  getMcpPrefix,
} from '@thyrox/mcp-runtime/mcpStringUtils.js'
import type {
  McpHTTPServerConfig,
  McpSSEServerConfig,
  ScopedMcpServerConfig,
} from '@thyrox/mcp-runtime/types.js'
import type { Tool } from '../../Tool.js'
import { errorMessage } from '@thyrox/local-observability/errorHelpers.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { logMCPDebug, logMCPError } from '@thyrox/local-observability/log.js'
import type { PermissionDecision } from '@thyrox/permission/PermissionResult'

const inputSchema = lazySchema(() => z.object({}))
type InputSchema = ReturnType<typeof inputSchema>

export type McpAuthOutput = {
  status: 'auth_url' | 'unsupported' | 'error'
  message: string
  authUrl?: string
}

function getConfigUrl(config: ScopedMcpServerConfig): string | undefined {
  if ('url' in config) return config.url
  return undefined
}

/**
 * Crea una pseudo-herramienta para un servidor MCP que está instalado pero
 * no autenticado. Sale a la superficie en lugar de las herramientas reales
 * del servidor, para que el modelo sepa que el servidor existe y pueda
 * arrancar el flujo OAuth en nombre del usuario.
 *
 * Al llamarla, arranca performMCPOAuthFlow con skipBrowserOpen y devuelve
 * la URL de autorización. El callback de OAuth se completa en background;
 * cuando dispara, corre reconnectMcpServerImpl y las herramientas reales
 * del servidor se intercambian en appState.mcp.tools vía el reemplazo por
 * prefijo ya existente (useManageMCPConnections.updateServer borra
 * cualquier cosa que empareje con mcp__<server>__*, así que esta
 * pseudo-herramienta se elimina automáticamente).
 */
export function createMcpAuthTool(
  serverName: string,
  config: ScopedMcpServerConfig,
): Tool<InputSchema, McpAuthOutput> {
  const url = getConfigUrl(config)
  const transport = config.type ?? 'stdio'
  const location = url ? `${transport} at ${url}` : transport

  const description =
    `The \`${serverName}\` MCP server (${location}) is installed but requires authentication. ` +
    `Call this tool to start the OAuth flow — you'll receive an authorization URL to share with the user. ` +
    `Once the user completes authorization in their browser, the server's real tools will become available automatically.`

  return {
    name: buildMcpToolName(serverName, 'authenticate'),
    isMcp: true,
    mcpInfo: { serverName, toolName: 'authenticate' },
    isEnabled: () => true,
    isConcurrencySafe: () => false,
    isReadOnly: () => false,
    toAutoClassifierInput: () => serverName,
    userFacingName: () => `${serverName} - authenticate (MCP)`,
    maxResultSizeChars: 10_000,
    renderToolUseMessage: () => `Authenticate ${serverName} MCP server`,
    async description() {
      return description
    },
    async prompt() {
      return description
    },
    get inputSchema(): InputSchema {
      return inputSchema()
    },
    async checkPermissions(input): Promise<PermissionDecision> {
      return { behavior: 'allow', updatedInput: input }
    },
    async call(_input, context) {
      // Los conectores MCP de claude.ai usan un flujo de auth separado
      // (handleClaudeAIAuth en MCPRemoteServerMenu) que aquí no se invoca
      // programáticamente — sólo se apunta al usuario a /mcp.
      if (config.type === 'claudeai-proxy') {
        return {
          data: {
            status: 'unsupported' as const,
            message: `This is a claude.ai MCP connector. Ask the user to run /mcp and select "${serverName}" to authenticate.`,
          },
        }
      }

      // performMCPOAuthFlow sólo acepta sse/http. El estado needs-auth
      // sólo se fija en un HTTP 401 (UnauthorizedError), así que otros
      // transportes no deberían llegar aquí, pero se cubre defensivamente.
      if (config.type !== 'sse' && config.type !== 'http') {
        return {
          data: {
            status: 'unsupported' as const,
            message: `Server "${serverName}" uses ${transport} transport which does not support OAuth from this tool. Ask the user to run /mcp and authenticate manually.`,
          },
        }
      }

      const sseOrHttpConfig = config as (
        | McpSSEServerConfig
        | McpHTTPServerConfig
      ) & { scope: ScopedMcpServerConfig['scope'] }

      // Refleja mcp_authenticate de cli/print.ts: arranca el flujo, captura
      // la URL vía onAuthorizationUrl, la devuelve de inmediato. La Promise
      // del flujo resuelve más tarde cuando dispara el callback del
      // navegador.
      let resolveAuthUrl: ((url: string) => void) | undefined
      const authUrlPromise = new Promise<string>(resolve => {
        resolveAuthUrl = resolve
      })

      const controller = new AbortController()
      const { setAppState } = context

      const oauthPromise = performMCPOAuthFlow(
        serverName,
        sseOrHttpConfig,
        u => resolveAuthUrl?.(u),
        controller.signal,
        { skipBrowserOpen: true },
      )

      // Continuación en background: una vez que OAuth completa, reconecta
      // e intercambia las herramientas reales en appState. El reemplazo
      // por prefijo elimina esta pseudo-herramienta porque comparte el
      // prefijo mcp__<server>__.
      void oauthPromise
        .then(async () => {
          clearMcpAuthCache()
          const result = await reconnectMcpServerImpl(serverName, config)
          const prefix = getMcpPrefix(serverName)
          setAppState(prev => ({
            ...prev,
            mcp: {
              ...prev.mcp,
              clients: prev.mcp.clients.map(c =>
                c.name === serverName ? result.client : c,
              ),
              tools: [
                ...reject(prev.mcp.tools, t => t.name?.startsWith(prefix)),
                ...result.tools,
              ],
              commands: [
                ...reject(prev.mcp.commands, c => c.name?.startsWith(prefix)),
                ...result.commands,
              ],
              resources: result.resources
                ? { ...prev.mcp.resources, [serverName]: result.resources }
                : prev.mcp.resources,
            },
          }))
          logMCPDebug(
            serverName,
            `OAuth complete, reconnected with ${result.tools.length} tool(s)`,
          )
        })
        .catch(err => {
          logMCPError(
            serverName,
            `OAuth flow failed after tool-triggered start: ${errorMessage(err)}`,
          )
        })

      try {
        // Carrera: obtiene la URL, o el flujo completa sin necesitar una
        // (p. ej. XAA con token de IdP en caché — auth silenciosa).
        const authUrl = await Promise.race([
          authUrlPromise,
          oauthPromise.then(() => null as string | null),
        ])

        if (authUrl) {
          return {
            data: {
              status: 'auth_url' as const,
              authUrl,
              message: `Ask the user to open this URL in their browser to authorize the ${serverName} MCP server:\n\n${authUrl}\n\nOnce they complete the flow, the server's tools will become available automatically.`,
            },
          }
        }

        return {
          data: {
            status: 'auth_url' as const,
            message: `Authentication completed silently for ${serverName}. The server's tools should now be available.`,
          },
        }
      } catch (err) {
        return {
          data: {
            status: 'error' as const,
            message: `Failed to start OAuth flow for ${serverName}: ${errorMessage(err)}. Ask the user to run /mcp and authenticate manually.`,
          },
        }
      }
    },
    mapToolResultToToolResultBlockParam(data, toolUseID) {
      return {
        tool_use_id: toolUseID,
        type: 'tool_result',
        content: data.message,
      }
    },
  } satisfies Tool<InputSchema, McpAuthOutput>
}
