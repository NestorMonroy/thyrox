/**
 * Handles unexpected permission responses by looking up the unresolved
 * tool call in the transcript and enqueuing it for execution.
 *
 * Pure function with all I/O injected via `deps`. El resultado y el mensaje
 * usan los tipos reales (`PermissionResult` del SDK, `AssistantMessage` del
 * agente): las copias estructurales de antes no cabían en la cola.
 *
 * Returns true if a permission was enqueued, false otherwise.
 *
 * Moved from src/cli/print.ts per V7 §10.2. The `setAppState` parameter
 * present in the original version was dead code and was dropped here.
 */
import type { AssistantMessage } from '@thyrox/agent/messageShapes.js'
import type { PermissionResult } from '@thyrox/headless-sdk/agentSdkTypes.js'

export type OrphanedPermissionMessage = {
  response?: {
    subtype?: string
    response?: { toolUseID?: unknown } & Record<string, unknown>
    request_id?: string
  }
}

// El resultado que el consumidor del SDK devuelve (allow/deny), con el
// `toolUseID` que ambas variantes declaran. Era una copia estructural suelta
// que la cola (`QueuedCommand`) no aceptaba.
export type OrphanedPermissionResult = PermissionResult

// El mensaje del transcript con el tool_use sin resolver: la cola lo guarda
// tal cual (`QueuedCommand.orphanedPermission`), así que es el `AssistantMessage`
// real y no una copia estructural.
export type OrphanedAssistantMessage = AssistantMessage

export type OrphanedPermissionDeps = {
  findUnresolvedToolUse: (
    toolUseID: string,
  ) => Promise<OrphanedAssistantMessage | null | undefined>
  enqueue: (entry: {
    mode: 'orphaned-permission'
    // Siempre vacío: el permiso huérfano no trae texto de usuario.
    value: []
    orphanedPermission: {
      permissionResult: OrphanedPermissionResult
      assistantMessage: OrphanedAssistantMessage
    }
  }) => void
  logDebug: (message: string) => void
}

export async function handleOrphanedPermissionResponse({
  message,
  handledToolUseIds,
  onEnqueued,
  deps,
}: {
  message: OrphanedPermissionMessage
  handledToolUseIds: Set<string>
  onEnqueued?: () => void
  deps: OrphanedPermissionDeps
}): Promise<boolean> {
  const responseInner = message.response
  if (
    responseInner?.subtype === 'success' &&
    responseInner.response?.toolUseID &&
    typeof responseInner.response.toolUseID === 'string'
  ) {
    const permissionResult = responseInner.response as OrphanedPermissionResult
    const toolUseID = permissionResult.toolUseID
    if (!toolUseID) {
      return false
    }

    deps.logDebug(
      `handleOrphanedPermissionResponse: received orphaned control_response for toolUseID=${toolUseID} request_id=${responseInner.request_id}`,
    )

    // Prevent re-processing the same orphaned tool_use. Without this guard,
    // duplicate control_response deliveries (e.g. from WebSocket reconnect)
    // cause the same tool to be executed multiple times, producing duplicate
    // tool_use IDs in the messages array and a 400 error from the API.
    // Once corrupted, every retry accumulates more duplicates.
    if (handledToolUseIds.has(toolUseID)) {
      deps.logDebug(
        `handleOrphanedPermissionResponse: skipping duplicate orphaned permission for toolUseID=${toolUseID} (already handled)`,
      )
      return false
    }

    const assistantMessage = await deps.findUnresolvedToolUse(toolUseID)
    if (!assistantMessage) {
      deps.logDebug(
        `handleOrphanedPermissionResponse: no unresolved tool_use found for toolUseID=${toolUseID} (already resolved in transcript)`,
      )
      return false
    }

    handledToolUseIds.add(toolUseID)
    deps.logDebug(
      `handleOrphanedPermissionResponse: enqueuing orphaned permission for toolUseID=${toolUseID} messageID=${assistantMessage.message.id}`,
    )
    deps.enqueue({
      mode: 'orphaned-permission' as const,
      value: [],
      orphanedPermission: {
        permissionResult,
        assistantMessage,
      },
    })

    onEnqueued?.()
    return true
  }
  return false
}
