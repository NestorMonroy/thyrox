/**
 * Porte de `ccnmt: packages/agent/types/events.ts` — la unión discriminada
 * de eventos que `AgentLoop.run`/`AgentCore.run` emiten por cada turno.
 *
 * DIVERGENCIA declarada: la fuente marca `turnId`/`ts` como obligatorios en
 * las doce variantes (comentario "V7 §9.10 — every event variant carries
 * turnId + ts"). Medido contra `core/AgentLoop.ts` y `core/AgentCore.ts` de
 * la propia fuente: NINGÚN `yield` de ninguno de los dos archivos produce
 * esos dos campos — ni uno. Portar la unión con esos campos obligatorios
 * describiría un contrato que el productor real nunca cumple. Aquí quedan
 * OPCIONALES, con esta nota en vez de silencio.
 */
import type { CoreMessage } from './coreMessages.ts'
import type { Usage } from './agentMessages.ts'
import type { ToolResult, CoreTool, PermissionResult } from './coreTools.ts'

export type DoneReason =
  | 'end_turn'
  | 'max_turns'
  | 'interrupted'
  | 'error'
  | 'stop_hook'
  | 'budget'
  | 'idle'
  | 'shutdown'

export interface MessageEvent {
  type: 'message'
  turnId?: string
  ts?: number
  message: CoreMessage
}

export interface StreamEvent {
  type: 'stream'
  turnId?: string
  ts?: number
  event: { type: string; [key: string]: unknown }
}

export interface ToolStartEvent {
  type: 'tool_start'
  turnId?: string
  ts?: number
  toolUseId: string
  toolName: string
  input: unknown
}

export interface ToolProgressEvent {
  type: 'tool_progress'
  turnId?: string
  ts?: number
  toolUseId: string
  progress: unknown
}

export interface ToolResultEvent {
  type: 'tool_result'
  turnId?: string
  ts?: number
  toolUseId: string
  result: ToolResult
}

export interface PermissionRequestEvent {
  type: 'permission_request'
  turnId?: string
  ts?: number
  tool: CoreTool
  input: unknown
  resolve: (result: PermissionResult) => void
}

export interface CompactionEvent {
  type: 'compaction'
  turnId?: string
  ts?: number
  before: CoreMessage[]
  after: CoreMessage[]
}

export interface RequestStartEvent {
  type: 'request_start'
  turnId?: string
  ts?: number
  params: unknown
}

export interface DoneEvent {
  type: 'done'
  turnId?: string
  ts?: number
  reason: DoneReason
  usage?: Usage
  error?: unknown
}

export interface SwarmMessageEvent {
  type: 'swarm_message'
  turnId?: string
  ts?: number
  from: string
  fromName?: string
  text: string
  summary?: string
}

export interface SwarmIdleEvent {
  type: 'swarm_idle'
  turnId?: string
  ts?: number
  summary: string
}

export interface SwarmShutdownEvent {
  type: 'swarm_shutdown'
  turnId?: string
  ts?: number
  reason: string
}

export type AgentEvent =
  | MessageEvent
  | StreamEvent
  | ToolStartEvent
  | ToolProgressEvent
  | ToolResultEvent
  | PermissionRequestEvent
  | CompactionEvent
  | RequestStartEvent
  | DoneEvent
  | SwarmMessageEvent
  | SwarmIdleEvent
  | SwarmShutdownEvent
