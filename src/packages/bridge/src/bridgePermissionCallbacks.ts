/**
 * Callbacks de permiso del bridge: el contrato que la capa de transporte
 * usa para mandar un `control_request` de permiso al cliente remoto y
 * recibir su `control_response`.
 *
 * Puerto fiel de `ccnmt: packages/bridge/src/bridgePermissionCallbacks.ts`.
 * `PermissionUpdate` ya existe en `@thyrox/permission` — no está en el
 * `exports` de ese paquete con este subpath exacto
 * (`PermissionUpdateSchema`), así que se recorta aquí al tipo mínimo que
 * este archivo consume (un array de actualizaciones de regla opaco desde
 * el punto de vista del bridge).
 */

/** Recorte de `PermissionUpdate` — el bridge sólo lo transporta, no lo interpreta. */
type PermissionUpdate = Record<string, unknown>

type BridgePermissionResponse = {
  behavior: 'allow' | 'deny'
  updatedInput?: Record<string, unknown>
  updatedPermissions?: PermissionUpdate[]
  message?: string
}

type BridgePermissionCallbacks = {
  sendRequest(
    requestId: string,
    toolName: string,
    input: Record<string, unknown>,
    toolUseId: string,
    description: string,
    permissionSuggestions?: PermissionUpdate[],
    blockedPath?: string,
  ): void
  sendResponse(requestId: string, response: BridgePermissionResponse): void
  /** Cancela un control_request pendiente para que la app web descarte su prompt. */
  cancelRequest(requestId: string): void
  onResponse(
    requestId: string,
    handler: (response: BridgePermissionResponse) => void,
  ): () => void // devuelve unsubscribe
}

/** Predicado de tipo para validar un payload control_response parseado
 *  como un BridgePermissionResponse. Chequea el discriminante `behavior`
 *  requerido en vez de usar un cast `as` inseguro. */
function isBridgePermissionResponse(
  value: unknown,
): value is BridgePermissionResponse {
  if (!value || typeof value !== 'object') return false
  return (
    'behavior' in value &&
    (value.behavior === 'allow' || value.behavior === 'deny')
  )
}

export { isBridgePermissionResponse }
export type { BridgePermissionCallbacks, BridgePermissionResponse }
