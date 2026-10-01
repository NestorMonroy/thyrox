/**
 * Resolver la imagen de un trabajo hasta tenerla en el almacén local
 * (contratos 15, 16 y 19 de TASK-THYROX-0691).
 *
 * - `permanent` e `infrastructure`: si el almacén ya la tiene con su digest, se
 *   usa; si no, se trae del registro por digest. El almacén es caché.
 * - `ephemeral`: se construye con su dueño declarado.
 * - `cache`: se reutiliza la imagen de esa clave; si se perdió, se reconstruye.
 *
 * Antes de cualquier pull o build se admite su pico de disco; si no cabe, se
 * rehúsa sin haber empezado la descarga ni la construcción. El resolvedor no
 * sabe qué proveedor hay detrás: recibe el registro de cada referencia.
 */
import { storedDigest } from '@thyrox/podman-execution/imageTransfer.ts'
import { buildImage, imageExists, listImages } from '@thyrox/podman-execution/imageStore.ts'
import type { PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

import { CACHE_KEY_LABEL, type ImageLifecycle, LIFECYCLE_LABEL } from './imageLifecycle.ts'
import { canonicalReference, type PinnedImageReference } from './imageReference.ts'
import type { ImageRegistry } from './imageRegistry.ts'
import {
  buildLabels,
  type BuiltImageRequirement,
  type CacheImageRequirement,
  type ImageRequirement,
  type InfrastructureImageRequirement,
  type PermanentImageRequirement,
  validateImageRequirement,
} from './imageRequirement.ts'

export type ResolvedImage = { lifecycle: ImageLifecycle; localReference: string; digest?: string }

/** Reserva el disco de una operación o rehúsa con `ImageAdmissionRefusedError`. */
export type DiskAdmission = (bytes: number, purpose: string) => Promise<void>

export type ImageResolverOptions = {
  podman: PodmanExecutor
  registryFor: (reference: PinnedImageReference) => ImageRegistry
  admitDisk: DiskAdmission
}

export class ImageAdmissionRefusedError extends Error {
  constructor(purpose: string, neededBytes: number, availableBytes: number) {
    super(`no se admite ${purpose}: necesita ${neededBytes} bytes y caben ${availableBytes}`)
    this.name = 'ImageAdmissionRefusedError'
  }
}

export type ImageResolver = { resolve(requirement: ImageRequirement): Promise<ResolvedImage> }

export function createImageResolver(options: ImageResolverOptions): ImageResolver {
  const { podman, registryFor, admitDisk } = options

  async function resolvePinned(requirement: PermanentImageRequirement | InfrastructureImageRequirement): Promise<ResolvedImage> {
    const canonical = canonicalReference(requirement.reference)
    const present = (await imageExists(podman, canonical)) && (await storedDigest(podman, canonical)) === requirement.reference.digest
    if (!present) {
      await admitDisk(requirement.estimatedDiskBytes, `pull ${canonical}`)
      await registryFor(requirement.reference).reader.pull(requirement.reference)
    }
    return { lifecycle: requirement.lifecycle, localReference: canonical, digest: requirement.reference.digest }
  }

  async function build(requirement: BuiltImageRequirement): Promise<ResolvedImage> {
    await admitDisk(requirement.estimatedDiskBytes, `build ${requirement.build.tag}`)
    await buildImage(podman, { ...requirement.build, labels: buildLabels(requirement) })
    return { lifecycle: requirement.lifecycle, localReference: requirement.build.tag }
  }

  async function resolveCache(requirement: CacheImageRequirement): Promise<ResolvedImage> {
    const cached = await listImages(podman, { [LIFECYCLE_LABEL]: 'cache', [CACHE_KEY_LABEL]: requirement.cacheKey })
    const newest = cached.sort((left, right) => right.createdAt - left.createdAt)[0]
    if (newest === undefined) return build(requirement)
    return { lifecycle: 'cache', localReference: newest.names[0] ?? newest.id }
  }

  return {
    async resolve(requirement) {
      validateImageRequirement(requirement)
      switch (requirement.lifecycle) {
        case 'permanent':
        case 'infrastructure':
          return resolvePinned(requirement)
        case 'ephemeral':
          return build(requirement)
        case 'cache':
          return resolveCache(requirement)
      }
    },
  }
}
