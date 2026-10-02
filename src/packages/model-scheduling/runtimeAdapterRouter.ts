/**
 * El adapter de runtime que el controlador de residencias ve cuando el anfitrión
 * sirve más de un runtime (TASK-THYROX-0776): cada operación va al adapter del
 * runtime de la unidad o del grant. Un runtime sin adapter falla con su causa;
 * nunca cae a otro, porque cambiar de runtime es cambiar el plan (M5).
 *
 * Sus capacidades son las que TODOS los adapters cumplen: el controlador decide
 * con lo que cualquier unidad puede garantizar.
 */
import type { ExecutionGrant, ModelRuntime } from '@thyrox/model-artifacts/executionGrant.ts'

import type {
  ArtifactIdentityVerification, ExpectedResidency, HealthObservation, ModelExecutionUnit, ObservedResidency,
  ResidencyBinding, RuntimeAdapter, RuntimeCapabilities, RuntimeMutationOutcome,
} from './modelUnitMaterializer.ts'

export type RuntimeAdapters = Readonly<Partial<Record<ModelRuntime, RuntimeAdapter>>>

export class RuntimeAdapterRouter implements RuntimeAdapter {
  readonly capabilities: RuntimeCapabilities

  constructor(private readonly adapters: RuntimeAdapters) {
    this.capabilities = commonCapabilities(Object.values(adapters).filter((adapter): adapter is RuntimeAdapter => adapter !== undefined))
  }

  async probeHealth(unit: ModelExecutionUnit): Promise<HealthObservation> {
    const adapter = this.adapters[unit.runtime]
    return adapter ? adapter.probeHealth(unit) : { status: 'unhealthy', reason: missing(unit.runtime) }
  }

  async prepareRuntimeArtifact(binding: ResidencyBinding, grant: ExecutionGrant): Promise<RuntimeMutationOutcome> {
    const adapter = this.adapters[grant.runtime]
    return adapter ? adapter.prepareRuntimeArtifact(binding, grant) : { status: 'failed', reason: missing(grant.runtime) }
  }

  async verifyArtifactIdentity(unit: ModelExecutionUnit, grant: ExecutionGrant): Promise<ArtifactIdentityVerification> {
    const adapter = this.adapters[unit.runtime]
    return adapter ? adapter.verifyArtifactIdentity(unit, grant) : { status: 'failed', reason: missing(unit.runtime) }
  }

  async loadResidency(binding: ResidencyBinding, grant: ExecutionGrant): Promise<RuntimeMutationOutcome> {
    const adapter = this.adapters[grant.runtime]
    return adapter ? adapter.loadResidency(binding, grant) : { status: 'failed', reason: missing(grant.runtime) }
  }

  async observeResidency(unit: ModelExecutionUnit, expected: ExpectedResidency): Promise<ObservedResidency> {
    const adapter = this.adapters[unit.runtime]
    return adapter ? adapter.observeResidency(unit, expected) : { status: 'error', reason: missing(unit.runtime) }
  }

  async unloadResidency(binding: ResidencyBinding): Promise<RuntimeMutationOutcome> {
    const adapter = this.adapters[binding.unit.runtime]
    return adapter ? adapter.unloadResidency(binding) : { status: 'failed', reason: missing(binding.unit.runtime) }
  }
}

function missing(runtime: ModelRuntime): string {
  return `ningún adapter sirve el runtime ${runtime} en este anfitrión`
}

function commonCapabilities(adapters: readonly RuntimeAdapter[]): RuntimeCapabilities {
  const holds = (key: keyof RuntimeCapabilities) => adapters.length > 0 && adapters.every(adapter => adapter.capabilities[key])
  return {
    multipleResidencies: holds('multipleResidencies'),
    explicitLoad: holds('explicitLoad'),
    explicitUnload: holds('explicitUnload'),
    perResidencyIdentity: holds('perResidencyIdentity'),
    residencyObservation: holds('residencyObservation'),
    placementEnforceable: holds('placementEnforceable'),
  }
}
