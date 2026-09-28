/**
 * Kiro usa la API Messages de Anthropic (`POST /v1/messages` con `x-api-key`): se reescribe `model` y el traductor del proxy adapta la forma al upstream del modelo elegido.
 *
 * Porte de `omniroute: src/mitm/handlers/kiro.ts` (MIT).
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AgentId } from '../types.ts'
import { MitmHandlerBase } from './base.ts'

export class KiroHandler extends MitmHandlerBase {
  readonly agentId: AgentId = 'kiro'

  async intercept(req: IncomingMessage, res: ServerResponse, body: Buffer, mappedModel: string): Promise<void> {
    await this.forwardJson(req, res, body, mappedModel, '/v1/messages')
  }
}
