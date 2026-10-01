/**
 * El adapter de Docker Hub (TASK-THYROX-0725). Su núcleo es el OCI genérico;
 * lo propio de Docker Hub queda aquí:
 *
 * - el registro tiene alias (`index.docker.io`, `registry-1.docker.io`) que se
 *   llevan a `docker.io`;
 * - un repositorio de un solo segmento es una imagen oficial, `library/<nombre>`;
 * - crear, cambiar la visibilidad y borrar repositorios es su API propia, y se
 *   ofrecen sólo si se entrega esa API.
 */
import type { PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

import type { ImageReference } from './imageReference.ts'
import type { ImageRegistry, RegistryAdministrator, RegistryAuth } from './imageRegistry.ts'
import { createOciRegistry } from './ociRegistry.ts'

export const DOCKER_HUB_PROVIDER = 'dockerhub'
export const DOCKER_HUB_REGISTRY = 'docker.io'
const DOCKER_HUB_ALIASES = new Set([DOCKER_HUB_REGISTRY, 'index.docker.io', 'registry-1.docker.io'])
const OFFICIAL_NAMESPACE = 'library'

export function normalizeDockerHubReference<R extends ImageReference>(reference: R): R {
  if (!DOCKER_HUB_ALIASES.has(reference.registry)) return reference
  const repository = reference.repository.includes('/') ? reference.repository : `${OFFICIAL_NAMESPACE}/${reference.repository}`
  return { ...reference, registry: DOCKER_HUB_REGISTRY, repository }
}

export type DockerHubRegistryOptions = {
  podman: PodmanExecutor
  auth?: RegistryAuth
  administrator?: RegistryAdministrator
}

export function createDockerHubRegistry(options: DockerHubRegistryOptions): ImageRegistry {
  return createOciRegistry({
    provider: DOCKER_HUB_PROVIDER,
    registry: DOCKER_HUB_REGISTRY,
    podman: options.podman,
    normalize: normalizeDockerHubReference,
    ...(options.auth === undefined ? {} : { auth: options.auth }),
    ...(options.administrator === undefined ? {} : { administrator: options.administrator }),
  })
}
