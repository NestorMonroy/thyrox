/**
 * Docker Hub como provider del puerto de artefactos: el adapter genérico OCI
 * con la URL de su registry y su convención de nombres. Nada del dominio
 * depende de él; otro registry OCI compatible se usa con
 * `createOciArtifactRegistry` y su URL.
 *
 * `DELETE` de manifests por la API de distribución no se declara: su soporte
 * en Docker Hub no está medido, y un borrado que responda distinto de lo que
 * el puerto promete es peor que una capacidad ausente.
 */
import { createOciArtifactRegistry } from './ociArtifactRegistry.js'
import type { ArtifactRegistry } from './artifactRegistry.js'
import type { RegistryCredential, RetryPolicy } from './ociDistribution.js'

export const DOCKER_HUB_REGISTRY_URL = 'https://registry-1.docker.io'

/** Un repositorio sin usuario es oficial y vive bajo `library/`. */
export function dockerHubRepository(repository: string): string {
  return repository.includes('/') ? repository : `library/${repository}`
}

export interface DockerHubArtifactRegistryOptions {
  readonly credential: RegistryCredential
  readonly retry?: RetryPolicy
  readonly fetch?: typeof fetch
}

export function createDockerHubArtifactRegistry(options: DockerHubArtifactRegistryOptions): ArtifactRegistry {
  return createOciArtifactRegistry({ ...options, baseUrl: DOCKER_HUB_REGISTRY_URL, supportsDelete: false })
}
