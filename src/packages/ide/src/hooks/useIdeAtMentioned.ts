/**
 * Puerto de `ccnmt: packages/ide/src/hooks/useIdeAtMentioned.ts`.
 * `lazySchema` — ver la nota de `useIdeLogging.ts`.
 */
import { useEffect, useRef } from 'react'
import { z } from 'zod/v4'
import type {
  ConnectedMCPServer,
  MCPServerConnection,
} from '@thyrox/mcp-runtime/types.js'
import {
  lazySchema,
  requireLocalObservabilityLogging,
} from '../internal/pendingCrossPackageDeps.js'
import { getConnectedIdeClient } from '../ide.js'

export type IDEAtMentioned = {
  filePath: string
  lineStart?: number
  lineEnd?: number
}

const NOTIFICATION_METHOD = 'at_mentioned'

const AtMentionedSchema = lazySchema(() =>
  z.object({
    method: z.literal(NOTIFICATION_METHOD),
    params: z.object({
      filePath: z.string(),
      lineStart: z.number().optional(),
      lineEnd: z.number().optional(),
    }),
  }),
)

/**
 * Hook que rastrea las notificaciones de at-mention del IDE, registrándose
 * directamente en los handlers de notificación del cliente MCP.
 */
export function useIdeAtMentioned(
  mcpClients: MCPServerConnection[],
  onAtMentioned: (atMentioned: IDEAtMentioned) => void,
): void {
  const ideClientRef = useRef<ConnectedMCPServer | undefined>(undefined)

  useEffect(() => {
    // Busca el cliente de IDE en la lista de clientes MCP.
    const ideClient = getConnectedIdeClient(mcpClients)

    if (ideClientRef.current !== ideClient) {
      ideClientRef.current = ideClient
    }

    // Si se encontró un cliente de IDE conectado, se registra el handler.
    if (ideClient) {
      const { logError } = requireLocalObservabilityLogging()
      ideClient.client.setNotificationHandler(
        AtMentionedSchema(),
        notification => {
          if (ideClientRef.current !== ideClient) {
            return
          }
          try {
            const data = notification.params
            // Ajusta los números de línea a base-1 en vez de base-0.
            const lineStart =
              data.lineStart !== undefined ? data.lineStart + 1 : undefined
            const lineEnd =
              data.lineEnd !== undefined ? data.lineEnd + 1 : undefined
            onAtMentioned({
              filePath: data.filePath,
              lineStart: lineStart,
              lineEnd: lineEnd,
            })
          } catch (error) {
            logError(error as Error)
          }
        },
      )
    }

    // No hace falta cleanup, los clientes MCP gestionan su propio ciclo de vida.
  }, [mcpClients, onAtMentioned])
}
