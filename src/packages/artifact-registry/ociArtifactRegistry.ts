/**
 * El adapter genérico del puerto sobre el protocolo de distribución OCI:
 * cualquier registry compatible con artefactos OCI —Docker Hub, GHCR, Quay,
 * Harbor, un `registry:2` local— se usa con su URL y su credencial.
 *
 * Publicar sube cada archivo como blob leído en flujo desde su ruta, y un
 * manifest con `artifactType`: no hay imagen, capa de build ni tar intermedio,
 * así que el disco que cuesta es el de los archivos que ya existen.
 * Materializar baja y verifica un blob a la vez, en un temporal que se
 * renombra sólo si su sha256 coincide.
 */
import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import {
  OCI_MANIFEST_MEDIA_TYPE,
  TITLE_ANNOTATION,
  type ArtifactLayer,
  type ArtifactLocation,
  type ArtifactManifest,
  type ArtifactPush,
  type ArtifactRegistry,
  type ArtifactResult,
  type MaterializedFile,
  type PinnedArtifact,
  type PullOptions,
} from './artifactRegistry.js'
import { OciDistributionClient, type OciDistributionOptions } from './ociDistribution.js'

export interface OciArtifactRegistryOptions extends OciDistributionOptions {
  /** Si el provider admite DELETE de manifests; sin declarar, sí. */
  readonly supportsDelete?: boolean
}

export function createOciArtifactRegistry(options: OciArtifactRegistryOptions): ArtifactRegistry {
  const client = new OciDistributionClient(options)
  const registry: ArtifactRegistry = {
    capabilities: { delete: options.supportsDelete ?? true },
    pushArtifact: (artifact, destination) => pushArtifact(client, artifact, destination),
    resolveArtifact: location => resolveArtifact(client, location),
    inspectArtifact: pinned => inspectArtifact(client, pinned),
    pullArtifact: (pinned, targetDir, pullOptions) => pullArtifact(client, pinned, targetDir, pullOptions ?? {}),
  }
  if (options.supportsDelete ?? true) {
    registry.deleteArtifact = pinned => client.deleteManifest(pinned.repository, pinned.digest)
  }
  return registry
}

