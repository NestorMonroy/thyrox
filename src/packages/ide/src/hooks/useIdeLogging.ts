/**
 * Puerto de `ccnmt: packages/ide/src/hooks/useIdeLogging.ts`. `lazySchema`
 * viene de `@claude-code-how-works/tool-registry/utils/lazySchema.js` — el
 * paquete `tool-registry` no existe en este árbol; sustituto local en
 * `../internal/pendingCrossPackageDeps.js` (fábrica singleton perezosa de 3
 * líneas, sin dependencias).
 */
import { useEffect } from 'react'
import { z } from 'zod/v4'
import type { MCPServerConnection } from '@thyrox/mcp-runtime/types.js'
import {
  lazySchema,
  requireLocalObservabilityRoot,
} from '../internal/pendingCrossPackageDeps.js'
import { getConnectedIdeClient } from '../ide.js'

const LogEventSchema = lazySchema(() =>
  z.object({
    method: z.literal('log_event'),
    params: z.object({
      eventName: z.string(),
      eventData: z.object({}).passthrough(),
    }),
  }),
)

export function useIdeLogging(mcpClients: MCPServerConnection[]): void {
  useEffect(() => {
    // Se salta si no hay clientes.
    if (!mcpClients.length) {
      return
    }

    // Busca el cliente de IDE en la lista de clientes MCP.
    const ideClient = getConnectedIdeClient(mcpClients)
    if (ideClient) {
      const { logEvent } = requireLocalObservabilityRoot()
      // Registra el handler de log event.
      ideClient.client.setNotificationHandler(
        LogEventSchema(),
        notification => {
          const { eventName, eventData } = notification.params
          logEvent(
            `tengu_ide_${eventName}`,
            eventData as { [key: string]: boolean | number | undefined },
          )
        },
      )
    }
  }, [mcpClients])
}
