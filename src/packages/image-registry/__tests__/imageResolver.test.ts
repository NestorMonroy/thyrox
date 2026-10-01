/**
 * Resolver la imagen de un trabajo (contratos 15, 16 y 19 de TASK-THYROX-0691):
 * la admisión de disco precede a cualquier pull o build; una imagen permanente
 * se recupera desde un almacén vacío por su registro y su digest; una de caché
 * se reutiliza o se reconstruye; y el resolvedor no sabe qué proveedor hay
 * detrás del registro.
 */
import { describe, expect, test } from 'bun:test'

import { LIFECYCLE_LABEL } from '../imageLifecycle.ts'
import { canonicalReference, pin } from '../imageReference.ts'
import { requireWriter, type ImageRegistry } from '../imageRegistry.ts'
import { createImageResolver, ImageAdmissionRefusedError } from '../imageResolver.ts'
import { createImageRegistry } from '../registryFactory.ts'
import { createFakePodmanRegistry, type FakePodmanRegistry } from '../testing/fakePodmanRegistry.ts'

const BUILD = { context: '/ctx', tag: 'localhost/item-image:run-7' }

function admissionLog(refuse = false) {
  const admitted: { bytes: number; purpose: string }[] = []
  return {
    admitted,
    async admitDisk(bytes: number, purpose: string) {
      if (refuse) throw new ImageAdmissionRefusedError(purpose, bytes, 10)
      admitted.push({ bytes, purpose })
    },
  }
}

async function publishedPermanent(podman: FakePodmanRegistry, registry: ImageRegistry) {
  podman.addLocalImage('localhost/thyrox-model-quantizer:v1', { [LIFECYCLE_LABEL]: 'permanent' })
  const pinned = await requireWriter(registry).push('localhost/thyrox-model-quantizer:v1', { registry: registry.registry, repository: 'th3rox/thyrox-model-quantizer', tag: 'v1' })
  podman.images.clear()
  return pinned
}

describe('resolver por ciclo de vida', () => {
  test('una permanente se recupera desde un almacén vacío por registro y digest, tras admitir el disco', async () => {
    const podman = createFakePodmanRegistry()
    const registry = createImageRegistry({ provider: 'dockerhub' }, { podman })
    const pinned = await publishedPermanent(podman, registry)
    expect(podman.images.size).toBe(0)
    const admission = admissionLog()
    const resolver = createImageResolver({ podman, registryFor: () => registry, admitDisk: admission.admitDisk })
    const resolved = await resolver.resolve({ lifecycle: 'permanent', source: 'registry', reference: pinned, estimatedDiskBytes: 1_300_000_000 })
    expect(resolved).toEqual({ lifecycle: 'permanent', localReference: canonicalReference(pinned), digest: pinned.digest })
    expect(admission.admitted).toEqual([{ bytes: 1_300_000_000, purpose: `pull ${canonicalReference(pinned)}` }])
  })

  test('una permanente ya presente con su digest no se vuelve a traer ni pide disco', async () => {
    const podman = createFakePodmanRegistry()
    const registry = createImageRegistry({ provider: 'dockerhub' }, { podman })
    const pinned = await publishedPermanent(podman, registry)
    const admission = admissionLog()
    const resolver = createImageResolver({ podman, registryFor: () => registry, admitDisk: admission.admitDisk })
    await resolver.resolve({ lifecycle: 'permanent', source: 'registry', reference: pinned, estimatedDiskBytes: 1 })
    const pullsBefore = podman.calls.filter(call => call[0] === 'pull').length
    await resolver.resolve({ lifecycle: 'permanent', source: 'registry', reference: pinned, estimatedDiskBytes: 1 })
    expect(podman.calls.filter(call => call[0] === 'pull').length).toBe(pullsBefore)
    expect(admission.admitted.length).toBe(1)
  })

  test('sin disco admitido rehúsa antes de llamar a pull o build', async () => {
    const podman = createFakePodmanRegistry()
    const registry = createImageRegistry({ provider: 'dockerhub' }, { podman })
    const pinned = pin({ registry: 'docker.io', repository: 'th3rox/q' }, `sha256:${'2'.repeat(64)}`)
    const resolver = createImageResolver({ podman, registryFor: () => registry, admitDisk: admissionLog(true).admitDisk })
    await expect(resolver.resolve({ lifecycle: 'permanent', source: 'registry', reference: pinned, estimatedDiskBytes: 9 })).rejects.toBeInstanceOf(ImageAdmissionRefusedError)
    await expect(resolver.resolve({ lifecycle: 'ephemeral', source: 'local-build', build: BUILD, owner: { kind: 'task', id: 'run-7' }, estimatedDiskBytes: 9 })).rejects.toBeInstanceOf(ImageAdmissionRefusedError)
    expect(podman.calls.some(call => call[0] === 'pull' || call[0] === 'build')).toBe(false)
  })

  test('una efímera se construye con su ciclo de vida y su dueño declarados', async () => {
    const podman = createFakePodmanRegistry()
    const resolver = createImageResolver({ podman, registryFor: () => createImageRegistry({ provider: 'dockerhub' }, { podman }), admitDisk: admissionLog().admitDisk })
    const resolved = await resolver.resolve({ lifecycle: 'ephemeral', source: 'local-build', build: BUILD, owner: { kind: 'task', id: 'run-7' }, estimatedDiskBytes: 5 })
    expect(resolved.localReference).toBe(BUILD.tag)
    expect(podman.findImage(BUILD.tag)?.labels[LIFECYCLE_LABEL]).toBe('ephemeral')
  })

  test('una de caché se reutiliza si su clave existe y se reconstruye si se perdió', async () => {
    const podman = createFakePodmanRegistry()
    const resolver = createImageResolver({ podman, registryFor: () => createImageRegistry({ provider: 'dockerhub' }, { podman }), admitDisk: admissionLog().admitDisk })
    const requirement = { lifecycle: 'cache' as const, source: 'local-build' as const, build: { context: '/ctx', tag: 'localhost/toolchain:cache' }, cacheKey: 'inputs-abc', estimatedDiskBytes: 5 }
    await resolver.resolve(requirement)
    await resolver.resolve(requirement)
    expect(podman.calls.filter(call => call[0] === 'build').length).toBe(1)
    podman.images.clear()
    await resolver.resolve(requirement)
    expect(podman.calls.filter(call => call[0] === 'build').length).toBe(2)
  })

  test('el resolvedor no cambia si el registro pasa de Docker Hub a un OCI genérico', async () => {
    for (const config of [{ provider: 'dockerhub' }, { provider: 'generic-oci', registry: 'registry.example.com' }]) {
      const podman = createFakePodmanRegistry()
      const registry = createImageRegistry(config, { podman })
      const pinned = await publishedPermanent(podman, registry)
      const resolver = createImageResolver({ podman, registryFor: () => registry, admitDisk: admissionLog().admitDisk })
      expect((await resolver.resolve({ lifecycle: 'permanent', source: 'registry', reference: pinned, estimatedDiskBytes: 1 })).digest).toBe(pinned.digest)
    }
  })
})
