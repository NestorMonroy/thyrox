/**
 * Composición de una publicación real (TASK-THYROX-0728): el publicador con
 * su credencial en el proceso anfitrión, la verificación como trabajo de la
 * primitiva de Podman sin credencial, y el registro de publicación que
 * fija el digest.
 */
import { DOCKER_HUB_REGISTRY_URL } from './dockerHubArtifactRegistry.js'
import type { PublicationOutcome } from './publishArtifact.js'

export const PUBLICATION_RECORD_MEDIA_TYPE = 'application/vnd.thyrox.publication-record.v1+json'

/** Salida del comando: 0 verificado; 1 sin publicar o sin verificar; 2 rehusado antes de empezar; 3 límite del provider. */
export function publicationExitCode(outcome: PublicationOutcome): number {
  if (outcome.status === 'verified') return 0
  if (outcome.status === 'refused') return 2
  return outcome.result.status === 'rate_limited' ? 3 : 1
}

const DOCKER_HUB_NAMES = new Set(['docker.io', 'index.docker.io', 'registry-1.docker.io'])

/** La URL de la API de distribución de un registry declarado por nombre de host. */
export function registryBaseUrl(registry: string): string {
  return DOCKER_HUB_NAMES.has(registry) ? DOCKER_HUB_REGISTRY_URL : `https://${registry}`
}

const MEDIA_TYPES_BY_SUFFIX: readonly (readonly [string, string])[] = [
  ['.gguf', 'application/vnd.thyrox.gguf.v1'],
  ['.log', 'text/plain'],
  ['.txt', 'text/plain'],
  ['.json', 'application/json'],
]

export function mediaTypeOf(title: string): string {
  return MEDIA_TYPES_BY_SUFFIX.find(([suffix]) => title.endsWith(suffix))?.[1] ?? 'application/octet-stream'
}

/** Lo que queda después de publicar: la única referencia estable y cómo se probó. */
export function publicationRecord(outcome: PublicationOutcome, registry: string, tag: string, publishedAt: string): unknown {
  if (outcome.status !== 'verified') return { status: outcome.status, publishedAt, outcome }
  return {
    mediaType: PUBLICATION_RECORD_MEDIA_TYPE,
    status: 'verified',
    publishedAt,
    reference: `${registry}/${outcome.pinned.repository}@${outcome.pinned.digest}`,
    tag,
    files: outcome.files,
    verification: outcome.verification,
    localCopy: 'cache',
  }
}
