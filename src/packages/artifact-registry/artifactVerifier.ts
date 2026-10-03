/**
 * Probar que la copia remota de un artefacto es legible y exacta
 * (TASK-THYROX-0728), separado de dónde corre la prueba.
 *
 * `verifyPublishedArtifact` es el método: resolver el tag por HEAD con un
 * consumidor sin credencial, exigir que apunte al digest publicado, y
 * materializar blob a blob verificando cada sha256 y borrando cada blob
 * antes de bajar el siguiente. El disco que consume se mide, no se supone.
 *
 * Quién lo ejecuta es un `ArtifactVerifier`: en proceso para las suites, o
 * como trabajo de la primitiva de Podman (`podmanJobVerifier.ts`) para que
 * la prueba no comparta el almacenamiento ni las credenciales del
 * publicador.
 */
import { rm } from 'node:fs/promises'

import type { ArtifactLocation, ArtifactRegistry, ArtifactResult, MaterializedFile, PinnedArtifact } from './artifactRegistry.js'

export interface Verification {
  readonly resolvedDigest: string
  readonly blobsVerified: readonly MaterializedFile[]
  /** Disco consumido como máximo durante la verificación, medido. */
  readonly measuredPeakBytes: number
}

/** El trabajo que verifica terminó sin dejar veredicto: ni el registry ni el artefacto respondieron mal. */
export interface VerificationJobFailure {
  readonly status: 'job_failed'
  readonly exitCode: number
  readonly detail: string
}

export type VerificationFailure = Exclude<ArtifactResult<unknown>, { status: 'success' }> | VerificationJobFailure

export type VerificationOutcome =
  | { readonly status: 'verified'; readonly verification: Verification }
  | { readonly status: 'unverified'; readonly result: VerificationFailure }

export interface ArtifactVerifier {
  verify(pinned: PinnedArtifact, location: ArtifactLocation): Promise<VerificationOutcome>
}

export interface VerificationContext {
  /** Consumidor anónimo: lo que prueba que el artefacto es legible sin credencial. */
  readonly consumer: ArtifactRegistry
  /** Directorio donde se materializa cada blob, uno a la vez; se borra al terminar. */
  readonly verifyDir: string
  /** Bytes libres del disco donde verifica; se muestrean para medir el pico real. */
  readonly freeBytes: () => number
}

export async function verifyPublishedArtifact(
  context: VerificationContext,
  pinned: PinnedArtifact,
  location: ArtifactLocation,
): Promise<VerificationOutcome> {
  try {
    const resolved = await context.consumer.resolveArtifact(location)
    if (resolved.status !== 'success') return { status: 'unverified', result: resolved }
    if (resolved.value.digest !== pinned.digest) {
      return { status: 'unverified', result: { status: 'integrity_error', detail: `el tag resuelve a ${resolved.value.digest}, no a ${pinned.digest}` } }
    }
    const startFree = context.freeBytes()
    let lowestFree = startFree
    const pulled = await context.consumer.pullArtifact(pinned, context.verifyDir, {
      discardAfterVerify: true,
      onVerified: () => { lowestFree = Math.min(lowestFree, context.freeBytes()) },
    })
    if (pulled.status !== 'success') return { status: 'unverified', result: pulled }
    return {
      status: 'verified',
      verification: { resolvedDigest: resolved.value.digest, blobsVerified: pulled.value, measuredPeakBytes: startFree - lowestFree },
    }
  } finally {
    await rm(context.verifyDir, { recursive: true, force: true })
  }
}

export function createInProcessVerifier(context: VerificationContext): ArtifactVerifier {
  return { verify: (pinned, location) => verifyPublishedArtifact(context, pinned, location) }
}
