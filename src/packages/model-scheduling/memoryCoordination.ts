/**
 * Coordinación en el proceso para la topología `local`: una sola autoridad,
 * con la misma semántica de generación y caducidad que el adapter Redis.
 */
import type { ModelSchedulingCoordination } from './coordination.ts'

export interface MemoryCoordinationOptions {
  /** Reloj en milisegundos; las pruebas lo fijan para caducar leases sin esperar. */
  readonly now?: () => number
}

export function createMemoryCoordination(_options: MemoryCoordinationOptions = {}): ModelSchedulingCoordination {
  throw new Error('createMemoryCoordination: por implementar')
}
