/**
 * OpenAI Codex CLI (host `chatgpt.com`, rutas de Codex). Chat Completions: se reescribe `model` y el cuerpo va al proxy local.
 *
 * Porte de `omniroute: src/mitm/handlers/codex.ts` (MIT).
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AgentId } from '../types.ts'
import { MitmHandlerBase } from './base.ts'

export class CodexHandler extends MitmHandlerBase {
  readonly agentId: AgentId = 'codex'

  async intercept(req: IncomingMessage, res: ServerResponse, body: Buffer, mappedModel: string): Promise<void> {
    await this.forwardJson(req, res, body, mappedModel, '/v1/chat/completions')
  }
}