function digestOf(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`
}

async function pushArtifact(client: OciDistributionClient, artifact: ArtifactPush, destination: ArtifactLocation): Promise<ArtifactResult<PinnedArtifact>> {
  const configDigest = digestOf(artifact.config.bytes)
  const configPresent = await client.hasBlob(destination.repository, configDigest, 'pull,push')
  if (configPresent.status !== 'success') return configPresent
  if (!configPresent.value) {
    const uploaded = await uploadBytes(client, destination.repository, configDigest, artifact.config.bytes)
    if (uploaded.status !== 'success') return uploaded
  }
  for (const file of artifact.files) {
    const digest = `sha256:${file.sha256}`
    const present = await client.hasBlob(destination.repository, digest, 'pull,push')
    if (present.status !== 'success') return present
    if (present.value) continue
    const uploaded = await client.uploadBlobFromFile(destination.repository, digest, file.size, file.path)
    if (uploaded.status !== 'success') return uploaded
  }
  const manifest = new TextEncoder().encode(JSON.stringify({
    schemaVersion: 2,
    mediaType: OCI_MANIFEST_MEDIA_TYPE,
    artifactType: artifact.artifactType,
    config: { mediaType: artifact.config.mediaType, digest: configDigest, size: artifact.config.bytes.length },
    layers: artifact.files.map(file => ({ mediaType: file.mediaType, digest: `sha256:${file.sha256}`, size: file.size, annotations: { [TITLE_ANNOTATION]: file.title } })),
    annotations: artifact.annotations,
  }))
  const put = await client.putManifest(destination.repository, destination.tag, OCI_MANIFEST_MEDIA_TYPE, manifest)
  if (put.status !== 'success') return put
  const digest = digestOf(manifest)
  if (put.value && put.value !== digest) return { status: 'integrity_error', detail: `el registry guardó el manifest como ${put.value}, no como ${digest}` }
  return { status: 'success', value: { repository: destination.repository, digest } }
}

/** Un blob pequeño ya en memoria (el config): se escribe a un temporal sólo para reutilizar la subida en flujo. */
async function uploadBytes(client: OciDistributionClient, repository: string, digest: string, bytes: Uint8Array): Promise<ArtifactResult<void>> {
  const dir = await mkdtemp(join(tmpdir(), 'artifact-config-'))
  try {
    const path = join(dir, 'config')
    await writeFile(path, bytes)
    return await client.uploadBlobFromFile(repository, digest, bytes.length, path)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

async function resolveArtifact(client: OciDistributionClient, location: ArtifactLocation): Promise<ArtifactResult<PinnedArtifact>> {
  const head = await client.headManifest(location.repository, location.tag, OCI_MANIFEST_MEDIA_TYPE)
  if (head.status !== 'success') return head
  return { status: 'success', value: { repository: location.repository, digest: head.value.digest } }
}

async function inspectArtifact(client: OciDistributionClient, pinned: PinnedArtifact): Promise<ArtifactResult<ArtifactManifest>> {
  const fetched = await client.getManifest(pinned.repository, pinned.digest, OCI_MANIFEST_MEDIA_TYPE)
  if (fetched.status !== 'success') return fetched
  if (digestOf(fetched.value) !== pinned.digest) return { status: 'integrity_error', detail: `el manifest leído no corresponde a ${pinned.digest}` }
  const raw = JSON.parse(new TextDecoder().decode(fetched.value)) as {
    artifactType?: string
    config: ArtifactManifest['config']
    layers: Array<{ mediaType: string; digest: string; size: number; annotations?: Record<string, string> }>
    annotations?: Record<string, string>
  }
  const layers: ArtifactLayer[] = raw.layers.map(layer => ({ mediaType: layer.mediaType, digest: layer.digest, size: layer.size, title: layer.annotations?.[TITLE_ANNOTATION] ?? layer.digest.replace(':', '-') }))
  return { status: 'success', value: { artifactType: raw.artifactType ?? '', config: raw.config, layers, annotations: raw.annotations ?? {} } }
}

async function pullArtifact(client: OciDistributionClient, pinned: PinnedArtifact, targetDir: string, options: PullOptions): Promise<ArtifactResult<readonly MaterializedFile[]>> {
  const manifest = await inspectArtifact(client, pinned)
  if (manifest.status !== 'success') return manifest
  await mkdir(targetDir, { recursive: true })
  const materialized: MaterializedFile[] = []
  for (const layer of manifest.value.layers) {
    const blob = await client.getBlob(pinned.repository, layer.digest)
    if (blob.status !== 'success') return blob
    const finalPath = join(targetDir, layer.title)
    const partialPath = `${finalPath}.partial`
    const hash = createHash('sha256')
    let size = 0
    const body = Readable.fromWeb(blob.value.body as import('node:stream/web').ReadableStream<Uint8Array>)
    body.on('data', (chunk: Buffer) => { hash.update(chunk); size += chunk.length })
    await pipeline(body, createWriteStream(partialPath))
    const digest = `sha256:${hash.digest('hex')}`
    if (digest !== layer.digest || size !== layer.size) {
      await rm(partialPath, { force: true })
      return { status: 'integrity_error', detail: `${layer.title}: se leyó ${digest} (${size} bytes), el manifest declara ${layer.digest} (${layer.size} bytes)` }
    }
    await rename(partialPath, finalPath)
    const file: MaterializedFile = { title: layer.title, digest, size, path: options.discardAfterVerify ? undefined : finalPath }
    await options.onVerified?.({ ...file, verifiedPath: finalPath })
    if (options.discardAfterVerify) await rm(finalPath, { force: true })
    materialized.push(file)
  }
  return { status: 'success', value: materialized }
}
