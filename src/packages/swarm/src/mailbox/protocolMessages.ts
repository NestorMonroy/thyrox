/**
 * Tipos de mensaje del protocolo de buzón — tríos schema/factory/checker
 * para todo mensaje JSON estructurado que fluye por los buzones de los
 * teammates. Porte de
 * `ccnmt: packages/swarm/src/mailbox/protocolMessages.ts`.
 *
 * Extraído de `mailbox/index.ts` para que la capa de E/S (lockfile,
 * lectura/escritura, dedup — BLOQUEADA en este pase, ver el hallazgo de
 * ese archivo) y la capa de protocolo (estos schemas) se puedan leer en
 * aislamiento.
 *
 * Añadir un nuevo mensaje de protocolo: definir un Schema (o un tipo
 * TypeScript llano), una factoría `create*`, y un type-guard `is*`.
 *
 * `isStructuredProtocolMessage` debe mantenerse sincronizada con los
 * literales de tipo declarados aquí — el `useInboxPoller` de la fuente
 * (BLOQUEADO) depende de ella para decidir qué mensajes se enrutan a
 * handlers dedicados vs. se entregan como contexto LLM crudo.
 *
 * DOS DIVERGENCIAS DE ALCANCE, declaradas:
 *
 *  1. `jsonParse` — la fuente la importa de `adapters/appRuntime.ts`, que
 *     a su vez la enruta por un binding de runtime del host (instrumen-
 *     tación de rendimiento). Aquí es un `JSON.parse` sin instrumentar
 *     envuelto para devolver `unknown` — mismo valor de retorno y misma
 *     conducta ante JSON inválido (lanza, y cada llamador ya lo captura
 *     en su propio try/catch).
 *  2. `lazySchema`/`PermissionModeSchema` — la fuente las importa de
 *     `adapters/appRuntime.ts` (`lazySchema`, memoización trivial de una
 *     factoría) y de un binding que resuelve `PermissionModeSchema`
 *     desde `@claude-code-how-works/permission/PermissionUpdate` (no
 *     existe en este árbol; `lazySchema` se reimplementa una única vez
 *     para todo el paquete en `../internal/lazySchema.ts` — mismo patrón
 *     ya portado de forma independiente en `api: agent/internalUtils.ts:114`
 *     — y `PermissionModeSchema` se construye aquí contra los CINCO
 *     valores reales de `PermissionMode` verificados en
 *     `@thyrox/agent/types.ts` — `permission: src/permissionTypes.ts:16-20`
 *     en la fuente declara exactamente los mismos cinco como
 *     `EXTERNAL_PERMISSION_MODES`). No se acopla este paquete a
 *     `@thyrox/agent` sólo por un enum de cinco literales.
 */

import { z } from 'zod/v4'

import type { BackendType } from '../backends/types.js'
import { lazySchema } from '../internal/lazySchema.js'

/**
 * Reimplementación local de `PermissionModeSchema` (ver divergencia 2
 * arriba): los cinco valores que `@thyrox/agent/types.ts` (`PermissionMode`)
 * ya declara como el `PermissionMode` real del cliente.
 */
const PermissionModeSchema = lazySchema(() =>
  z.enum(['default', 'plan', 'acceptEdits', 'dontAsk', 'bypassPermissions']),
)

/** Reimplementación local mínima de `jsonParse` (ver divergencia 1 arriba). */
function jsonParse(text: string): unknown {
  return JSON.parse(text)
}

// ─── Notificación de idle ─────────────────────────────────────────

export type IdleNotificationMessage = {
  type: 'idle_notification'
  from: string
  timestamp: string
  /** Por qué el agente pasó a idle */
  idleReason?: 'available' | 'interrupted' | 'failed'
  /** Resumen breve del último DM enviado en este turno (si hubo) */
  summary?: string
  completedTaskId?: string
  completedStatus?: 'resolved' | 'blocked' | 'failed'
  failureReason?: string
}

