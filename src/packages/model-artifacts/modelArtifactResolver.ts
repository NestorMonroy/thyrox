/**
 * La frontera entre identidad de contenido e identidad de distribución
 * (TASK-THYROX-0729).
 *
 * El catálogo declara QUÉ contenido necesita un modelo —`CatalogArtifact`:
 * formato, sha256 y bytes del GGUF— y no sabe dónde vive. El
 * `ModelArtifactResolver` responde DE DÓNDE se obtiene ese contenido: un
 * artefacto permanente fijado por el digest de su manifest, en un registry y
 * un repositorio. El registry no entra al catálogo.
 *
 * El índice de ubicaciones se busca sólo por digest de contenido: dos
 * artefactos con el mismo repositorio o tag nunca se confunden, y un tamaño
 * distinto del declarado no resuelve, porque entonces no es el mismo
 * contenido. Es puro: no lee red; su persistencia es un JSON canónico con
 * escritura atómica, como el catálogo.
 */
import { readFile, rename, rm, writeFile } from 'node:fs/promises'

import type { CatalogArtifact } from './catalogEntry.js'

/** Dónde se publicó un contenido: lo que registra una publicación verificada. */
export interface ArtifactLocation {
  /** 64 hex en minúsculas, sin prefijo: el sha256 del GGUF, igual al de `CatalogArtifact`. */
  readonly contentSha256: string
  readonly bytes: number
  readonly registry: string
  readonly repository: string
  /** `sha256:<64 hex>`: el manifest que contiene la capa. */
  readonly manifestDigest: string
}

/** La identidad de distribución inmutable de un artefacto de modelo. */
export interface PinnedModelArtifact {
  readonly registry: string
  readonly repository: string
  readonly manifestDigest: string
  /** `sha256:<64 hex>`: la capa que es el GGUF. */
  readonly blobDigest: string
  readonly bytes: number
}

export type ArtifactResolution =
  | { readonly status: 'resolved'; readonly pinned: PinnedModelArtifact }
  | { readonly status: 'not_materializable'; readonly reason: string }

export interface ModelArtifactResolver {
  resolve(artifact: CatalogArtifact): Promise<ArtifactResolution>
}

export class InvalidArtifactLocationError extends Error {
  constructor(field: string, value: unknown) {
    super(`ubicación de artefacto inválida: ${field} = ${JSON.stringify(value)}`)
    this.name = 'InvalidArtifactLocationError'
  }
}

export class ArtifactLocationConflictError extends Error {
  constructor(location: ArtifactLocation) {
    super(`el contenido ${location.contentSha256} ya está registrado en ${location.repository}@${location.manifestDigest} con otro tamaño`)
    this.name = 'ArtifactLocationConflictError'
  }
}

const SHA256_HEX = /^[0-9a-f]{64}$/
const OCI_DIGEST = /^sha256:[0-9a-f]{64}$/

function validated(location: ArtifactLocation): ArtifactLocation {
  if (!SHA256_HEX.test(location.contentSha256)) throw new InvalidArtifactLocationError('contentSha256', location.contentSha256)
  if (!Number.isInteger(location.bytes) || location.bytes <= 0) throw new InvalidArtifactLocationError('bytes', location.bytes)
  if (!location.registry) throw new InvalidArtifactLocationError('registry', location.registry)
  if (!location.repository) throw new InvalidArtifactLocationError('repository', location.repository)
  if (!OCI_DIGEST.test(location.manifestDigest)) throw new InvalidArtifactLocationError('manifestDigest', location.manifestDigest)
  return {
    bytes: location.bytes,
    contentSha256: location.contentSha256,
    manifestDigest: location.manifestDigest,
    registry: location.registry,
    repository: location.repository,
  }
}

function sameManifest(a: ArtifactLocation, b: ArtifactLocation): boolean {
  return a.contentSha256 === b.contentSha256 && a.registry === b.registry
    && a.repository === b.repository && a.manifestDigest === b.manifestDigest
}

function orderKey(location: ArtifactLocation): string {
  return [location.contentSha256, location.registry, location.repository, location.manifestDigest].join('\u0000')
}

/** Índice inmutable de ubicaciones, ordenado para que su JSON sea estable. */
export class ArtifactLocationIndex {
  private constructor(private readonly entries: readonly ArtifactLocation[]) {}

  static of(locations: readonly ArtifactLocation[]): ArtifactLocationIndex {
    return locations.reduce((index, location) => index.with(location), new ArtifactLocationIndex([]))
  }

  locations(): readonly ArtifactLocation[] {
    return this.entries
  }

  /** Añade una ubicación; la misma otra vez no cambia nada, y el mismo manifest con otro tamaño rehúsa. */
  with(location: ArtifactLocation): ArtifactLocationIndex {
    const candidate = validated(location)
    const existing = this.entries.find(entry => sameManifest(entry, candidate))
    if (existing) {
      if (existing.bytes !== candidate.bytes) throw new ArtifactLocationConflictError(candidate)
      return this
    }
    return new ArtifactLocationIndex([...this.entries, candidate].sort((a, b) => orderKey(a).localeCompare(orderKey(b))))
  }

  forContent(sha256: string): readonly ArtifactLocation[] {
    return this.entries.filter(entry => entry.contentSha256 === sha256)
  }
}

export function createIndexedArtifactResolver(index: ArtifactLocationIndex): ModelArtifactResolver {
  return {
    async resolve(artifact) {
      const candidates = index.forContent(artifact.sha256)
      if (candidates.length === 0) {
        return { status: 'not_materializable', reason: `ningún artefacto permanente registrado contiene ${artifact.sha256}` }
      }
      const location = candidates.find(candidate => candidate.bytes === artifact.bytes)
      if (!location) {
        return { status: 'not_materializable', reason: `el contenido ${artifact.sha256} está registrado con otro tamaño que los ${artifact.bytes} bytes del catálogo` }
      }
      return {
        status: 'resolved',
        pinned: {
          registry: location.registry,
          repository: location.repository,
          manifestDigest: location.manifestDigest,
          blobDigest: `sha256:${location.contentSha256}`,
          bytes: location.bytes,
        },
      }
    },
  }
}

/** Lee el índice; un archivo ausente es un índice vacío, uno inválido es un error con la ruta. */
export async function loadArtifactLocationIndex(path: string): Promise<ArtifactLocationIndex> {
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ArtifactLocationIndex.of([])
    throw error
  }
  const document = JSON.parse(text) as { locations?: ArtifactLocation[] }
  if (!Array.isArray(document.locations)) throw new InvalidArtifactLocationError(`${path}: locations`, document.locations)
  return ArtifactLocationIndex.of(document.locations)
}

/** Escribe el índice en un temporal hermano y lo renombra sobre la ruta. */
export async function saveArtifactLocationIndex(path: string, index: ArtifactLocationIndex): Promise<void> {
  const temporaryPath = `${path}.${process.pid}.${Date.now()}.tmp`
  try {
    await writeFile(temporaryPath, `${JSON.stringify({ locations: index.locations() }, null, 2)}\n`, { flag: 'wx' })
    await rename(temporaryPath, path)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}
