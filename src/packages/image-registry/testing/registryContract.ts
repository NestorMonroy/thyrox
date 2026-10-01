/**
 * El contrato común de un `ImageRegistry` (TASK-THYROX-0725): toda
 * implementación —en memoria, OCI genérica, Docker Hub u otra— lo cumple, y un
 * consumidor sólo puede contar con esto.
 */
import { describe, expect, test } from 'bun:test'

import { canonicalReference, isPinned, type ImageReference } from '../imageReference.ts'
import { CORE_CAPABILITIES, ForeignRegistryError, type ImageRegistry, requireAdministration, requireWriter } from '../imageRegistry.ts'

export type ContractSubject = {
  registry: ImageRegistry
  localImage: string
  otherLocalImage: string
  destination: ImageReference
}

export function describeImageRegistryContract(name: string, setUp: () => ContractSubject): void {
  describe(`contrato ImageRegistry — ${name}`, () => {
    test('declara el núcleo OCI completo', () => {
      const { registry } = setUp()
      for (const capability of CORE_CAPABILITIES) expect(registry.capabilities.has(capability)).toBe(true)
    })

    test('push devuelve la referencia fijada por digest, en el mismo registro y repositorio', async () => {
      const { registry, localImage, destination } = setUp()
      const pinned = await requireWriter(registry).push(localImage, destination)
      expect(isPinned(pinned)).toBe(true)
      expect(pinned.registry).toBe(registry.registry)
      expect(pinned.repository).toBe(destination.repository)
    })

    test('resolve de la etiqueta publicada da el mismo digest que devolvió push', async () => {
      const { registry, localImage, destination } = setUp()
      const pinned = await requireWriter(registry).push(localImage, destination)
      expect((await registry.reader.resolve(destination)).digest).toBe(pinned.digest)
    })

    test('pull e inspect por digest devuelven la misma referencia', async () => {
      const { registry, localImage, destination } = setUp()
      const pinned = await requireWriter(registry).push(localImage, destination)
      expect(canonicalReference(await registry.reader.pull(pinned))).toBe(canonicalReference(pinned))
      expect(canonicalReference((await registry.reader.inspect(pinned)).reference)).toBe(canonicalReference(pinned))
    })

    test('dos imágenes distintas dan dos digests distintos', async () => {
      const { registry, localImage, otherLocalImage, destination } = setUp()
      const first = await requireWriter(registry).push(localImage, destination)
      const second = await requireWriter(registry).push(otherLocalImage, { ...destination, tag: 'other' })
      expect(second.digest).not.toBe(first.digest)
    })

    test('una referencia de otro registro rehúsa', async () => {
      const { registry, localImage, destination } = setUp()
      await expect(requireWriter(registry).push(localImage, { ...destination, registry: 'otro.example.com' })).rejects.toBeInstanceOf(ForeignRegistryError)
    })

    test('una capacidad administrativa no declarada rehúsa nombrándola', () => {
      const { registry } = setUp()
      if (registry.capabilities.has('deleteRepository')) return
      expect(() => requireAdministration(registry, 'deleteRepository')).toThrow(/deleteRepository/)
    })
  })
}
