/**
 * Dónde vive una imagen, como lo guarda un catálogo (TASK-THYROX-0725).
 *
 * Sin campos de un proveedor concreto: `provider` elige el adapter en la
 * factory, `registry` y `repository` son OCI, y `credentialRef` nombra la
 * credencial que la publica sin contenerla. Cambiar de Docker Hub a otro
 * registro es cambiar estos valores, no el código que los consume.
 */
import { canonicalReference, type PinnedImageReference } from './imageReference.ts'

export type ImageLocation = {
  provider: string
  registry: string
  repository: string
  digest: string
  /** Etiqueta para personas; no identifica la imagen. */
  tag?: string
  /** Nombre de la credencial que la publica; nunca el secreto. */
  credentialRef?: string
}

export function locationReference(location: ImageLocation): PinnedImageReference {
  return {
    registry: location.registry,
    repository: location.repository,
    digest: location.digest,
    ...(location.tag === undefined ? {} : { tag: location.tag }),
  }
}

export function locationCanonicalReference(location: ImageLocation): string {
  return canonicalReference(locationReference(location))
}
