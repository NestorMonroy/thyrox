/**
 * Puerto COMPLETO de `ccnmt: packages/storage/src/sessionState.ts` (151
 * líneas fuente). Pub/sub de estado de sesión + metadata externa
 * consultada por CCR/SDK: quién escucha cambios de estado
 * (idle/running/requires_action), cambios de metadata externa
 * (permission_mode, pending_action, post_turn_summary, task_summary) y
 * cambios de modo de permiso.
 *
 * Tres dependencias hermanas ausentes:
 *
 *  - `PermissionMode` (`permission/PermissionMode.js`, paquete `permission`
 *    ausente por completo del árbol) — alias local `type PermissionMode =
 *    string`. Este módulo sólo REENVÍA el valor a su listener; nunca lo
 *    inspecciona.
 *  - `enqueueSdkEvent` (`agent/sdkEventQueue.js`) — no-op con setter de
 *    inyección `setEnqueueSdkEventFn`, para poder verificar en el test
 *    qué evento se intentó encolar sin el subsistema SDK real.
 *  - `isEnvTruthy` (`@thyrox/config: env/utils.ts`, que existe de verdad
 *    en este monorepo) — no se importa cruzando de paquete (mismo
 *    criterio que `sessionActivity.ts`); se reimplementa fiel a esa
 *    fuente.
 *
 * `readEnv` SÍ se reusa de verdad: se importa de
 * `./internal/pendingCrossPackageDeps.js`.
 */
import { readEnv } from './internal/pendingCrossPackageDeps.js'

export type SessionState = 'idle' | 'running' | 'requires_action'

/**
 * Contexto que viaja con las transiciones a requires_action, para que las
 * superficies aguas abajo (barra lateral de CCR, push notifications)
 * muestren en QUÉ está bloqueada la sesión, no sólo que está bloqueada.
 *
 * Dos vías de entrega:
 * - tool_name + action_description → proto RequiresActionDetails
 *   (payload de webhook, tipado, logueado en Datadog)
 * - objeto completo → external_metadata.pending_action (JSON consultable
 *   en la Session, deja que el frontend itere la forma sin round-trips
 *   de proto)
 */
export type RequiresActionDetails = {
  tool_name: string
  /** Resumen legible, p. ej. "Editing src/foo.ts", "Running npm test" */
  action_description: string
  tool_use_id: string
  request_id: string
  /** Input crudo de la herramienta — el frontend lo lee de
   * external_metadata.pending_action.input para parsear opciones de
   * pregunta / contenido de plan sin escanear el stream de eventos. */
  input?: Record<string, unknown>
}

type PermissionMode = string

/** Fiel a `@thyrox/config: env/utils.ts::isEnvTruthy` — ver docstring. */
function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  const normalized = envVar.toLowerCase().trim()
  return ['1', 'true', 'yes', 'on'].includes(normalized)
}

let _enqueueSdkEvent: (event: Record<string, unknown>) => void = () => {}
export function setEnqueueSdkEventFn(
  fn: (event: Record<string, unknown>) => void,
): void {
  _enqueueSdkEvent = fn
}

// Claves de external_metadata de CCR — se apilan en onChangeAppState, se
// restauran en externalMetadataToAppState.
export type SessionExternalMetadata = {
  permission_mode?: string | null
  is_ultraplan_mode?: boolean | null
  model?: string | null
  pending_action?: RequiresActionDetails | null
  // Opaco — tipado en el punto de emisión. Importar PostTurnSummaryOutput
  // aquí filtraría el path de import a sdk.d.ts vía el re-export de
  // SessionState de agentSdkBridge.
  post_turn_summary?: unknown
  // Línea de progreso a mitad de turno del summarizer del agente
  // bifurcado — dispara cada ~5 pasos / 2min para que los turnos largos
  // muestren "qué está pasando ahora" antes de que llegue
  // post_turn_summary.
  task_summary?: string | null
}

