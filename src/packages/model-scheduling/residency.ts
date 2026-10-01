/**
 * El ciclo de vida de una `ModelResidency` (ADR-007 1.13.0, topología A: un
 * contenedor de runtime por residencia, nunca por petición).
 *
 *   planned → materializing → loading → resident → draining → evicting → absent
 *                  └──────────────┴──────────┴──→ error
 *
 * Un contenedor que arranca no hace `resident`: lo hace la verificación del
 * adapter. Cada transición presenta la generación de quien la pide; una vieja
 * se rechaza con `StaleGenerationError` aunque su emisor siga vivo, la misma
 * semántica que `pool_lifecycle` aplica a los ítems de pool, aquí obligatoria.
 */

export type ResidencyState = 'planned' | 'materializing' | 'loading' | 'resident' | 'draining' | 'evicting' | 'absent' | 'error'

export const RESIDENCY_TRANSITIONS: Readonly<Record<ResidencyState, readonly ResidencyState[]>> = {
  planned: ['materializing', 'absent', 'error'],
  materializing: ['loading', 'error', 'absent'],
  loading: ['resident', 'error', 'absent'],
  resident: ['draining', 'error'],
  draining: ['evicting', 'error'],
  evicting: ['absent', 'error'],
  absent: ['planned'],
  error: ['evicting', 'absent'],
}

export interface ModelResidency {
  readonly residencyKey: string
  readonly generation: number
  readonly model: string
  readonly state: ResidencyState
  readonly grantId?: string
  readonly unitId?: string
  readonly reservationId?: string
  /** Peticiones admitidas sobre esta residencia que aún no terminaron. */
  readonly activeRequests: number
  /** Por qué quedó en `error`, o qué decidió la reconciliación. */
  readonly reason?: string
}

export class StaleGenerationError extends Error {
  constructor(readonly residencyKey: string, readonly presented: number, readonly current: number) {
    super(`la residencia ${residencyKey} está en la generación ${current}; un actor de la generación ${presented} ya no puede actuar sobre ella`)
    this.name = 'StaleGenerationError'
  }
}

export class InvalidResidencyTransitionError extends Error {
  constructor(readonly residencyKey: string, readonly from: ResidencyState, readonly to: ResidencyState) {
    super(`la residencia ${residencyKey} no pasa de ${from} a ${to}`)
    this.name = 'InvalidResidencyTransitionError'
  }
}

export type ResidencyChanges = Partial<Pick<ModelResidency, 'grantId' | 'unitId' | 'reservationId' | 'activeRequests' | 'reason'>>

/** Las residencias que este coordinador conoce; la verdad material la reconcilia contra las unidades. */
export class ResidencyRegistry {
  private readonly residencies = new Map<string, ModelResidency>()

  get(residencyKey: string): ModelResidency | undefined {
    return this.residencies.get(residencyKey)
  }

  list(): readonly ModelResidency[] {
    return [...this.residencies.values()]
  }

  /** Abre una residencia `planned` en la generación del lease que la coordina; reemplaza a una `absent`. */
  plan(residencyKey: string, generation: number, model: string): ModelResidency {
    void residencyKey; void generation; void model
    throw new Error('ResidencyRegistry.plan: por implementar')
  }

  /** Mueve la residencia si la generación presentada es la vigente y la tabla admite el paso. */
  transition(residencyKey: string, generation: number, target: ResidencyState, changes: ResidencyChanges = {}): ModelResidency {
    void residencyKey; void generation; void target; void changes
    throw new Error('ResidencyRegistry.transition: por implementar')
  }
}
