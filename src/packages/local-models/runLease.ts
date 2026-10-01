/**
 * Exclusión de una ejecución de cuantización por el puerto de estado
 * compartido (TASK-THYROX-0723, ADR-THYROX-006): un solo dueño por
 * ejecución, con lease renovado por latido mientras dura.
 *
 * El lease exige vista global: un almacén degradado a memoria excluye sólo
 * dentro de su proceso, así que con él la exclusión sería falsa. Por eso se
 * pide `requiresGlobalConsistency` y se rehúsa si el puerto no tiene Redis
 * detrás, en vez de correr sin exclusión.
 */
import type { OpenedSharedState } from '@thyrox/shared-state/factory.ts'
import type { SharedStateStore } from '@thyrox/shared-state/port.ts'

/** Lo que dura un lease sin latido: si el dueño muere, otro puede tomarlo pasado este plazo. */
export const RUN_LEASE_TTL_MS = 60_000
/** Un tercio del TTL: dos latidos perdidos seguidos aún no lo dejan caducar. */
export const RUN_LEASE_RENEW_INTERVAL_MS = RUN_LEASE_TTL_MS / 3

const RUN_LEASE_KEY_PREFIX = 'quantization:run:'

export class RunLeaseBusyError extends Error {
  constructor(readonly runId: string) {
    super(`la ejecución ${runId} ya tiene un dueño vivo; no se corre en paralelo sobre el mismo directorio`)
    this.name = 'RunLeaseBusyError'
  }
}

export class RunLeaseUnavailableError extends Error {
  constructor(reason: string) {
    super(`sin exclusión global para la ejecución: ${reason}; levanta Redis con bin/infrastructure_ensure thyrox-redis y declara THYROX_REDIS_URL`)
    this.name = 'RunLeaseUnavailableError'
  }
}

export interface RunLease {
  release(): Promise<void>
}

/** El almacén con vista global, o el error que explica por qué no la hay. */
export function globalLeaseStore(opened: OpenedSharedState): SharedStateStore {
  if (opened.backend !== 'redis') throw new RunLeaseUnavailableError(`el puerto abrió el adaptador ${opened.backend}`)
  return opened.forConsistency('requiresGlobalConsistency')
}

export function runLeaseKey(runId: string): string {
  return `${RUN_LEASE_KEY_PREFIX}${runId}`
}

/** Toma el lease o lanza `RunLeaseBusyError`; renueva cada `RUN_LEASE_RENEW_INTERVAL_MS` hasta `release()`. */
export async function acquireRunLease(store: SharedStateStore, runId: string, owner: string): Promise<RunLease> {
  const key = runLeaseKey(runId)
  if (!(await store.acquireLease(key, owner, RUN_LEASE_TTL_MS))) throw new RunLeaseBusyError(runId)
  const heartbeat = setInterval(() => { void store.acquireLease(key, owner, RUN_LEASE_TTL_MS) }, RUN_LEASE_RENEW_INTERVAL_MS)
  return {
    async release() {
      clearInterval(heartbeat)
      await store.releaseLease(key, owner)
    },
  }
}
