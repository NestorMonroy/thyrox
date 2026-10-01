/**
 * Coordinación en el proceso para la topología `local`: una sola autoridad,
 * con la misma semántica de generación y caducidad que el adapter Redis.
 *
 * Por residencia hay tres piezas: el lease de propiedad (con caducidad), el
 * contador de generación (sin caducidad, sube en cada adquisición) y el lock
 * de mutación (otro lease, atado a la generación con la que se concedió).
 */
import type {
  GenerationLease,
  LeaseAcquisition,
  LeaseValidity,
  ModelSchedulingCoordination,
  MutationOperation,
} from './coordination.ts'

export interface MemoryCoordinationOptions {
  /** Reloj en milisegundos; las pruebas lo fijan para caducar leases sin esperar. */
  readonly now?: () => number
}

interface HeldLease {
  readonly owner: string
  readonly generation: number
  expiresAt: number
}

const NEVER_ACQUIRED_GENERATION = 0

export function createMemoryCoordination(options: MemoryCoordinationOptions = {}): ModelSchedulingCoordination {
  const now = options.now ?? Date.now
  const generations = new Map<string, number>()
  const residencyLeases = new Map<string, HeldLease>()
  const mutationLocks = new Map<string, HeldLease>()

  function currentGenerationOf(residencyKey: string): number {
    return generations.get(residencyKey) ?? NEVER_ACQUIRED_GENERATION
  }

  /** El lease vivo de la tabla, o `undefined` si no hay o ya caducó o es de una generación vieja. */
  function liveEntry(table: Map<string, HeldLease>, residencyKey: string): HeldLease | undefined {
    const entry = table.get(residencyKey)
    if (!entry) return undefined
    const isExpired = entry.expiresAt <= now()
    const isFromOldGeneration = entry.generation !== currentGenerationOf(residencyKey)
    if (isExpired || isFromOldGeneration) {
      table.delete(residencyKey)
      return undefined
    }
    return entry
  }

  function tableOf(lease: GenerationLease): Map<string, HeldLease> {
    return lease.kind === 'residency' ? residencyLeases : mutationLocks
  }

  function currentEntryOf(lease: GenerationLease): HeldLease | undefined {
    const entry = liveEntry(tableOf(lease), lease.residencyKey)
    const isSameLease = entry?.owner === lease.owner && entry.generation === lease.generation
    return isSameLease ? entry : undefined
  }

  function validityOf(lease: GenerationLease): LeaseValidity {
    return currentEntryOf(lease) ? 'current' : 'stale'
  }

  return {
    topology: 'local',

    async acquireResidency(residencyKey, owner, ttlMs): Promise<LeaseAcquisition> {
      const holder = liveEntry(residencyLeases, residencyKey)
      if (holder) return { status: 'held', holder: holder.owner }
      const generation = currentGenerationOf(residencyKey) + 1
      generations.set(residencyKey, generation)
      residencyLeases.set(residencyKey, { owner, generation, expiresAt: now() + ttlMs })
      return { status: 'acquired', lease: { kind: 'residency', residencyKey, owner, generation } }
    },

    async renew(lease, ttlMs) {
      const entry = currentEntryOf(lease)
      if (!entry) return 'stale'
      entry.expiresAt = now() + ttlMs
      return 'current'
    },

    async validity(lease) {
      return validityOf(lease)
    },

    async release(lease) {
      if (!currentEntryOf(lease)) return 'stale'
      tableOf(lease).delete(lease.residencyKey)
      return 'current'
    },

    async acquireMutation(residency, _operation: MutationOperation, ttlMs): Promise<LeaseAcquisition> {
      const { residencyKey, owner, generation } = residency
      if (validityOf(residency) !== 'current') return { status: 'stale', currentGeneration: currentGenerationOf(residencyKey) }
      const holder = liveEntry(mutationLocks, residencyKey)
      if (holder) return { status: 'held', holder: holder.owner }
      mutationLocks.set(residencyKey, { owner, generation, expiresAt: now() + ttlMs })
      return { status: 'acquired', lease: { kind: 'mutation', residencyKey, owner, generation } }
    },

    async currentGeneration(residencyKey) {
      return currentGenerationOf(residencyKey)
    },

    async close() {
      residencyLeases.clear()
      mutationLocks.clear()
    },
  }
}
