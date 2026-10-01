/**
 * Abre la coordinación que la topología declarada exige: `local` en el
 * proceso; `shared` sobre Redis, y sin Redis declarado se rehúsa al abrir
 * —fail closed— en vez de coordinar en memoria lo que otro coordinador no ve.
 */
import { coordinationTopologyOf, type ModelSchedulingCoordination } from './coordination.ts'
import { createMemoryCoordination } from './memoryCoordination.ts'
import { createRedisCoordination } from './redisCoordination.ts'

export const REDIS_URL_ENV = 'THYROX_REDIS_URL'

export class SharedCoordinationUnavailableError extends Error {
  constructor(reason: string) {
    super(`coordinación shared sin Redis: ${reason}; declara ${REDIS_URL_ENV} y levanta thyrox-redis con bin/infrastructure_ensure`)
    this.name = 'SharedCoordinationUnavailableError'
  }
}

/** La topología sale sólo de `THYROX_MODEL_SCHEDULING_COORDINATION`; nunca del modo del proxy. */
export function openModelSchedulingCoordination(env: Readonly<Record<string, string | undefined>>): ModelSchedulingCoordination {
  if (coordinationTopologyOf(env) === 'local') return createMemoryCoordination()
  return createRedisCoordination(requiredRedisUrl(env))
}

function requiredRedisUrl(env: Readonly<Record<string, string | undefined>>): string {
  const url = env[REDIS_URL_ENV]?.trim()
  if (!url) throw new SharedCoordinationUnavailableError(`${REDIS_URL_ENV} no está declarada`)
  return url
}