export function createIdleNotification(
  agentId: string,
  options?: {
    idleReason?: IdleNotificationMessage['idleReason']
    summary?: string
    completedTaskId?: string
    completedStatus?: 'resolved' | 'blocked' | 'failed'
    failureReason?: string
  },
): IdleNotificationMessage {
  return {
    type: 'idle_notification',
    from: agentId,
    timestamp: new Date().toISOString(),
    idleReason: options?.idleReason,
    summary: options?.summary,
    completedTaskId: options?.completedTaskId,
    completedStatus: options?.completedStatus,
    failureReason: options?.failureReason,
  }
}

export function isIdleNotification(
  messageText: string,
): IdleNotificationMessage | null {
  try {
    const parsed = jsonParse(messageText) as { type?: unknown } | null
    if (parsed && parsed.type === 'idle_notification') {
      return parsed as IdleNotificationMessage
    }
  } catch {
    // No es JSON o no es una notificación de idle válida
  }
  return null
}

// ─── Solicitud/respuesta de permiso (worker ↔ leader) ─────────────

/**
 * Mensaje de solicitud de permiso enviado del worker al leader vía
 * buzón. Los nombres de campo se alinean con `can_use_tool` del SDK
 * (snake_case).
 */
export type PermissionRequestMessage = {
  type: 'permission_request'
  request_id: string
  agent_id: string
  tool_name: string
  tool_use_id: string
  description: string
  input: Record<string, unknown>
  permission_suggestions: unknown[]
}

/**
 * Mensaje de respuesta de permiso enviado del leader al worker vía
 * buzón. La forma refleja `ControlResponseSchema` / `ControlError-
 * ResponseSchema` del SDK.
 */
export type PermissionResponseMessage =
  | {
      type: 'permission_response'
      request_id: string
      subtype: 'success'
      response?: {
        updated_input?: Record<string, unknown>
        permission_updates?: unknown[]
      }
    }
  | {
      type: 'permission_response'
      request_id: string
      subtype: 'error'
      error: string
    }

export function createPermissionRequestMessage(params: {
  request_id: string
  agent_id: string
  tool_name: string
  tool_use_id: string
  description: string
  input: Record<string, unknown>
  permission_suggestions?: unknown[]
}): PermissionRequestMessage {
  return {
    type: 'permission_request',
    request_id: params.request_id,
    agent_id: params.agent_id,
    tool_name: params.tool_name,
    tool_use_id: params.tool_use_id,
    description: params.description,
    input: params.input,
    permission_suggestions: params.permission_suggestions || [],
  }
}

export function createPermissionResponseMessage(params: {
  request_id: string
  subtype: 'success' | 'error'
  error?: string
  updated_input?: Record<string, unknown>
  permission_updates?: unknown[]
}): PermissionResponseMessage {
  if (params.subtype === 'error') {
    return {
      type: 'permission_response',
      request_id: params.request_id,
      subtype: 'error',
      error: params.error || 'Permission denied',
    }
  }
  return {
    type: 'permission_response',
    request_id: params.request_id,
    subtype: 'success',
    response: {
      updated_input: params.updated_input,
      permission_updates: params.permission_updates,
    },
  }
}

export function isPermissionRequest(
  messageText: string,
): PermissionRequestMessage | null {
  try {
    const parsed = jsonParse(messageText) as { type?: unknown } | null
    if (parsed && parsed.type === 'permission_request') {
      return parsed as PermissionRequestMessage
    }
  } catch {
    // No es JSON o no es una solicitud de permiso válida
  }
  return null
}

export function isPermissionResponse(
  messageText: string,
): PermissionResponseMessage | null {
  try {
    const parsed = jsonParse(messageText) as { type?: unknown } | null
    if (parsed && parsed.type === 'permission_response') {
      return parsed as PermissionResponseMessage
    }
  } catch {
    // No es JSON o no es una respuesta de permiso válida
  }
  return null
}

