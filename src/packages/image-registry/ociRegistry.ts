/**
 * Un registro OCI sobre el runtime de contenedores (TASK-THYROX-0725): el
 * núcleo `resolve` · `pull` · `push` · `inspect` que cualquier registro
 * estándar cumple sin API propietaria. Es el adapter `generic-oci` y la base
 * de los adapters de proveedor, que sólo añaden la normalización de sus
 * referencias y, si las tienen, sus operaciones administrativas.
 *
 * `resolve` trae la imagen para leer su digest: el runtime no expone el digest
 * remoto de una etiqueta sin traerla.
 */
import { ImageTransferError, pullImage, pushImage, storedDigest } from '@thyrox/podman-execution/imageTransfer.ts'
import type { PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

import { canonicalReference, type ImageReference, pin, type PinnedImageReference, taggedReference } from './imageReference.ts'
import {
  ADMINISTRATIVE_CAPABILITIES,
  CORE_CAPABILITIES,
  ForeignRegistryError,
  type ImageRegistry,
  type RegistryAdministrator,
  type RegistryAuth,
  type RegistryCapability,
} from './imageRegistry.ts'

export type OciRegistryOptions = {
  provider: string
  registry: string
  podman: PodmanExecutor
  /** Credencial para publicar o para leer un repositorio privado; sin ella, acceso anónimo. */
  auth?: RegistryAuth
  /** Lleva una referencia a la forma que el proveedor espera (alias del registro, espacio de nombres implícito). */
  normalize?: (reference: ImageReference) => ImageReference
  administrator?: RegistryAdministrator
}

function declaredCapabilities(administrator: RegistryAdministrator | undefined): Set<RegistryCapability> {
  const administrative = ADMINISTRATIVE_CAPABILITIES.filter(capability => administrator?.[capability] !== undefined)
  return new Set<RegistryCapability>([...CORE_CAPABILITIES, ...administrative])
}

export function createOciRegistry(options: OciRegistryOptions): ImageRegistry {
  const { provider, registry, podman, auth } = options
  const normalize = options.normalize ?? (reference => reference)

  function own<R extends ImageReference>(reference: R): R {
    const normalized = normalize(reference) as R
    if (normalized.registry !== registry) throw new ForeignRegistryError(provider, registry, normalized.registry)
    return normalized
  }

  function withOptionalAuth<T>(body: (authFile?: string) => Promise<T>): Promise<T> {
    return auth === undefined ? body() : auth.withAuthFile(authFile => body(authFile))
  }

  async function pullPinned(reference: PinnedImageReference): Promise<PinnedImageReference> {
    const canonical = canonicalReference(reference)
    await withOptionalAuth(authFile => pullImage(podman, canonical, authFile))
    const stored = await storedDigest(podman, canonical)
    if (stored !== reference.digest) throw new ImageTransferError('verify', canonical, `se fijó ${reference.digest} y el almacén tiene ${stored}`)
    return reference
  }

  return {
    provider,
    registry,
    capabilities: declaredCapabilities(options.administrator),
    reader: {
      async resolve(reference) {
        const owned = own(reference)
        const tagged = taggedReference(owned)
        await withOptionalAuth(authFile => pullImage(podman, tagged, authFile))
        return pin(owned, await storedDigest(podman, tagged))
      },
      pull: reference => pullPinned(own(reference)),
      async inspect(reference) {
        return { reference: await pullPinned(own(reference)) }
      },
    },
    writer: {
      async push(localImage, destination) {
        const owned = own(destination)
        const digest = await withOptionalAuth(authFile => pushImage(podman, localImage, taggedReference(owned), authFile))
        return pin(owned, digest)
      },
    },
    ...(options.administrator === undefined ? {} : { administrator: options.administrator }),
  }
}
