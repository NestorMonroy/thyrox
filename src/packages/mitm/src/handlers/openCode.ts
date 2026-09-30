/**
 * Open Code (host `opencode.ai`, familia Zen). Chat Completions al proxy local.
 *
 * Porte de `omniroute: src/mitm/handlers/openCode.ts` (MIT).
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AgentId } from '../types.ts'
import { MitmHandlerBase } from './base.ts'

export class OpenCodeHandler extends MitmHandlerBase {
  readonly agentId: AgentId = 'open-code'

  async intercept(req: IncomingMessage, res: ServerResponse, body: Buffer, mappedModel: string): Promise<void> {
    await this.forwardJson(req, res, body, mappedModel, '/v1/chat/completions')
  }
}
