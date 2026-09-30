/**
 * El agente `claude-code` (host `api.anthropic.com`, por opt-in: esas peticiones salen
 * de muchos clientes, así que sólo se intercepta cuando el usuario enruta el
 * DNS de ese agente). API Messages: `POST /v1/messages` al proxy local.
 *
 * Porte de `omniroute: src/mitm/handlers/claudeCode.ts` (MIT).
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AgentId } from '../types.ts'
import { MitmHandlerBase } from './base.ts'

/**
 * Quita TODOS los turnos finales consecutivos del asistente —un prefill que
 * el upstream rechaza—, pero nunca deja la lista vacía: una lista vacía
 * también es inválida, así que se conserva al menos una entrada.
 */
export function dropTrailingAssistantTurns(payload: Record<string, unknown>): void {
  const messages = payload.messages
  if (!Array.isArray(messages)) return
  while (messages.length > 1 && messages[messages.length - 1]?.role === 'assistant') {
    messages.pop()
  }
}

export class AnthropicCliHandler extends MitmHandlerBase {
  readonly agentId: AgentId = 'claude-code'

  async intercept(req: IncomingMessage, res: ServerResponse, body: Buffer, mappedModel: string): Promise<void> {
    await this.forwardJson(req, res, body, mappedModel, '/v1/messages', dropTrailingAssistantTurns)
  }
}
