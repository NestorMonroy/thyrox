/**
 * La factory elige el adapter por configuración, y la prueba de arquitectura:
 * el mismo consumidor publica y consume con Docker Hub o con un registro OCI
 * genérico sin cambiar una línea.
 */
import { describe, expect, test } from 'bun:test'

import { canonicalReference, type ImageReference } from '../imageReference.ts'
import { type ImageRegistry, requireWriter } from '../imageRegistry.ts'
import { createImageRegistry, InvalidRegistryConfigError, REGISTRY_PROVIDERS, UnknownRegistryProviderError } from '../registryFactory.ts'
import { createFakePodmanRegistry } from '../testing/fakePodmanRegistry.ts'

/** Un consumidor que sólo conoce el puerto: publica, y consume por digest lo publicado. */
async function publishThenConsume(registry: ImageRegistry, destination: ImageReference): Promise<string> {
  const pinned = await requireWriter(registry).push('localhost/thyrox-model-quantizer:dev', destination)
  return canonicalReference(await registry.reader.pull(pinned))
}

describe('factory de registros', () => {
  test('declara los proveedores por nombre', () => {
    expect([...REGISTRY_PROVIDERS].sort()).toEqual(['dockerhub', 'generic-oci'])
  })

  test('un proveedor desconocido rehúsa nombrando los declarados', () => {
    expect(() => createImageRegistry({ provider: 'quay' }, { podman: createFakePodmanRegistry() })).toThrow(UnknownRegistryProviderError)
    expect(() => createImageRegistry({ provider: 'quay' }, { podman: createFakePodmanRegistry() })).toThrow(/dockerhub, generic-oci/)
  })

  test('generic-oci exige el registro y dockerhub rehúsa otro que no sea docker.io', () => {
    expect(() => createImageRegistry({ provider: 'generic-oci' }, { podman: createFakePodmanRegistry() })).toThrow(InvalidRegistryConfigError)
    expect(() => createImageRegistry({ provider: 'dockerhub', registry: 'ghcr.io' }, { podman: createFakePodmanRegistry() })).toThrow(InvalidRegistryConfigError)
  })

  test('cambiar el proveedor en la configuración no cambia al consumidor', async () => {
    const hub = createImageRegistry({ provider: 'dockerhub' }, { podman: createFakePodmanRegistry() })
    const generic = createImageRegistry({ provider: 'generic-oci', registry: 'registry.example.com' }, { podman: createFakePodmanRegistry() })
    const fromHub = await publishThenConsume(hub, { registry: 'docker.io', repository: 'th3rox/thyrox-model-quantizer', tag: 'v1' })
    const fromGeneric = await publishThenConsume(generic, { registry: 'registry.example.com', repository: 'thyrox/model-quantizer', tag: 'v1' })
    expect(fromHub).toMatch(/^docker\.io\/th3rox\/thyrox-model-quantizer@sha256:[0-9a-f]{64}$/)
    expect(fromGeneric).toMatch(/^registry\.example\.com\/thyrox\/model-quantizer@sha256:[0-9a-f]{64}$/)
    expect(hub.provider).toBe('dockerhub')
    expect(generic.provider).toBe('generic-oci')
  })
})
