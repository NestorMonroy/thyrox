/**
 * Un registro en memoria que cumple el contrato `ImageRegistry`, para probar
 * consumidores sin red ni runtime. El digest de una imagen publicada es el
 * sha256 de su nombre local, así que publicar dos veces la misma imagen da el
 * mismo digest y publicar otra da uno distinto.
 */
import { createHash } from 'node:crypto'

import { canonicalReference, pin, taggedReference } from '../imageReference.ts'
import {
  CORE_CAPABILITIES,
  ForeignRegistryError,
  type ImageRegistry,
  type RegistryAdministrator,
  type RegistryCapability,
} from '../imageRegistry.ts'

export const IN_MEMORY_PROVIDER = 'in-memory'

export function digestOfLocalImage(localImage: string): string {
  return `sha256:${createHash('sha256').update(localImage).digest('hex')}`
}

export type InMemoryRegistry = ImageRegistry & { readonly tags: Map<string, string>; readonly manifests: Set<string> }

export function createInMemoryRegistry(options: { registry: string; administrator?: RegistryAdministrator }): InMemoryRegistry {
  const tags = new Map<string, string>()
  const manifests = new Set<string>()
  const own = (registry: string) => {
    if (registry !== options.registry) throw new ForeignRegistryError(IN_MEMORY_PROVIDER, options.registry, registry)
  }
  const capabilities = new Set<RegistryCapability>([...CORE_CAPABILITIES])
  for (const capability of ['createRepository', 'setVisibility', 'deleteRepository', 'deleteImage'] as const) {
    if (options.administrator?.[capability] !== undefined) capabilities.add(capability)
  }
  const ensureKnown = (canonical: string) => {
    if (!manifests.has(canonical)) throw new Error(`manifest unknown: ${canonical}`)
  }
  return {
    provider: IN_MEMORY_PROVIDER,
    registry: options.registry,
    capabilities,
    tags,
    manifests,
    reader: {
      async resolve(reference) {
        own(reference.registry)
        const digest = tags.get(taggedReference(reference))
        if (digest === undefined) throw new Error(`manifest unknown: ${taggedReference(reference)}`)
        return pin(reference, digest)
      },
      async pull(reference) {
        own(reference.registry)
        ensureKnown(canonicalReference(reference))
        return reference
      },
      async inspect(reference) {
        own(reference.registry)
        ensureKnown(canonicalReference(reference))
        return { reference }
      },
    },
    writer: {
      async push(localImage, destination) {
        own(destination.registry)
        const pinned = pin(destination, digestOfLocalImage(localImage))
        tags.set(taggedReference(destination), pinned.digest)
        manifests.add(canonicalReference(pinned))
        return pinned
      },
    },
    ...(options.administrator === undefined ? {} : { administrator: options.administrator }),
  }
}
