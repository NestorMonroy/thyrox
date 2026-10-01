/**
 * Coordinación sobre Redis para la topología `shared`. La generación de cada
 * residencia vive en Redis junto a su lease y sube en la misma operación
 * atómica que lo adquiere; una caída de Redis devuelve `unavailable`, nunca un
 * lease local.
 */
import type { ModelSchedulingCoordination } from './coordination.ts'

export interface RedisCoordinationOptions {
  /** Se antepone a toda clave, para compartir un servidor sin chocar. */
  readonly keyPrefix?: string
}

export function createRedisCoordination(_url: string, _options: RedisCoordinationOptions = {}): ModelSchedulingCoordination {
  throw new Error('createRedisCoordination: por implementar')
}