// ─── Solicitud/respuesta de permiso de sandbox ────────────────────

/**
 * Mensaje de solicitud de permiso de sandbox enviado del worker al
 * leader vía buzón. Se dispara cuando el runtime de sandbox detecta un
 * acceso de red a un host no permitido.
 */
export type SandboxPermissionRequestMessage = {
  type: 'sandbox_permission_request'
  /** Identificador único de esta solicitud */
  requestId: string
  /** `CLAUDE_CODE_AGENT_ID` del worker */
  workerId: string
  /** `CLAUDE_CODE_AGENT_NAME` del worker */
  workerName: string
  /** `CLAUDE_CODE_AGENT_COLOR` del worker */
  workerColor?: string
  /** El patrón de host que solicita acceso de red */
  hostPattern: {
    host: string
  }
  /** Timestamp de creación de la solicitud */
  createdAt: number
}

export type SandboxPermissionResponseMessage = {
  type: 'sandbox_permission_response'
  /** ID de la solicitud a la que responde */
  requestId: string
  /** El host que fue aprobado/denegado */
  host: string
  /** Si la conexión está permitida */
  allow: boolean
  /** Timestamp de creación de la respuesta */
  timestamp: string
}

export function createSandboxPermissionRequestMessage(params: {
  requestId: string
  workerId: string
  workerName: string
  workerColor?: string
  host: string
}): SandboxPermissionRequestMessage {
  return {
    type: 'sandbox_permission_request',
    requestId: params.requestId,
    workerId: params.workerId,
    workerName: params.workerName,
    workerColor: params.workerColor,
    hostPattern: { host: params.host },
    createdAt: Date.now(),
  }
}

export function createSandboxPermissionResponseMessage(params: {
  requestId: string
  host: string
  allow: boolean
}): SandboxPermissionResponseMessage {
  return {
    type: 'sandbox_permission_response',
    requestId: params.requestId,
    host: params.host,
    allow: params.allow,
    timestamp: new Date().toISOString(),
  }
}

export function isSandboxPermissionRequest(
  messageText: string,
): SandboxPermissionRequestMessage | null {
  try {
    const parsed = jsonParse(messageText) as { type?: unknown } | null
    if (parsed && parsed.type === 'sandbox_permission_request') {
      return parsed as SandboxPermissionRequestMessage
    }
  } catch {
    // No es JSON o no es una solicitud de permiso de sandbox válida
  }
  return null
}

export function isSandboxPermissionResponse(
  messageText: string,
): SandboxPermissionResponseMessage | null {
  try {
    const parsed = jsonParse(messageText) as { type?: unknown } | null
    if (parsed && parsed.type === 'sandbox_permission_response') {
      return parsed as SandboxPermissionResponseMessage
    }
  } catch {
    // No es JSON o no es una respuesta de permiso de sandbox válida
  }
  return null
}

// ─── Solicitud/respuesta de aprobación de plan ────────────────────

export const PlanApprovalRequestMessageSchema = lazySchema(() =>
  z.object({
    type: z.literal('plan_approval_request'),
    from: z.string(),
    timestamp: z.string(),
    planFilePath: z.string(),
    planContent: z.string(),
    requestId: z.string(),
  }),
)

export type PlanApprovalRequestMessage = z.infer<
  ReturnType<typeof PlanApprovalRequestMessageSchema>
>

export const PlanApprovalResponseMessageSchema = lazySchema(() =>
  z.object({
    type: z.literal('plan_approval_response'),
    requestId: z.string(),
    approved: z.boolean(),
    feedback: z.string().optional(),
    timestamp: z.string(),
    permissionMode: PermissionModeSchema().optional(),
  }),
)

export type PlanApprovalResponseMessage = z.infer<
  ReturnType<typeof PlanApprovalResponseMessageSchema>
>

