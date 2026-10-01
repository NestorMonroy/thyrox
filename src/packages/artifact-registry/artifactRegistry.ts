/**
 * Puerto de registro de artefactos permanentes (TASK-THYROX-0728): datos que
 * produce el laboratorio —modelos GGUF, logs, métricas, manifests— guardados
 * por digest como artefactos OCI, sin envolverlos en una imagen ejecutable.
 * Hermano de `ImageRegistry`: los dos hablan el mismo protocolo, pero sólo
 * éste transporta datos que Podman no ejecuta.
 *
 * Cada operación devuelve un `RegistryResult`: el consumidor distingue un
 * límite de uso de un artefacto inexistente sin interpretar códigos HTTP.
 */
import type { ArtifactFile } from './artifactFiles.js'
import type { RegistryResult } from './registryResult.js'

export const OCI_MANIFEST_MEDIA_TYPE = 'application/vnd.oci.image.manifest.v1+json'
export const TITLE_ANNOTATION = 'org.opencontainers.image.title'

export interface ArtifactLocation {
  readonly repository: string
  readonly tag: string
}

/** Un artefacto fijado por el digest de su manifest: la única referencia estable. */
export interface PinnedArtifact {
  readonly repository: string
  readonly digest: string
}

export interface ArtifactConfig {
  readonly mediaType: string
  readonly bytes: Uint8Array
}

export interface ArtifactPush {
  readonly artifactType: string
  readonly files: readonly ArtifactFile[]
  /** El blob de configuración: aquí va el registro que describe el artefacto. */
  readonly config: ArtifactConfig
  readonly annotations: Readonly<Record<string, string>>
}

export interface ArtifactLayer {
  readonly mediaType: string
  readonly digest: string
  readonly size: number
  readonly title: string
}

export interface ArtifactManifest {
  readonly artifactType: string
  readonly config: { readonly mediaType: string; readonly digest: string; readonly size: number }
  readonly layers: readonly ArtifactLayer[]
  readonly annotations: Readonly<Record<string, string>>
}

export interface MaterializedFile {
  readonly title: string
  readonly digest: string
  readonly size: number
  /** Ruta donde quedó, o `undefined` si se descartó tras verificarlo. */
  readonly path: string | undefined
}

export interface PullOptions {
  /** Se llama con cada blob ya verificado, antes de bajar el siguiente. */
  readonly onVerified?: (file: MaterializedFile & { readonly verifiedPath: string }) => void | Promise<void>
  /** Borra cada blob tras verificarlo: comprueba la copia remota sin duplicar el artefacto en disco. */
  readonly discardAfterVerify?: boolean
}

/** Los fallos de transporte del registry y, además, contenido que no coincide con su digest. */
export type ArtifactResult<T> = RegistryResult<T> | { readonly status: 'integrity_error'; readonly detail: string }

export interface ArtifactRegistryCapabilities {
  /** Si el provider admite borrar un manifest por la API de distribución. */
  readonly delete: boolean
}

export interface ArtifactRegistry {
  readonly capabilities: ArtifactRegistryCapabilities
  pushArtifact(artifact: ArtifactPush, destination: ArtifactLocation): Promise<ArtifactResult<PinnedArtifact>>
  /** Resuelve un tag a su digest con HEAD: no descarga el manifest. */
  resolveArtifact(location: ArtifactLocation): Promise<ArtifactResult<PinnedArtifact>>
  inspectArtifact(pinned: PinnedArtifact): Promise<ArtifactResult<ArtifactManifest>>
  /** Materializa cada blob en `targetDir`, verificando su sha256 antes de seguir con el siguiente. */
  pullArtifact(pinned: PinnedArtifact, targetDir: string, options?: PullOptions): Promise<ArtifactResult<readonly MaterializedFile[]>>
  /**
   * Materializa en `destination` sólo la capa `layerDigest`, que tiene que
   * pertenecer al manifest verificado de `pinned` (si no, `not_found`). El
   * destino aparece sólo si el sha256 y el tamaño coinciden.
   */
  pullLayer(pinned: PinnedArtifact, layerDigest: string, destination: string): Promise<ArtifactResult<MaterializedFile>>
  deleteArtifact?(pinned: PinnedArtifact): Promise<ArtifactResult<void>>
}
