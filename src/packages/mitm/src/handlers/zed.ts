/**
 * Zed (host `api.zed.dev`). Chat Completions al proxy local.
 *
 * Porte de `omniroute: src/mitm/handlers/zed.ts` (MIT).
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AgentId } from '../types.ts'
import { MitmHandlerBase } from './base.ts'

export class ZedHandler extends MitmHandlerBase {
  readonly agentId: AgentId = 'zed'

  async intercept(req: IncomingMessage, res: ServerResponse, body: Buffer, mappedModel: string): Promise<void> {
    await this.forwardJson(req, res, body, mappedModel, '/v1/chat/completions')
  }
}
