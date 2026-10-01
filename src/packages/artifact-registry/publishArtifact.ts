/**
 * Publica un directorio como artefacto permanente y prueba la copia remota
 * antes de que la local deje de ser la única (TASK-THYROX-0728).
 *
 * El orden es el contrato:
 *
 * 1. admisión de disco por el pico del método REAL: subir lee en flujo y no
 *    escribe nada, así que el pico es el blob mayor que la verificación
 *    materializa; el margen de seguridad lo suma la admisión, no este módulo;
 * 2. publicación con la credencial de publicación;
 * 3. verificación por un `ArtifactVerifier` (`artifactVerifier.ts`): resolver
 *    por HEAD sin credencial y materializar blob a blob, verificando cada
 *    sha256 y borrando cada blob antes de bajar el siguiente.
 *
 * Sólo `verified` autoriza tratar la copia local como caché. Un límite del
 * provider durante la verificación deja `unverified` con su causa intacta.
 */
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

import { describeArtifactFile, type ArtifactFile } from './artifactFiles.js'
import type { ArtifactLocation, ArtifactRegistry, ArtifactResult, PinnedArtifact } from './artifactRegistry.js'
import type { ArtifactVerifier, Verification, VerificationFailure } from './artifactVerifier.js'

export interface PublishPlan {
  readonly sourceDir: string
  /** Nombres que no son contenido del artefacto (claves, cachés de un servicio). */
  readonly exclude: readonly string[]
  readonly mediaTypeOf: (title: string) => string
  readonly artifactType: string
  /**
   * El registro permanente que describe el artefacto, compuesto con sus
   * archivos ya medidos; viaja como su blob de configuración. No lleva el
   * digest del manifest: ese digest depende de este blob, así que lo guarda
   * el registro de publicación que se escribe después.
   */
  readonly recordFor: (files: readonly ArtifactFile[]) => unknown
  readonly location: ArtifactLocation
}

export type AdmissionVerdict = 'admitted' | 'refused' | 'unmeasured'

export interface PublishDependencies {
  readonly publisher: ArtifactRegistry
  readonly verifier: ArtifactVerifier
  readonly admitDisk: (needBytes: number) => Promise<AdmissionVerdict>
  readonly releaseDisk: () => Promise<void>
}

export const RECORD_MEDIA_TYPE = 'application/vnd.thyrox.permanent-artifact-record.v1+json'

export type PublicationOutcome =
  | { readonly status: 'verified'; readonly pinned: PinnedArtifact; readonly files: readonly ArtifactFile[]; readonly verification: Verification }
  | { readonly status: 'refused'; readonly reason: string }
  | { readonly status: 'unpublished'; readonly result: ArtifactResult<unknown> }
  | { readonly status: 'unverified'; readonly pinned: PinnedArtifact; readonly result: VerificationFailure }

export async function describeDirectory(plan: PublishPlan): Promise<ArtifactFile[]> {
  const names = (await readdir(plan.sourceDir)).filter(name => !plan.exclude.includes(name)).sort()
  const files: ArtifactFile[] = []
  for (const name of names) {
    const path = join(plan.sourceDir, name)
    if ((await stat(path)).isFile()) files.push(await describeArtifactFile(path, name, plan.mediaTypeOf(name)))
  }
  return files
}

export async function publishAndVerify(plan: PublishPlan, deps: PublishDependencies): Promise<PublicationOutcome> {
  const files = await describeDirectory(plan)
  const needBytes = Math.max(0, ...files.map(file => file.size))
  const verdict = await deps.admitDisk(needBytes)
  if (verdict !== 'admitted') return { status: 'refused', reason: `la admisión de disco respondió ${verdict} para ${needBytes} bytes más su margen` }
  try {
    const config = { mediaType: RECORD_MEDIA_TYPE, bytes: new TextEncoder().encode(JSON.stringify(plan.recordFor(files), null, 2)) }
    const pushed = await deps.publisher.pushArtifact({ artifactType: plan.artifactType, files, config, annotations: {} }, plan.location)
    if (pushed.status !== 'success') return { status: 'unpublished', result: pushed }
    const pinned = pushed.value
    const verified = await deps.verifier.verify(pinned, plan.location)
    if (verified.status !== 'verified') return { status: 'unverified', pinned, result: verified.result }
    return { status: 'verified', pinned, files, verification: verified.verification }
  } finally {
    await deps.releaseDisk()
  }
}
