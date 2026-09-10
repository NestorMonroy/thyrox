/**
 * Puerto de `ccnmt: packages/server/src/remote/remotePermissionBridge.ts`.
 * `SDKControlPermissionRequest` — sólo TIPO, de
 * `@thyrox/headless-sdk/controlTypes.js`.
 * `Tool` — sólo TIPO, de `@thyrox/tool-registry/Tool.js` (el paquete
 * `tool-registry` no existe en este árbol; erasado en runtime, así que no
 * hace falta que exista).
 * `AssistantMessage` — sólo TIPO, de `@thyrox/agent/messageShapes.js`.
 * `jsonStringify` — ver `../internal/pendingCrossPackageDeps.js`.
 */
import { randomUUID } from 'crypto'
import type { SDKControlPermissionRequest } from '@thyrox/headless-sdk/controlTypes.js'
import type { Tool } from '@thyrox/tool-registry/Tool.js'
import type { AssistantMessage } from '@thyrox/agent/messageShapes.js'
import { requireLocalObservabilitySlowOperations } from '../internal/pendingCrossPackageDeps.js'

/**
 * Crea un AssistantMessage sintético para peticiones de permiso remotas.
 * ToolUseConfirm exige un AssistantMessage, pero en modo remoto no
 * tenemos uno real — la llamada a la herramienta corre en el contenedor CCR.
 */
export function createSyntheticAssistantMessage(
  request: SDKControlPermissionRequest,
  requestId: string,
): AssistantMessage {
  return {
    type: 'assistant',
    uuid: randomUUID(),
    message: {
      id: `remote-${requestId}`,
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: request.tool_use_id,
          name: request.tool_name,
          input: request.input,
        },
      ],
      model: '',
      stop_reason: null,
      stop_sequence: null,
      container: null,
      context_management: null,
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
    } as AssistantMessage['message'],
    requestId: undefined,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Crea un stub mínimo de Tool para herramientas que no están cargadas
 * localmente. Esto pasa cuando el CCR remoto tiene herramientas (p. ej.
 * herramientas MCP) que el CLI local no conoce. El stub enruta a
 * FallbackPermissionRequest.
 */
export function createToolStub(toolName: string): Tool {
  return {
    name: toolName,
    inputSchema: {} as Tool['inputSchema'],
    isEnabled: () => true,
    userFacingName: () => toolName,
    renderToolUseMessage: (input: Record<string, unknown>) => {
      const { jsonStringify } = requireLocalObservabilitySlowOperations()
      const entries = Object.entries(input)
      if (entries.length === 0) return ''
      return entries
        .slice(0, 3)
        .map(([key, value]) => {
          const valueStr =
            typeof value === 'string' ? value : jsonStringify(value)
          return `${key}: ${valueStr}`
        })
        .join(', ')
    },
    call: async () => ({ data: '' }),
    description: async () => '',
    prompt: () => '',
    isReadOnly: () => false,
    isMcp: false,
    needsPermissions: () => true,
  } as unknown as Tool
}
