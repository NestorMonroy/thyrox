/**
 * Abre la coordinación que la topología declarada exige: `local` en el
 * proceso; `shared` sobre Redis, y sin Redis declarado se rehúsa al abrir
 * —fail closed— en vez de coordinar en memoria lo que otro coordinador no ve.
 */
import { coordinationTopologyOf, type ModelSchedulingCoordination } from './coordination.ts'

export const REDIS_URL_ENV = 'THYROX_REDIS_URL'

export class SharedCoordinationUnavailableError extends Error {
  constructor(reason: string) {
    super(`coordinación shared sin Redis: ${reason}; declara ${REDIS_URL_ENV} y levanta thyrox-redis con bin/infrastructure_ensure`)
    this.name = 'SharedCoordinationUnavailableError'
  }
}

export function openModelSchedulingCoordination(env: Readonly<Record<string, string | undefined>>): ModelSchedulingCoordination {
  const topology = coordinationTopologyOf(env)
  throw new Error(`openModelSchedulingCoordination(${topology}): por implementar`)
}
