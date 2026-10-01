/**
 * GitHub Copilot (hosts `api.githubcopilot.com`, `copilot-proxy.githubusercontent.com`). Chat Completions al proxy local.
 *
 * Porte de `omniroute: src/mitm/handlers/copilot.ts` (MIT).
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AgentId } from '../types.ts'
import { MitmHandlerBase } from './base.ts'

export class CopilotHandler extends MitmHandlerBase {
  readonly agentId: AgentId = 'copilot'

  async intercept(req: IncomingMessage, res: ServerResponse, body: Buffer, mappedModel: string): Promise<void> {
    await this.forwardJson(req, res, body, mappedModel, '/v1/chat/completions')
  }
}
