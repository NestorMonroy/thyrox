/**
 * Puerto de `ccnmt: packages/config/mcpConfigSchema.ts` (197 líneas fuente).
 * Esquemas + tipos de configuración de servidores MCP. Reimplementación
 * fiel: mismos nombres de esquema, mismos campos, misma unión discriminada.
 *
 * Vive en `config` (no en `mcp-runtime`) por la misma razón que la fuente
 * documenta: estos esquemas describen la FORMA del archivo de config, no el
 * comportamiento en tiempo de ejecución — pertenecen a la capa que ya posee
 * el parseo de config. Los tipos de runtime (conexiones vivas, estado de
 * CLI MCP) no viajan aquí; describen objetos de conexión, no forma de
 * archivo.
 *
 * `zod/v4` resuelve tal cual (verificado con `Bun.resolveSync`); `lazySchema`
 * es la dependencia de hoja portada en `./internal/lazySchema.ts`.
 */
import { z } from 'zod/v4'
import { lazySchema } from './internal/lazySchema.js'

const requestTimeoutField = {
  request_timeout_ms: z.number().int().positive().optional(),
}

// Esquemas y tipos de configuración
export const ConfigScopeSchema = lazySchema(() =>
  z.enum([
    'local',
    'user',
    'project',
    'dynamic',
    'enterprise',
    'claudeai',
    'managed',
  ]),
)
export type ConfigScope = z.infer<ReturnType<typeof ConfigScopeSchema>>

export const TransportSchema = lazySchema(() =>
  z.enum(['stdio', 'sse', 'sse-ide', 'http', 'ws', 'sdk']),
)
export type Transport = z.infer<ReturnType<typeof TransportSchema>>

export const McpStdioServerConfigSchema = lazySchema(() =>
  z.object({
    type: z.literal('stdio').optional(), // Opcional por compatibilidad hacia atrás
    command: z.string().min(1, 'Command cannot be empty'),
    args: z.array(z.string()).default([]),
    env: z.record(z.string(), z.string()).optional(),
    ...requestTimeoutField,
  }),
)

// Cross-App Access (XAA / SEP-990): sólo una bandera por servidor. Los
// detalles de conexión del IdP (issuer, clientId, callbackPort) vienen de
// settings.xaaIdp — configurados una vez, compartidos por todos los
// servidores con XAA habilitado. clientId/clientSecret (config oauth padre +
// slot de keychain) son para el AS del servidor MCP.
const McpXaaConfigSchema = lazySchema(() => z.boolean())

const McpOAuthConfigSchema = lazySchema(() =>
  z.object({
    clientId: z.string().optional(),
    callbackPort: z.number().int().positive().optional(),
    authServerMetadataUrl: z
      .string()
      .url()
      .startsWith('https://', {
        message: 'authServerMetadataUrl must use https://',
      })
      .optional(),
    xaa: McpXaaConfigSchema().optional(),
  }),
)

export const McpSSEServerConfigSchema = lazySchema(() =>
  z.object({
    type: z.literal('sse'),
    url: z.string(),
    headers: z.record(z.string(), z.string()).optional(),
    headersHelper: z.string().optional(),
    oauth: McpOAuthConfigSchema().optional(),
    ...requestTimeoutField,
  }),
)

// Tipo de servidor sólo-interno para extensiones de IDE
export const McpSSEIDEServerConfigSchema = lazySchema(() =>
  z.object({
    type: z.literal('sse-ide'),
    url: z.string(),
    ideName: z.string(),
    ideRunningInWindows: z.boolean().optional(),
  }),
)

// Tipo de servidor sólo-interno para extensiones de IDE
export const McpWebSocketIDEServerConfigSchema = lazySchema(() =>
  z.object({
    type: z.literal('ws-ide'),
    url: z.string(),
    ideName: z.string(),
    authToken: z.string().optional(),
    ideRunningInWindows: z.boolean().optional(),
  }),
)

export const McpHTTPServerConfigSchema = lazySchema(() =>
  z.object({
    type: z.literal('http'),
    url: z.string(),
    headers: z.record(z.string(), z.string()).optional(),
    headersHelper: z.string().optional(),
    oauth: McpOAuthConfigSchema().optional(),
    ...requestTimeoutField,
  }),
)

export const McpWebSocketServerConfigSchema = lazySchema(() =>
  z.object({
    type: z.literal('ws'),
    url: z.string(),
    headers: z.record(z.string(), z.string()).optional(),
    headersHelper: z.string().optional(),
    ...requestTimeoutField,
  }),
)

export const McpSdkServerConfigSchema = lazySchema(() =>
  z.object({
    type: z.literal('sdk'),
    name: z.string(),
    ...requestTimeoutField,
  }),
)

// Tipo de config para servidores proxy de claude.ai
export const McpClaudeAIProxyServerConfigSchema = lazySchema(() =>
  z.object({
    type: z.literal('claudeai-proxy'),
    url: z.string(),
    id: z.string(),
    ...requestTimeoutField,
  }),
)

export const McpServerConfigSchema = lazySchema(() =>
  z.union([
    McpStdioServerConfigSchema(),
    McpSSEServerConfigSchema(),
    McpSSEIDEServerConfigSchema(),
    McpWebSocketIDEServerConfigSchema(),
    McpHTTPServerConfigSchema(),
    McpWebSocketServerConfigSchema(),
    McpSdkServerConfigSchema(),
    McpClaudeAIProxyServerConfigSchema(),
  ]),
)

export type McpStdioServerConfig = z.infer<
  ReturnType<typeof McpStdioServerConfigSchema>
>
export type McpSSEServerConfig = z.infer<
  ReturnType<typeof McpSSEServerConfigSchema>
>
export type McpSSEIDEServerConfig = z.infer<
  ReturnType<typeof McpSSEIDEServerConfigSchema>
>
export type McpWebSocketIDEServerConfig = z.infer<
  ReturnType<typeof McpWebSocketIDEServerConfigSchema>
>
export type McpHTTPServerConfig = z.infer<
  ReturnType<typeof McpHTTPServerConfigSchema>
>
export type McpWebSocketServerConfig = z.infer<
  ReturnType<typeof McpWebSocketServerConfigSchema>
>
export type McpSdkServerConfig = z.infer<
  ReturnType<typeof McpSdkServerConfigSchema>
>
export type McpClaudeAIProxyServerConfig = z.infer<
  ReturnType<typeof McpClaudeAIProxyServerConfigSchema>
>
export type McpServerConfig = z.infer<ReturnType<typeof McpServerConfigSchema>>

export type ScopedMcpServerConfig = McpServerConfig & {
  scope: ConfigScope
  // Para servidores provistos por plugin: el `source` (LoadedPlugin.source)
  // del plugin que lo provee (p. ej. 'slack@anthropic'). Guardado al
  // construir el config para que el gate de canal no compita con la
  // hidratación de AppState.plugins.enabled.
  pluginSource?: string
}

export const McpJsonConfigSchema = lazySchema(() =>
  z.object({
    mcpServers: z.record(z.string(), McpServerConfigSchema()),
  }),
)

export type McpJsonConfig = z.infer<ReturnType<typeof McpJsonConfigSchema>>
