/**
 * Tipos de la vista `/mcp`: un servidor conectado, un servidor declarado por
 * un agente y el estado de navegación de la vista.
 *
 * PROCEDENCIA. Eran stubs `unknown` («Auto-generated stub»), y de ahí salían
 * ~150 TS18046 en los componentes que los leen. Ni `_references/restored-src`,
 * ni `ccb`, ni `claude-code` traen estas declaraciones, y en el ejecutable no
 * existen porque los tipos se borran al compilar. Se derivan del ÁRBOL:
 *
 * - la forma de `ServerInfo` es la que construye `MCPSettings.tsx` (una rama
 *   por transporte sobre `baseInfo = { name, client, scope }`);
 * - la de `AgentMcpServerInfo`, la que construye `extractAgentMcpServers` en
 *   `mcp-runtime/src/utils.ts` y la que lee `MCPAgentServerMenu.tsx`;
 * - `MCPViewState`, los cinco `case` de `MCPSettings.tsx` y sus `setViewState`.
 *
 * CIEGO A: un campo que el binario original declare y ningún sitio del árbol
 * construya ni lea — no hay de dónde derivarlo.
 */
import type {
  ConfigScope,
  MCPServerConnection,
  McpClaudeAIProxyServerConfig,
  McpHTTPServerConfig,
  McpSSEServerConfig,
  McpStdioServerConfig,
} from '@thyrox/mcp-runtime/types.js'

type BaseServerInfo = {
  name: string
  client: MCPServerConnection
  scope: ConfigScope
}

export type StdioServerInfo = BaseServerInfo & {
  transport: 'stdio'
  config: McpStdioServerConfig
}

export type SSEServerInfo = BaseServerInfo & {
  transport: 'sse'
  isAuthenticated: boolean | undefined
  config: McpSSEServerConfig
}

export type HTTPServerInfo = BaseServerInfo & {
  transport: 'http'
  isAuthenticated: boolean | undefined
  config: McpHTTPServerConfig
}

export type ClaudeAIServerInfo = BaseServerInfo & {
  transport: 'claudeai-proxy'
  // `MCPSettings.tsx` construye con `false` y `ManagePlugins.tsx` con
  // `undefined`: los dos constructores del árbol fijan el tipo.
  isAuthenticated: boolean | undefined
  config: McpClaudeAIProxyServerConfig
}

export type ServerInfo = StdioServerInfo | SSEServerInfo | HTTPServerInfo | ClaudeAIServerInfo

/**
 * Plano y no una unión por transporte: `MCPAgentServerMenu.tsx`, su único
 * lector, consulta `command`, `url` e `isAuthenticated` sin estrechar por
 * `transport`. Nadie del árbol asigna `isAuthenticated`: se lee como ausente.
 */
export type AgentMcpServerInfo = {
  name: string
  sourceAgents: string[]
  transport: 'stdio' | 'sse' | 'http' | 'ws'
  command?: string
  url?: string
  needsAuth: boolean
  isAuthenticated?: boolean
}

export type MCPViewState =
  | { type: 'list'; defaultTab?: string }
  | { type: 'server-menu'; server: ServerInfo }
  | { type: 'server-tools'; server: ServerInfo }
  | { type: 'server-tool-detail'; server: ServerInfo; toolIndex: number }
  | { type: 'agent-server-menu'; agentServer: AgentMcpServerInfo }
