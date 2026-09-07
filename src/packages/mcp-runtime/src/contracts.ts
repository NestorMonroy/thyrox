/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/contracts.ts` — sus 8
 * tipos, ninguno omitido. Sin imports en la fuente.
 *
 * Estado dinámico (no-SDK) de una conexión MCP. Lo mantiene el host del SDK
 * y se pasa a `handleMcpSetServers` / `reconcileMcpServers`. Los tipos de
 * runtime para clientes/herramientas/configs son genéricos — el paquete no
 * necesita conocer las formas concretas que declara la raíz del consumidor.
 */
export type DynamicMcpState<TConnection = unknown, TTools = unknown, TScopedConfig = unknown> = {
  clients: TConnection[]
  tools: TTools
  configs: Record<string, TScopedConfig>
}

export type ConfigScope =
  | 'local'
  | 'user'
  | 'project'
  | 'dynamic'
  | 'enterprise'
  | 'claudeai'
  | 'managed'

export type McpSdkServerConfig = {
  type: 'sdk'
  name: string
}

export type McpServerConfig = {
  type?: string
  [key: string]: unknown
}

export type ScopedMcpServerConfig = McpServerConfig & {
  scope: ConfigScope
  pluginSource?: string
}

export type MCPServerConnection = {
  name: string
  type: 'connected' | 'failed' | 'needs-auth' | 'pending' | 'disabled'
  config: ScopedMcpServerConfig
  capabilities?: unknown
  serverInfo?: {
    name: string
    version: string
  }
  instructions?: string
  error?: string
  reconnectAttempt?: number
  maxReconnectAttempts?: number
  client?: unknown
}

/**
 * Estado de los servidores MCP de SDK que corren en el proceso del SDK.
 * Paralelo a `DynamicMcpState` pero con configs de forma SDK.
 */
export type SdkMcpState<TConnection = unknown, TTools = unknown, TSdkConfig = unknown> = {
  configs: Record<string, TSdkConfig>
  clients: TConnection[]
  tools: TTools
}

/**
 * Resultado de `handleMcpSetServers` — el estado nuevo de ambos lados más un
 * sobre de respuesta para entregar de vuelta al cliente del SDK.
 */
export type McpSetServersResult<
  TResponse = unknown,
  TConnection = unknown,
  TTools = unknown,
  TScopedConfig = unknown,
  TSdkConfig = unknown,
> = {
  response: TResponse
  newSdkState: SdkMcpState<TConnection, TTools, TSdkConfig>
  newDynamicState: DynamicMcpState<TConnection, TTools, TScopedConfig>
  sdkServersChanged: boolean
}

export type McpRuntimeHostBindings<
  TMcpTool,
  TMcpCommand,
  TMcpResource,
  TMcpConfig,
  TMcpConnection,
> = {
  getMcpToolsCommandsAndResources: (
    onConnectionAttempt: (params: {
      client: TMcpConnection
      tools: TMcpTool[]
      commands: TMcpCommand[]
      resources?: TMcpResource[]
    }) => void,
    sdkMcpConfigs?: Record<string, TMcpConfig>,
  ) => Promise<void>
  prefetchAllMcpResources: (mcpConfigs: Record<string, TMcpConfig>) => Promise<{
    clients: TMcpConnection[]
    tools: TMcpTool[]
    commands: TMcpCommand[]
  }>
  connectAll?: (
    configs: Record<string, TMcpConfig>,
  ) => Promise<TMcpConnection[]>
  discover?: (
    configs?: Record<string, TMcpConfig>,
  ) => Promise<{
    clients: TMcpConnection[]
    tools: TMcpTool[]
    commands: TMcpCommand[]
    resources?: Record<string, TMcpResource[]>
  }>
  executeTool?: (call: {
    serverName: string
    serverConfig: TMcpConfig
    toolName: string
    input: Record<string, unknown>
    meta?: Record<string, unknown>
    signal?: AbortSignal
  }) => Promise<unknown>
  prefetchResources?: (
    configs: Record<string, TMcpConfig>,
  ) => Promise<{
    clients: TMcpConnection[]
    tools: TMcpTool[]
    commands: TMcpCommand[]
    resources?: Record<string, TMcpResource[]>
  }>
  /**
   * Handler del lado SDK para las peticiones de control `mcp_set_servers`.
   * Se instala desde la raíz del consumidor vía `runtimeHostSetup` (ese
   * archivo NO se portó en este pase — ver su docstring en ccnmt y el
   * hallazgo de esta iniciativa). Los tipos son opacos en la frontera del
   * paquete — quien llama castea el resultado a su especialización local.
   */
  handleMcpSetServers?: (
    servers: Record<string, unknown>,
    sdkState: unknown,
    dynamicState: unknown,
    setAppState: (f: (prev: unknown) => unknown) => void,
  ) => Promise<unknown>
  reconcileMcpServers?: (
    desiredConfigs: Record<string, unknown>,
    currentState: unknown,
    setAppState: (f: (prev: unknown) => unknown) => void,
  ) => Promise<unknown>
  legacy?: Record<string, unknown>
}
