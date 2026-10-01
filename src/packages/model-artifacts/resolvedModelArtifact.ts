/**
 * La identidad exacta de un artefacto de modelo una vez resuelto (ADR-007
 * 1.14.0): modelo, revisión completa, artefacto, formato y cuantización.
 *
 * La cuantización es un campo, no una identidad: `Q4_K_M` puede ser la de N
 * modelos distintos, y un mismo modelo puede tener varias. Por eso una
 * residencia, un grant y una unidad llevan esta identidad entera, y la
 * verificación del runtime la compara entera.
 *
 * `modelId` es el nombre contractual `thyrox-<org>--<repo>:<quant>-<source>-<revision12>`;
 * los demás campos son la fuente de verdad de lo que ese nombre abrevia, y una
 * identidad cuyo nombre no coincide con sus campos no es una identidad.
 */
import type { ArtifactFormat, ModelCatalogEntry } from './catalogEntry.js'
import { parseThyroxModelName, thyroxModelName, type ModelSource } from './modelName.js'
import type { QuantizationLevel } from './quantizationLevel.js'

export interface ResolvedModelArtifact {
  /** Nombre contractual del catálogo. */
  readonly modelId: string
  readonly repository: string
  readonly source: ModelSource
  /** Revisión completa: commit de HF (40 hex) o digest del manifiesto (64 hex); nunca sus 12 primeros. */
  readonly revision: string
  /** sha256 del contenido, 64 hex en minúsculas sin prefijo. */
  readonly artifactId: string
  readonly format: ArtifactFormat
  readonly quantization: QuantizationLevel
  readonly bytes: number
}

/** Un campo de la identidad contradice a otro, o al nombre contractual que la abrevia. */
export class InconsistentModelIdentityError extends Error {
  constructor(readonly modelId: string, readonly field: keyof ResolvedModelArtifact, detail: string) {
    super(`la identidad de ${modelId} no es coherente en ${field}: ${detail}`)
    this.name = 'InconsistentModelIdentityError'
  }
}

/** La identidad resuelta de una entrada del catálogo. */
export function resolvedArtifactOf(entry: ModelCatalogEntry): ResolvedModelArtifact {
  return {
    modelId: entry.name,
    repository: entry.repository,
    source: entry.source,
    revision: entry.revision,
    artifactId: entry.artifact.sha256,
    format: entry.artifact.format,
    quantization: entry.quantization,
    bytes: entry.artifact.bytes,
  }
}

/**
 * Lanza `InconsistentModelIdentityError` si el nombre contractual no abrevia
 * exactamente el repositorio, la fuente, la cuantización y los 12 primeros hex
 * de la revisión, si la revisión no es completa o si el artefacto no es un
 * sha256 de 64 hex.
 */
export function assertConsistentIdentity(artifact: ResolvedModelArtifact): void {
  const reject = (field: keyof ResolvedModelArtifact, detail: string): never => {
    throw new InconsistentModelIdentityError(artifact.modelId, field, detail)
  }
  if (!SHA256_HEX.test(artifact.artifactId)) reject('artifactId', `«${artifact.artifactId}» no es un sha256 de 64 hex`)
  if (!FULL_REVISION_BY_SOURCE[artifact.source].test(artifact.revision)) reject('revision', `«${artifact.revision}» no es una revisión completa de ${artifact.source}`)
  const named = parseThyroxModelName(artifact.modelId)
  if (named === undefined) return reject('modelId', 'no es un nombre contractual de thyrox')
  if (named.quantization !== artifact.quantization) reject('quantization', `el nombre declara ${named.quantization}`)
  if (named.source !== artifact.source) reject('source', `el nombre declara ${named.source}`)
  if (!bareRevision(artifact.revision).startsWith(named.revision)) reject('revision', `no empieza por ${named.revision}`)
  if (contractualNameOf(artifact) !== artifact.modelId) reject('repository', `el nombre declara ${named.repository}`)
}

/** Dos identidades son la misma sólo si coinciden todos sus campos. */
export function sameArtifactIdentity(left: ResolvedModelArtifact, right: ResolvedModelArtifact): boolean {
  return IDENTITY_FIELDS.every(field => left[field] === right[field])
}

const SHA256_HEX = /^[0-9a-f]{64}$/
const DIGEST_PREFIX = 'sha256:'
const FULL_REVISION_BY_SOURCE: Readonly<Record<ModelSource, RegExp>> = {
  hf: /^[0-9a-f]{40}$/,
  ollama: /^(?:sha256:)?[0-9a-f]{64}$/,
}
const IDENTITY_FIELDS: readonly (keyof ResolvedModelArtifact)[] = [
  'modelId', 'repository', 'source', 'revision', 'artifactId', 'format', 'quantization', 'bytes',
]

function bareRevision(revision: string): string {
  return revision.startsWith(DIGEST_PREFIX) ? revision.slice(DIGEST_PREFIX.length) : revision
}

/** El nombre que los campos abrevian; uno que el contrato rechaza no es ningún nombre. */
function contractualNameOf(artifact: ResolvedModelArtifact): string | undefined {
  try {
    return thyroxModelName({ repository: artifact.repository, quantization: artifact.quantization, source: artifact.source, revision: artifact.revision })
  } catch {
    return undefined
  }
}
