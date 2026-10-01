/**
 * Limpieza por ciclo de vida (contrato 18 de TASK-THYROX-0691): la efímera se
 * retira al terminar su dueño; si el dueño murió, el barrido la recupera; la
 * de caché se desaloja por presión de disco empezando por la más antigua; la
 * permanente, la de infraestructura y la que no declara su clase nunca las
 * toca un GC de tareas.
 */
import { describe, expect, test } from 'bun:test'

import { evictCacheImages, releaseOwnedImages, sweepOrphanImages } from '../imageCollector.ts'
import { CACHE_KEY_LABEL, LIFECYCLE_LABEL, OWNER_ID_LABEL, OWNER_KIND_LABEL } from '../imageLifecycle.ts'
import { createFakePodmanRegistry } from '../testing/fakePodmanRegistry.ts'

function populated() {
  const podman = createFakePodmanRegistry()
  podman.addLocalImage('localhost/item:run-7', { [LIFECYCLE_LABEL]: 'ephemeral', [OWNER_KIND_LABEL]: 'task', [OWNER_ID_LABEL]: 'run-7' })
  podman.addLocalImage('localhost/item:run-8', { [LIFECYCLE_LABEL]: 'ephemeral', [OWNER_KIND_LABEL]: 'task', [OWNER_ID_LABEL]: 'run-8' })
  podman.addLocalImage('localhost/toolchain:old', { [LIFECYCLE_LABEL]: 'cache', [CACHE_KEY_LABEL]: 'old' })
  podman.addLocalImage('localhost/toolchain:new', { [LIFECYCLE_LABEL]: 'cache', [CACHE_KEY_LABEL]: 'new' })
  podman.addLocalImage('localhost/thyrox-model-quantizer:v1', { [LIFECYCLE_LABEL]: 'permanent' })
  podman.addLocalImage('docker.io/library/redis:7.4', { [LIFECYCLE_LABEL]: 'infrastructure' })
  podman.addLocalImage('docker.io/library/ubuntu:24.04')
  return podman
}

function remainingNames(podman: ReturnType<typeof createFakePodmanRegistry>): string[] {
  return [...podman.images.values()].flatMap(image => image.names).sort()
}

describe('limpieza por ciclo de vida', () => {
  test('al terminar, el dueño retira sólo sus imágenes efímeras', async () => {
    const podman = populated()
    expect(await releaseOwnedImages(podman, { kind: 'task', id: 'run-7' })).toHaveLength(1)
    expect(remainingNames(podman)).not.toContain('localhost/item:run-7')
    expect(remainingNames(podman)).toContain('localhost/item:run-8')
  })

  test('un dueño que abortó deja su imagen recuperable por el barrido; uno vivo la conserva', async () => {
    const podman = populated()
    const removed = await sweepOrphanImages(podman, owner => owner.id === 'run-8')
    expect(removed).toHaveLength(1)
    expect(remainingNames(podman)).not.toContain('localhost/item:run-7')
    expect(remainingNames(podman)).toContain('localhost/item:run-8')
  })

  test('la caché se desaloja empezando por la más antigua hasta liberar lo pedido', async () => {
    const podman = populated()
    const evicted = await evictCacheImages(podman, 500)
    expect(evicted.freedBytes).toBe(1000)
    expect(remainingNames(podman)).not.toContain('localhost/toolchain:old')
    expect(remainingNames(podman)).toContain('localhost/toolchain:new')
  })

  test('ningún GC de tareas toca permanentes, infraestructura ni imágenes sin clase declarada', async () => {
    const podman = populated()
    await releaseOwnedImages(podman, { kind: 'task', id: 'run-7' })
    await sweepOrphanImages(podman, () => false)
    await evictCacheImages(podman, Number.MAX_SAFE_INTEGER)
    expect(remainingNames(podman)).toEqual(['docker.io/library/redis:7.4', 'docker.io/library/ubuntu:24.04', 'localhost/thyrox-model-quantizer:v1'])
  })
})
