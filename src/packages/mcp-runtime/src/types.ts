/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/types.ts` — todas sus
 * exportaciones, ninguna omitida.
 *
 * `@claude-code-how-works/config/mcpConfigSchema.js` se deja como
 * especificador colgante (deuda documentada, filtro de dos pasos): el
 * subpath NO está en el `exports` de `@thyrox/config` (que hoy sólo declara
 * `.`, `./types`, `./constants`, `./validation`, `./load`, `./env/utils`), así
 * que el segundo paso del filtro —resolución real— nunca llega a probarse.
 * El propio comentario de la fuente explica por qué el esquema vive un nivel
 * más abajo (config, no mcp-runtime): evitar un ciclo config → mcp-runtime
 * para llamadores como `config/plugin/_deps.ts`. Mientras `@thyrox/config` no
 * declare ese subpath, los quince tipos/esquemas de configuración de este
 * archivo quedan sin resolver en tiempo de ejecución; los ocho tipos propios
 * de abajo (conexión de servidor, recurso, estado de CLI) no dependen de
 * ellos para *declararse* — sólo los usan como anotación de tipo, que Bun no
 * evalúa en runtime.
 */

import type { Client } from '@modelcontextprotocol/sdk/client/index.js'
import type {
  Resource,
  ServerCapabilities,
} from '@modelcontextprotocol/sdk/types.js'

// Los esquemas y tipos con *forma* de configuración MCP viven en
// @claude-code-how-works/config (un nivel más abajo). Alojarlos aquí forzaba
// un ciclo config → mcp-runtime para llamadores como config/plugin/_deps.ts.
// Tras la mudanza, se reexportan desde este archivo para que los
// consumidores existentes (que importan de
// @claude-code-how-works/mcp-runtime/types) sigan funcionando sin cambios.
import {
  ConfigScopeSchema,
  type ConfigScope,
  TransportSchema,
  type Transport,
  McpStdioServerConfigSchema,
  McpSSEServerConfigSchema,
  McpSSEIDEServerConfigSchema,
  McpWebSocketIDEServerConfigSchema,
  McpHTTPServerConfigSchema,
  McpWebSocketServerConfigSchema,
  McpSdkServerConfigSchema,
  McpClaudeAIProxyServerConfigSchema,
  McpServerConfigSchema,
  type McpStdioServerConfig,
  type McpSSEServerConfig,
  type McpSSEIDEServerConfig,
  type McpWebSocketIDEServerConfig,
  type McpHTTPServerConfig,
  type McpWebSocketServerConfig,
  type McpSdkServerConfig,
  type McpClaudeAIProxyServerConfig,
  type McpServerConfig,
  type ScopedMcpServerConfig,
  McpJsonConfigSchema,
  type McpJsonConfig,
} from '@claude-code-how-works/config/mcpConfigSchema.js'

export {
  ConfigScopeSchema,
  type ConfigScope,
  TransportSchema,
  type Transport,
  McpStdioServerConfigSchema,
  McpSSEServerConfigSchema,
  McpSSEIDEServerConfigSchema,
  McpWebSocketIDEServerConfigSchema,
  McpHTTPServerConfigSchema,
  McpWebSocketServerConfigSchema,
  McpSdkServerConfigSchema,
  McpClaudeAIProxyServerConfigSchema,
  McpServerConfigSchema,
  type McpStdioServerConfig,
  type McpSSEServerConfig,
  type McpSSEIDEServerConfig,
  type McpWebSocketIDEServerConfig,
  type McpHTTPServerConfig,
  type McpWebSocketServerConfig,
  type McpSdkServerConfig,
  type McpClaudeAIProxyServerConfig,
  type McpServerConfig,
  type ScopedMcpServerConfig,
  McpJsonConfigSchema,
  type McpJsonConfig,
}

// Tipos de conexión de servidor
export type ConnectedMCPServer = {
  client: Client
  name: string
  type: 'connected'
  capabilities: ServerCapabilities
  serverInfo?: {
    name: string
    version: string
  }
  instructions?: string
  config: ScopedMcpServerConfig
  cleanup: () => Promise<void>
}

export type FailedMCPServer = {
  name: string
  type: 'failed'
  config: ScopedMcpServerConfig
  error?: string
}

export type NeedsAuthMCPServer = {
  name: string
  type: 'needs-auth'
  config: ScopedMcpServerConfig
}

export type PendingMCPServer = {
  name: string
  type: 'pending'
  config: ScopedMcpServerConfig
  reconnectAttempt?: number
  maxReconnectAttempts?: number
}

export type DisabledMCPServer = {
  name: string
  type: 'disabled'
  config: ScopedMcpServerConfig
}

export type MCPServerConnection =
  | ConnectedMCPServer
  | FailedMCPServer
  | NeedsAuthMCPServer
  | PendingMCPServer
  | DisabledMCPServer

// Tipos de recurso
export type ServerResource = Resource & { server: string }

// Tipos de estado de CLI de MCP
export interface SerializedTool {
  name: string
  description: string
  inputJSONSchema?: {
    [x: string]: unknown
    type: 'object'
    properties?: {
      [x: string]: unknown
    }
  }
  isMcp?: boolean
  originalToolName?: string // Nombre de herramienta original sin normalizar, del servidor MCP
}

export interface SerializedClient {
  name: string
  type: 'connected' | 'failed' | 'needs-auth' | 'pending' | 'disabled'
  capabilities?: ServerCapabilities
}

export interface MCPCliState {
  clients: SerializedClient[]
  configs: Record<string, ScopedMcpServerConfig>
  tools: SerializedTool[]
  resources: Record<string, ServerResource[]>
  normalizedNames?: Record<string, string> // Mapea nombres normalizados a los nombres originales
}
