/**
 * `TransformersRuntimeAdapter`: el `RuntimeAdapter` de una `ModelExecutionUnit`
 * de Transformers (TASK-THYROX-0761, ADR-007 1.13.0). Sólo habla con el endpoint
 * de la unidad. El snapshot concedido no viaja por la API: la primitiva lo monta
 * de sólo lectura al materializar la unidad, y el adapter comprueba que el
 * montado es el concedido antes de cargarlo.
 *
 * - `prepareRuntimeArtifact`: el runtime calcula el digest del snapshot montado
 *   y lo compara con el `artifactId` del grant.
 * - `loadResidency` / `unloadResidency`: carga o descarga el modelo; el runtime
 *   rehúsa cargar otra identidad.
 * - `observeResidency` / `verifyArtifactIdentity`: la identidad que el runtime
 *   informa, contra la concedida.
 *
 * Toda operación que muta compara antes la generación del binding con la vigente.
 */
import type { ExecutionGrant } from '@thyrox/model-artifacts/executionGrant.ts'
import type {
  ArtifactIdentityVerification, ExpectedResidency, HealthObservation, ModelExecutionUnit, ObservedArtifactIdentity,
  ObservedResidency, ResidencyBinding, RuntimeAdapter, RuntimeCapabilities, RuntimeMutationOutcome,
} from '@thyrox/model-scheduling/modelUnitMaterializer.ts'

import { artifactIdentityMatches, mutateAtCurrentGeneration, reasonOf, type CurrentGeneration } from './runtimeMutation.ts'
import { TransformersRuntimeApi, type RuntimeResidency } from './transformersRuntimeApi.ts'

/** Una residencia por unidad (topología A), con carga, descarga e identidad explícitas; el placement lo fija la unidad. */
export const TRANSFORMERS_RUNTIME_CAPABILITIES: RuntimeCapabilities = {
  multipleResidencies: false, explicitLoad: true, explicitUnload: true,
  perResidencyIdentity: true, residencyObservation: true, placementEnforceable: false,
}

export interface TransformersRuntimeAdapterOptions {
  /** La generación vigente de una residencia, de la coordinación. */
  readonly currentGeneration: CurrentGeneration
}

export class TransformersRuntimeAdapter implements RuntimeAdapter {
  readonly capabilities = TRANSFORMERS_RUNTIME_CAPABILITIES

  constructor(private readonly options: TransformersRuntimeAdapterOptions) {}

  async probeHealth(unit: ModelExecutionUnit): Promise<HealthObservation> {
    try {
      await apiOf(unit).health()
      return { status: 'healthy' }
    } catch (error) {
      return { status: 'unhealthy', reason: reasonOf(error) }
    }
  }

  async prepareRuntimeArtifact(binding: ResidencyBinding, grant: ExecutionGrant): Promise<RuntimeMutationOutcome> {
    return mutateAtCurrentGeneration(this.options.currentGeneration, binding, async () => {
      const verification = await apiOf(binding.unit).verifyArtifact(grant.artifact.artifactId)
      if (!verification.matches) {
        throw new Error(`el snapshot montado es ${verification.artifactId}, el grant concede ${grant.artifact.artifactId}`)
      }
    })
  }

  async verifyArtifactIdentity(unit: ModelExecutionUnit, grant: ExecutionGrant): Promise<ArtifactIdentityVerification> {
    const expected = grant.artifact
    try {
      const observed = identityOf(await apiOf(unit).residency())
      if (observed && artifactIdentityMatches(expected, observed)) return { status: 'matches', observed }
      return { status: 'mismatch', expected, observed }
    } catch (error) {
      return { status: 'failed', reason: reasonOf(error) }
    }
  }

  async loadResidency(binding: ResidencyBinding, grant: ExecutionGrant): Promise<RuntimeMutationOutcome> {
    return mutateAtCurrentGeneration(this.options.currentGeneration, binding,
      async () => { await apiOf(binding.unit).load(grant.artifact.modelId, grant.artifact.artifactId) })
  }

  async observeResidency(unit: ModelExecutionUnit, expected: ExpectedResidency): Promise<ObservedResidency> {
    try {
      const observed = identityOf(await apiOf(unit).residency())
      if (!observed) return { status: 'absent' }
      if (!artifactIdentityMatches(expected.artifact, observed)) return { status: 'mismatch', observed }
      return { status: 'resident', observed }
    } catch (error) {
      return { status: 'error', reason: reasonOf(error) }
    }
  }

  async unloadResidency(binding: ResidencyBinding): Promise<RuntimeMutationOutcome> {
    return mutateAtCurrentGeneration(this.options.currentGeneration, binding, () => apiOf(binding.unit).unload())
  }
}

function apiOf(unit: ModelExecutionUnit): TransformersRuntimeApi {
  return new TransformersRuntimeApi(unit.endpoint)
}

/** La identidad residente según el runtime; sin residencia, `undefined`. Lo que no declara no coincide con nada. */
function identityOf(residency: RuntimeResidency): ObservedArtifactIdentity | undefined {
  if (residency.state !== 'resident') return undefined
  return {
    modelId: residency.modelId,
    artifactId: residency.artifactId,
    format: residency.format,
    quantization: residency.quantization ?? undefined,
  }
}
