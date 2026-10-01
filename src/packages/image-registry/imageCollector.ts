/**
 * Retirar imágenes según su ciclo de vida (contrato 18 de TASK-THYROX-0691).
 *
 * Cada operación lista por la etiqueta de ciclo de vida que le corresponde, así
 * que una imagen permanente, de infraestructura o sin clase declarada nunca
 * aparece en su lista: un GC de tareas no puede borrarla aunque quiera. Ninguna
 * decisión se toma por el nombre de la imagen.
 */
import { listImages, removeImage, type StoredImage } from '@thyrox/podman-execution/imageStore.ts'
import type { PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

import { type ImageOwner, LIFECYCLE_LABEL, OWNER_ID_LABEL, OWNER_KIND_LABEL, ownerOf } from './imageLifecycle.ts'

async function removeAll(podman: PodmanExecutor, images: readonly StoredImage[]): Promise<string[]> {
  for (const image of images) await removeImage(podman, image.id)
  return images.map(image => image.id)
}

/** Retira las imágenes efímeras de un dueño que terminó; devuelve sus ids. */
export async function releaseOwnedImages(podman: PodmanExecutor, owner: ImageOwner): Promise<string[]> {
  const owned = await listImages(podman, { [LIFECYCLE_LABEL]: 'ephemeral', [OWNER_KIND_LABEL]: owner.kind, [OWNER_ID_LABEL]: owner.id })
  return removeAll(podman, owned)
}

/**
 * Retira las imágenes efímeras cuyo dueño ya no vive. Quién está vivo lo
 * decide el dueño del ciclo de vida (daemon, pool), no este módulo; una
 * efímera sin dueño legible también es huérfana.
 */
export async function sweepOrphanImages(podman: PodmanExecutor, isOwnerAlive: (owner: ImageOwner) => boolean | Promise<boolean>): Promise<string[]> {
  const ephemeral = await listImages(podman, { [LIFECYCLE_LABEL]: 'ephemeral' })
  const orphans: StoredImage[] = []
  for (const image of ephemeral) {
    const owner = ownerOf(image.labels)
    if (owner === undefined || !(await isOwnerAlive(owner))) orphans.push(image)
  }
  return removeAll(podman, orphans)
}

export type CacheEviction = { removed: string[]; freedBytes: number }

/** Desaloja imágenes de caché, la más antigua primero, hasta liberar `bytesToFree`. */
export async function evictCacheImages(podman: PodmanExecutor, bytesToFree: number): Promise<CacheEviction> {
  const cached = (await listImages(podman, { [LIFECYCLE_LABEL]: 'cache' })).sort((left, right) => left.createdAt - right.createdAt)
  const chosen: StoredImage[] = []
  let freedBytes = 0
  for (const image of cached) {
    if (freedBytes >= bytesToFree) break
    chosen.push(image)
    freedBytes += image.sizeBytes
  }
  return { removed: await removeAll(podman, chosen), freedBytes }
}