export function isPlanApprovalRequest(
  messageText: string,
): PlanApprovalRequestMessage | null {
  try {
    const result = PlanApprovalRequestMessageSchema().safeParse(
      jsonParse(messageText),
    )
    if (result.success) return result.data
  } catch {
    // No es JSON
  }
  return null
}

export function isPlanApprovalResponse(
  messageText: string,
): PlanApprovalResponseMessage | null {
  try {
    const result = PlanApprovalResponseMessageSchema().safeParse(
      jsonParse(messageText),
    )
    if (result.success) return result.data
  } catch {
    // No es JSON
  }
  return null
}

// ─── Solicitud/aprobación/rechazo de shutdown ─────────────────────

export const ShutdownRequestMessageSchema = lazySchema(() =>
  z.object({
    type: z.literal('shutdown_request'),
    requestId: z.string(),
    from: z.string(),
    reason: z.string().optional(),
    timestamp: z.string(),
  }),
)

export type ShutdownRequestMessage = z.infer<
  ReturnType<typeof ShutdownRequestMessageSchema>
>

export const ShutdownApprovedMessageSchema = lazySchema(() =>
  z.object({
    type: z.literal('shutdown_approved'),
    requestId: z.string(),
    from: z.string(),
    timestamp: z.string(),
    paneId: z.string().optional(),
    backendType: z.string().optional(),
  }),
)

export type ShutdownApprovedMessage = z.infer<
  ReturnType<typeof ShutdownApprovedMessageSchema>
>

export const ShutdownRejectedMessageSchema = lazySchema(() =>
  z.object({
    type: z.literal('shutdown_rejected'),
    requestId: z.string(),
    from: z.string(),
    reason: z.string(),
    timestamp: z.string(),
  }),
)

export type ShutdownRejectedMessage = z.infer<
  ReturnType<typeof ShutdownRejectedMessageSchema>
>

export function createShutdownRequestMessage(params: {
  requestId: string
  from: string
  reason?: string
}): ShutdownRequestMessage {
  return {
    type: 'shutdown_request',
    requestId: params.requestId,
    from: params.from,
    reason: params.reason,
    timestamp: new Date().toISOString(),
  }
}

export function createShutdownApprovedMessage(params: {
  requestId: string
  from: string
  paneId?: string
  backendType?: BackendType
}): ShutdownApprovedMessage {
  return {
    type: 'shutdown_approved',
    requestId: params.requestId,
    from: params.from,
    timestamp: new Date().toISOString(),
    paneId: params.paneId,
    backendType: params.backendType,
  }
}

export function createShutdownRejectedMessage(params: {
  requestId: string
  from: string
  reason: string
}): ShutdownRejectedMessage {
  return {
    type: 'shutdown_rejected',
    requestId: params.requestId,
    from: params.from,
    reason: params.reason,
    timestamp: new Date().toISOString(),
  }
}

export function isShutdownRequest(
  messageText: string,
): ShutdownRequestMessage | null {
  try {
    const result = ShutdownRequestMessageSchema().safeParse(
      jsonParse(messageText),
    )
    if (result.success) return result.data
  } catch {
    // No es JSON
  }
  return null
}

export function isShutdownApproved(
  messageText: string,
): ShutdownApprovedMessage | null {
  try {
    const result = ShutdownApprovedMessageSchema().safeParse(
      jsonParse(messageText),
    )
    if (result.success) return result.data
  } catch {
    // No es JSON
  }
  return null
}

export function isShutdownRejected(
  messageText: string,
): ShutdownRejectedMessage | null {
  try {
    const result = ShutdownRejectedMessageSchema().safeParse(
      jsonParse(messageText),
    )
    if (result.success) return result.data
  } catch {
    // No es JSON
  }
  return null
}

// ─── Asignación de tarea ──────────────────────────────────────────

/** Mensaje de asignación de tarea enviado cuando se asigna una a un teammate. */
export type TaskAssignmentMessage = {
  type: 'task_assignment'
  taskId: string
  subject: string
  description: string
  assignedBy: string
  timestamp: string
}

