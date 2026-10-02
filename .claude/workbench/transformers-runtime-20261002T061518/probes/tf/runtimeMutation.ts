/**
 * Lo que todo adapter de runtime comparte (ADR-007 1.13.0), extraído del de
 * Ollama al añadir el de Transformers (TASK-THYROX-0761): una mutación sólo con
 * la generación vigente de la residencia, y la comparación exacta de la
 * identidad que el runtime informa contra la concedida.
 */
import type { ResolvedModelArtifact } from '@thyrox/model-artifacts/resolvedModelArtifact.ts'
import type { ObservedArtifactIdentity, ResidencyBinding, RuntimeMutationOutcome } from '@thyrox/model-scheduling/modelUnitMaterializer.ts'

export type CurrentGeneration = (residencyKey: string) => Promise<number | 'unavailable'>

const DONE: RuntimeMutationOutcome = { status: 'done' }

/** Corre `change` sólo si la generación del binding es la vigente; un error del runtime es `failed`. */
export async function mutateAtCurrentGeneration(currentGeneration: CurrentGeneration, binding: ResidencyBinding,
  change: () => Promise<void>): Promise<RuntimeMutationOutcome> {
  const current = await generationOf(currentGeneration, binding.residencyKey)
  if (current !== binding.generation) return { status: 'stale_generation', currentGeneration: current }
  try {
    await change()
    return DONE
  } catch (error) {
    return { status: 'failed', reason: reasonOf(error) }
  }
}

/** Una coordinación que no responde equivale a no saber la generación: `unavailable`. */
async function generationOf(currentGeneration: CurrentGeneration, residencyKey: string): Promise<number | 'unavailable'> {
  try {
    return await currentGeneration(residencyKey)
  } catch {
    return 'unavailable'
  }
}

/** El runtime sirve exactamente la identidad concedida: nombre, artefacto, formato y cuantización. */
export function artifactIdentityMatches(expected: ResolvedModelArtifact, observed: ObservedArtifactIdentity): boolean {
  return observed.modelId === expected.modelId
    && observed.artifactId === expected.artifactId
    && observed.format === expected.format
    && observed.quantization === expected.quantization
}

export function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
