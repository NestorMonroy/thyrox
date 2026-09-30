/**
 * Trae: su superficie de API aún no se confirmó, así que interceptar falla
 * con un error explícito y el destino se declara `viability: "investigating"`.
 *
 * Porte de `omniroute: src/mitm/handlers/trae.ts` (MIT).
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AgentId } from '../types.ts'
import { MitmHandlerBase } from './base.ts'

export class TraeHandler extends MitmHandlerBase {
  readonly agentId: AgentId = 'trae'

  async intercept(_req: IncomingMessage, _res: ServerResponse, _body: Buffer, _mappedModel: string): Promise<void> {
    throw new Error('Trae no está implementado: su superficie de API sigue en investigación')
  }
}