export function isTaskAssignment(
  messageText: string,
): TaskAssignmentMessage | null {
  try {
    const parsed = jsonParse(messageText) as { type?: unknown } | null
    if (parsed && parsed.type === 'task_assignment') {
      return parsed as TaskAssignmentMessage
    }
  } catch {
    // No es JSON o no es una asignación de tarea válida
  }
  return null
}

// ─── Actualización de permiso del equipo ──────────────────────────

/**
 * Mensaje de actualización de permiso del equipo enviado del leader a
 * los teammates vía buzón. Difunde una actualización de permiso que
 * aplica a todos los teammates.
 */
export type TeamPermissionUpdateMessage = {
  type: 'team_permission_update'
  /** La actualización de permiso a aplicar */
  permissionUpdate: {
    type: 'addRules'
    rules: Array<{ toolName: string; ruleContent?: string }>
    behavior: 'allow' | 'deny' | 'ask'
    destination: 'session'
  }
  /** El path de directorio que fue permitido */
  directoryPath: string
  /** El nombre de la herramienta al que aplica */
  toolName: string
}

export function isTeamPermissionUpdate(
  messageText: string,
): TeamPermissionUpdateMessage | null {
  try {
    const parsed = jsonParse(messageText) as { type?: unknown } | null
    if (parsed && parsed.type === 'team_permission_update') {
      return parsed as TeamPermissionUpdateMessage
    }
  } catch {
    // No es JSON o no es una actualización de permiso de equipo válida
  }
  return null
}

// ─── Solicitud de fijar modo ───────────────────────────────────────

export const ModeSetRequestMessageSchema = lazySchema(() =>
  z.object({
    type: z.literal('mode_set_request'),
    mode: PermissionModeSchema(),
    from: z.string(),
  }),
)

export type ModeSetRequestMessage = z.infer<
  ReturnType<typeof ModeSetRequestMessageSchema>
>

export function createModeSetRequestMessage(params: {
  mode: string
  from: string
}): ModeSetRequestMessage {
  return {
    type: 'mode_set_request',
    mode: params.mode as ModeSetRequestMessage['mode'],
    from: params.from,
  }
}

export function isModeSetRequest(
  messageText: string,
): ModeSetRequestMessage | null {
  try {
    const parsed = ModeSetRequestMessageSchema().safeParse(
      jsonParse(messageText),
    )
    if (parsed.success) {
      return parsed.data
    }
  } catch {
    // No es JSON o no es una solicitud de fijar modo válida
  }
  return null
}

// ─── Predicado de enrutamiento catch-all ──────────────────────────

/**
 * `true` si `messageText` es un mensaje de protocolo estructurado con un
 * handler dedicado del lado del leader en `useInboxPoller` (BLOQUEADO en
 * este pase). Estos mensajes NO deben consumirse como contexto LLM
 * crudo — `getTeammateMailboxAttachments` (BLOQUEADO) los filtra para que
 * lleguen a sus colas propias (`workerPermissions`,
 * `workerSandboxPermissions`, etc.).
 *
 * Mantener esta lista sincronizada con los literales de tipo exportados
 * arriba. Un tipo de mensaje de protocolo nuevo con handler dedicado debe
 * añadirse aquí, o se filtra al contexto LLM como JSON crudo.
 */
export function isStructuredProtocolMessage(messageText: string): boolean {
  try {
    const parsed = jsonParse(messageText)
    if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
      return false
    }
    const type = (parsed as { type: unknown }).type
    return (
      type === 'permission_request' ||
      type === 'permission_response' ||
      type === 'sandbox_permission_request' ||
      type === 'sandbox_permission_response' ||
      type === 'shutdown_request' ||
      type === 'shutdown_approved' ||
      type === 'team_permission_update' ||
      type === 'mode_set_request' ||
      type === 'plan_approval_request' ||
      type === 'plan_approval_response'
    )
  } catch {
    return false
  }
}
