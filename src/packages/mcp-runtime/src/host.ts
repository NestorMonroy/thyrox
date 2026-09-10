/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/host.ts` — sus 2
 * exportaciones, ninguna omitida.
 *
 * Registro del único punto de enganche del paquete con la raíz del
 * consumidor: quien hospeda mcp-runtime instala sus `bindings` una vez
 * (`installMcpRuntimeHostBindings`) y todo el resto del paquete las lee a
 * través de `getMcpRuntimeHostBindings`.
 */
import type { McpRuntimeHostBindings } from './contracts.js'
import { HostBindingsError } from './errors.js'

type AnyMcpRuntimeHostBindings = McpRuntimeHostBindings<
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>

let mcpRuntimeHostBindings: AnyMcpRuntimeHostBindings | null = null

export function installMcpRuntimeHostBindings<
  TMcpTool,
  TMcpCommand,
  TMcpResource,
  TMcpConfig,
  TMcpConnection,
>(
  bindings: McpRuntimeHostBindings<
    TMcpTool,
    TMcpCommand,
    TMcpResource,
    TMcpConfig,
    TMcpConnection
  >,
): void {
  mcpRuntimeHostBindings = bindings as unknown as AnyMcpRuntimeHostBindings
}

export function getMcpRuntimeHostBindings<
  TMcpTool,
  TMcpCommand,
  TMcpResource,
  TMcpConfig,
  TMcpConnection,
>(): McpRuntimeHostBindings<
  TMcpTool,
  TMcpCommand,
  TMcpResource,
  TMcpConfig,
  TMcpConnection
> {
  if (!mcpRuntimeHostBindings) {
    throw new HostBindingsError(
      'MCP runtime host bindings have not been installed. Install host bindings before using @claude-code-how-works/mcp-runtime runtime APIs.',
    )
  }
  return mcpRuntimeHostBindings as McpRuntimeHostBindings<
    TMcpTool,
    TMcpCommand,
    TMcpResource,
    TMcpConfig,
    TMcpConnection
  >
}
