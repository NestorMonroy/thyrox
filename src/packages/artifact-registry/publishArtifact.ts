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
 * 3. resolución por HEAD con un consumidor anónimo: el repositorio es legible
 *    sin credencial y el tag apunta al digest publicado;
 * 4. lectura del manifest y materialización blob a blob, verificando cada
 *    sha256 y borrando cada blob antes de bajar el siguiente.
 *
 * Sólo `verified` autoriza tratar la copia local como caché. Un límite del
 * provider durante la verificación deja `unverified` con su causa intacta.
 */
import { readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'

import { describeArtifactFile, type ArtifactFile } from './artifactFiles.js'
import type { ArtifactLocation, ArtifactRegistry, ArtifactResult, MaterializedFile, PinnedArtifact } from './artifactRegistry.js'

export interface PublishPlan {
  readonly sourceDir: string
  /** Nombres que no son contenido del artefacto (claves, cachés de un servicio). */
  readonly exclude: readonly string[]
  readonly mediaTypeOf: (title: string) => string
  readonly artifactType: string
  /** El registro que describe el artefacto; viaja como su blob de configuración. */
  readonly record: unknown
  readonly location: ArtifactLocation
}

export type AdmissionVerdict = 'admitted' | 'refused' | 'unmeasured'

export interface PublishDependencies {
  readonly publisher: ArtifactRegistry
  /** Consumidor anónimo: lo que prueba que el artefacto es legible sin credencial. */
  readonly consumer: ArtifactRegistry
  readonly admitDisk: (needBytes: number) => Promise<AdmissionVerdict>
  readonly releaseDisk: () => Promise<void>
  /** Directorio donde la verificación materializa cada blob, uno a la vez. */
  readonly verifyDir: string
  /** Bytes libres del disco donde verifica; se muestrean para medir el pico real. */
  readonly freeBytes: () => number
}

export const RECORD_MEDIA_TYPE = 'application/vnd.thyrox.permanent-artifact-record.v1+json'

export interface Verification {
  readonly resolvedDigest: string
  readonly blobsVerified: readonly MaterializedFile[]
  /** Disco consumido como máximo durante la verificación, medido. */
  readonly measuredPeakBytes: number
}

export type PublicationOutcome =
  | { readonly status: 'verified'; readonly pinned: PinnedArtifact; readonly files: readonly ArtifactFile[]; readonly verification: Verification }
  | { readonly status: 'refused'; readonly reason: string }
  | { readonly status: 'unpublished'; readonly result: ArtifactResult<unknown> }
  | { readonly status: 'unverified'; readonly pinned: PinnedArtifact; readonly result: ArtifactResult<unknown> }

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
    const config = { mediaType: RECORD_MEDIA_TYPE, bytes: new TextEncoder().encode(JSON.stringify(plan.record, null, 2)) }
    const pushed = await deps.publisher.pushArtifact({ artifactType: plan.artifactType, files, config, annotations: {} }, plan.location)
    if (pushed.status !== 'success') return { status: 'unpublished', result: pushed }
    const pinned = pushed.value
    const resolved = await deps.consumer.resolveArtifact(plan.location)
    if (resolved.status !== 'success') return { status: 'unverified', pinned, result: resolved }
    if (resolved.value.digest !== pinned.digest) {
      return { status: 'unverified', pinned, result: { status: 'integrity_error', detail: `el tag resuelve a ${resolved.value.digest}, no a ${pinned.digest}` } }
    }
    const startFree = deps.freeBytes()
    let lowestFree = startFree
    const pulled = await deps.consumer.pullArtifact(pinned, deps.verifyDir, {
      discardAfterVerify: true,
      onVerified: () => { lowestFree = Math.min(lowestFree, deps.freeBytes()) },
    })
    if (pulled.status !== 'success') return { status: 'unverified', pinned, result: pulled }
    return { status: 'verified', pinned, files, verification: { resolvedDigest: resolved.value.digest, blobsVerified: pulled.value, measuredPeakBytes: startFree - lowestFree } }
  } finally {
    await rm(deps.verifyDir, { recursive: true, force: true })
    await deps.releaseDisk()
  }
}
