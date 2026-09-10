/**
 * Cola de comandos — porte de `ccnmt: packages/agent/internal/commandQueue.ts`.
 *
 * Tres delegados finos sobre las ataduras del host:
 *   1. `getCommandsByMaxPriority` — [] si el host está ausente.
 *   2. `remove` — no-op si el host está ausente.
 *   3. `isSlashCommand` — primero la atadura del host; SI NO, un
 *      fallback real: `value` debe ser string, recortado empieza con
 *      "/", y `skipSlashCommands` suprime la detección.
 *
 * `AgentMessage` viene de `../internalTypes.ts` (autocontenido, ya
 * portado) en vez de `../contracts.ts` (285 líneas, sin portar en este
 * árbol) — misma convención que `host.ts` ya adoptó para sus propios
 * bindings.
 */
import type { AgentMessage } from '../internalTypes.ts'
import { getAgentHostBindings } from '../host.ts'

type QueuedCommand = {
  priority?: 'now' | 'next' | 'later'
  mode: string
  agentId?: string
  uuid?: string
  value: unknown
  skipSlashCommands?: boolean
  [key: string]: unknown
}

function asQueuedCommandMessage(
  command: QueuedCommand,
): AgentMessage {
  return command as unknown as AgentMessage
}

function fromQueuedCommandMessage(
  command: AgentMessage,
): QueuedCommand {
  return command as unknown as QueuedCommand
}

export function getCommandsByMaxPriority(
  maxPriority: 'now' | 'next' | 'later',
): QueuedCommand[] {
  const getCommands = getAgentHostBindings().getCommandsByMaxPriority
  if (!getCommands) {
    return []
  }
  return getCommands(maxPriority).map(fromQueuedCommandMessage)
}

export function remove(commands: QueuedCommand[]): void {
  getAgentHostBindings().removeCommandsFromQueue?.(
    commands.map(asQueuedCommandMessage),
  )
}

export function isSlashCommand(command: QueuedCommand): boolean {
  const check = getAgentHostBindings().isSlashCommand
  if (check) {
    return check(asQueuedCommandMessage(command))
  }
  return (
    typeof command.value === 'string' &&
    command.value.trim().startsWith('/') &&
    !command.skipSlashCommands
  )
}
