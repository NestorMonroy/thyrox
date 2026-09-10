/**
 * Puerto de `ccnmt: packages/ide/src/hooks/useIdeSelection.ts`.
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

export type SelectionPoint = {
  line: number
  character: number
}

export type SelectionData = {
  selection: {
    start: SelectionPoint
    end: SelectionPoint
  } | null
  text?: string
  filePath?: string
}

export type IDESelection = {
  lineCount: number
  lineStart?: number
  text?: string
  filePath?: string
}

// Define el schema de la notificación selection_changed.
const SelectionChangedSchema = lazySchema(() =>
  z.object({
    method: z.literal('selection_changed'),
    params: z.object({
      selection: z
        .object({
          start: z.object({
            line: z.number(),
            character: z.number(),
          }),
          end: z.object({
            line: z.number(),
            character: z.number(),
          }),
        })
        .nullable()
        .optional(),
      text: z.string().optional(),
      filePath: z.string().optional(),
    }),
  }),
)

/**
 * Hook que rastrea la información de selección de texto del IDE,
 * registrándose directamente en los handlers de notificación del cliente MCP.
 */
export function useIdeSelection(
  mcpClients: MCPServerConnection[],
  onSelect: (selection: IDESelection) => void,
): void {
  const handlersRegistered = useRef(false)
  const currentIDERef = useRef<ConnectedMCPServer | null>(null)

  useEffect(() => {
    // Busca el cliente de IDE en la lista de clientes MCP.
    const ideClient = getConnectedIdeClient(mcpClients)

    // Si el cliente de IDE cambió, hace falta re-registrar los handlers.
    // Se normaliza undefined a null para que el valor inicial del ref
    // (null) coincida con "no se encontró IDE" (undefined), evitando
    // resets espurios en cada actualización de MCP.
    if (currentIDERef.current !== (ideClient ?? null)) {
      handlersRegistered.current = false
      currentIDERef.current = ideClient || null
      // Resetea la selección cuando cambia el cliente de IDE.
      onSelect({
        lineCount: 0,
        lineStart: undefined,
        text: undefined,
        filePath: undefined,
      })
    }

    // Se salta si ya se registraron los handlers para el IDE actual, o si no hay cliente de IDE.
    if (handlersRegistered.current || !ideClient) {
      return
    }

    const { logError } = requireLocalObservabilityLogging()

    // Función handler para cambios de selección.
    const selectionChangeHandler = (data: SelectionData) => {
      if (data.selection?.start && data.selection?.end) {
        const { start, end } = data.selection
        let lineCount = end.line - start.line + 1
        // Si está en el primer carácter de la línea, no se cuenta esa
        // línea como seleccionada.
        if (end.character === 0) {
          lineCount--
        }
        const selection = {
          lineCount,
          lineStart: start.line,
          text: data.text,
          filePath: data.filePath,
        }

        onSelect(selection)
      }
    }

    // Registra el handler de notificación para eventos selection_changed.
    ideClient.client.setNotificationHandler(
      SelectionChangedSchema(),
      notification => {
        if (currentIDERef.current !== ideClient) {
          return
        }

        try {
          // Obtiene los datos de selección de los params de la notificación.
          const selectionData = notification.params

          // Procesa los datos de selección - valida que tenga las propiedades requeridas.
          if (
            selectionData.selection &&
            selectionData.selection.start &&
            selectionData.selection.end
          ) {
            // Maneja cambios de selección.
            selectionChangeHandler(selectionData as SelectionData)
          } else if (selectionData.text !== undefined) {
            // Maneja selección vacía (cuando el texto es una cadena vacía).
            selectionChangeHandler({
              selection: null,
              text: selectionData.text,
              filePath: selectionData.filePath,
            })
          }
        } catch (error) {
          logError(error as Error)
        }
      },
    )

    // Marca que ya se registraron los handlers.
    handlersRegistered.current = true

    // No hace falta cleanup, los clientes MCP gestionan su propio ciclo de vida.
  }, [mcpClients, onSelect])
}