type SessionStateChangedListener = (
  state: SessionState,
  details?: RequiresActionDetails,
) => void
type SessionMetadataChangedListener = (
  metadata: SessionExternalMetadata,
) => void
type PermissionModeChangedListener = (mode: PermissionMode) => void

let stateListener: SessionStateChangedListener | null = null
let metadataListener: SessionMetadataChangedListener | null = null
let permissionModeListener: PermissionModeChangedListener | null = null

export function setSessionStateChangedListener(
  cb: SessionStateChangedListener | null,
): void {
  stateListener = cb
}

export function setSessionMetadataChangedListener(
  cb: SessionMetadataChangedListener | null,
): void {
  metadataListener = cb
}

/**
 * Registra un listener para cambios de modo de permiso desde
 * onChangeAppState. Lo conecta print.ts para emitir un mensaje SDK
 * system:status para que los clientes de CCR/IDE vean las transiciones
 * de modo en tiempo real — sin importar qué camino de código mutó
 * toolPermissionContext.mode (Shift+Tab, diálogo ExitPlanMode, comando de
 * barra, bridge set_permission_mode, etc.).
 */
export function setPermissionModeChangedListener(
  cb: PermissionModeChangedListener | null,
): void {
  permissionModeListener = cb
}

let hasPendingAction = false
let currentState: SessionState = 'idle'

export function getSessionState(): SessionState {
  return currentState
}

export function notifySessionStateChanged(
  state: SessionState,
  details?: RequiresActionDetails,
): void {
  currentState = state
  stateListener?.(state, details)

  // Refleja los detalles en external_metadata para que GetSession lleve
  // el contexto de pending-action sin cambios de proto. Se limpia vía
  // null RFC 7396 en la siguiente transición no bloqueada.
  if (state === 'requires_action' && details) {
    hasPendingAction = true
    metadataListener?.({
      pending_action: details,
    })
  } else if (hasPendingAction) {
    hasPendingAction = false
    metadataListener?.({ pending_action: null })
  }

  // task_summary lo escribe a mitad de turno el summarizer bifurcado; se
  // limpia en idle para que el próximo turno no muestre brevemente el
  // progreso del turno anterior.
  if (state === 'idle') {
    metadataListener?.({ task_summary: null })
  }

  // Refleja al stream de eventos SDK para que consumidores no-CCR
  // (scmuxd, VS Code) vean la misma señal autoritativa idle/running que
  // ve el bridge de CCR. 'idle' dispara después de que heldBackResult se
  // vuelca — deja que scmuxd cambie a IDLE y muestre el punto de bg-task
  // en vez de un spinner de "generando" atascado.
  //
  // Opt-in hasta que los clientes CCR web + mobile aprendan a ignorar
  // este subtipo en sus heurísticas isWorking() de último mensaje — el
  // evento idle final hoy los deja fijos en "Running...".
  if (isEnvTruthy(readEnv('CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS'))) {
    _enqueueSdkEvent({
      type: 'system',
      subtype: 'session_state_changed',
      state,
    })
  }
}

export function notifySessionMetadataChanged(
  metadata: SessionExternalMetadata,
): void {
  metadataListener?.(metadata)
}

/**
 * Lo dispara onChangeAppState cuando cambia
 * toolPermissionContext.mode. Los listeners aguas abajo (PUT de
 * external_metadata de CCR, stream de status del SDK) están conectados
 * a este único punto de paso, para que ningún camino de mutación de modo
 * pueda saltárselos en silencio.
 */
export function notifyPermissionModeChanged(mode: PermissionMode): void {
  permissionModeListener?.(mode)
}

/** Sólo para test — restablece todo el estado de módulo entre casos. */
export function resetSessionStateForTest(): void {
  stateListener = null
  metadataListener = null
  permissionModeListener = null
  hasPendingAction = false
  currentState = 'idle'
}
