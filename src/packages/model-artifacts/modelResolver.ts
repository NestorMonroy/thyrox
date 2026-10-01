/**
 * Resolver de modelos (ADR-007 1.7.0, `ModelResolver`): dada una petición,
 * responde qué artefacto exacto del catálogo la satisface —revisión, formato,
 * cuantización— y cuánta memoria ocupa al servirse. No responde dónde se
 * ejecuta: eso es del scheduler.
 *
 * Es pura y determinista: no lee disco ni red, y no elige por preferencia
 * propia. Si la petición deja más de un candidato, rehúsa listándolos (M5:
 * ninguna capa cambia la cuantización en silencio).
 */

import type { CatalogArtifact, ModelCapability, ModelCatalogEntry } from './catalogEntry.js'
import { estimateServingMemoryFromShape, type KvCacheType, type ServingMemoryEstimate } from './memoryEstimate.js'
import { normalizeQuantizationLevel } from './quantizationLevel.js'

/** Petición por repositorio: los filtros ausentes no restringen. */
export interface ModelRepositoryRequest {
  readonly repository: string
  readonly quantization?: string
  /** Prefijo hex de la revisión completa, con o sin `sha256:`. */
  readonly revision?: string
}

export interface ModelExecutionRequest {
  /** Un nombre contractual exacto o una petición por repositorio. */
  readonly model: string | ModelRepositoryRequest
  readonly contextLength?: number
  readonly kvCacheType?: KvCacheType
  readonly requiredCapabilities?: readonly ModelCapability[]
}

export interface ResolvedModel {
  readonly entry: ModelCatalogEntry
  readonly artifact: CatalogArtifact
  readonly contextLength: number
  readonly kvCacheType: KvCacheType
  readonly memoryProfile: ServingMemoryEstimate
}

export class ModelNotDeclaredError extends Error {
  constructor(readonly requested: string) {
    super(`ningún modelo declarado satisface ${requested}`)
    this.name = 'ModelNotDeclaredError'
  }
}

export class AmbiguousModelRequestError extends Error {
  constructor(readonly requested: string, readonly candidates: readonly string[]) {
    super(`${requested} deja ${candidates.length} candidatos; hay que elegir uno: ${candidates.join(', ')}`)
    this.name = 'AmbiguousModelRequestError'
  }
}

export class MissingCapabilityError extends Error {
  constructor(readonly capability: ModelCapability, readonly candidates: readonly string[]) {
    super(`falta la capacidad «${capability}» en ${candidates.join(', ')}`)
    this.name = 'MissingCapabilityError'
  }
}

export class ContextLengthExceededError extends Error {
  constructor(readonly requested: number, readonly maxContextLength: number, readonly model: string) {
    super(`contexto ${requested} mayor que el máximo ${maxContextLength} de ${model}`)
    this.name = 'ContextLengthExceededError'
  }
}

const DIGEST_PREFIX = 'sha256:'

/** Resuelve la petición contra las entradas del catálogo, o rehúsa con un error tipado. */
export function resolveModel(request: ModelExecutionRequest, entries: readonly ModelCatalogEntry[]): ResolvedModel {
  const declared = declaredCandidates(request.model, entries)
  const capable = withCapabilities(declared, request.requiredCapabilities ?? [])
  const entry = singleCandidate(request.model, capable)
  const contextLength = effectiveContextLength(entry, request.contextLength)
  const kvCacheType = request.kvCacheType ?? entry.defaultKvCacheType
  return {
    entry,
    artifact: entry.artifact,
    contextLength,
    kvCacheType,
    memoryProfile: estimateServingMemoryFromShape({
      ggufBytes: entry.artifact.bytes,
      attention: entry.attention,
      contextLength,
      kvCacheType,
    }),
  }
}

/** Las entradas que el modelo pedido nombra; nunca vacío. */
function declaredCandidates(model: ModelExecutionRequest['model'], entries: readonly ModelCatalogEntry[]): readonly ModelCatalogEntry[] {
  const candidates = typeof model === 'string'
    ? entries.filter(entry => entry.name === model)
    : entries.filter(entry => matchesRepositoryRequest(entry, model))
  if (candidates.length === 0) throw new ModelNotDeclaredError(describeModel(model))
  return candidates
}

function matchesRepositoryRequest(entry: ModelCatalogEntry, request: ModelRepositoryRequest): boolean {
  return sameRepository(entry, request.repository)
    && matchesQuantization(entry, request.quantization)
    && matchesRevisionPrefix(entry, request.revision)
}

function sameRepository(entry: ModelCatalogEntry, repository: string): boolean {
  return entry.repository.toLowerCase() === repository.toLowerCase()
}

function matchesQuantization(entry: ModelCatalogEntry, quantization: string | undefined): boolean {
  return quantization === undefined || entry.quantization === normalizeQuantizationLevel(quantization)
}

function matchesRevisionPrefix(entry: ModelCatalogEntry, revision: string | undefined): boolean {
  return revision === undefined || bareRevision(entry.revision).startsWith(bareRevision(revision))
}

function bareRevision(revision: string): string {
  const lowered = revision.toLowerCase()
  return lowered.startsWith(DIGEST_PREFIX) ? lowered.slice(DIGEST_PREFIX.length) : lowered
}

/** Los candidatos que tienen todas las capacidades; si ninguno, rehúsa con la primera que falta. */
function withCapabilities(candidates: readonly ModelCatalogEntry[], required: readonly ModelCapability[]): readonly ModelCatalogEntry[] {
  const capable = candidates.filter(entry => missingCapabilities(entry, required).length === 0)
  if (capable.length > 0) return capable
  const [first] = sortedByName(candidates)
  const [missing] = missingCapabilities(first as ModelCatalogEntry, required)
  throw new MissingCapabilityError(missing as ModelCapability, namesOf(candidates))
}

function missingCapabilities(entry: ModelCatalogEntry, required: readonly ModelCapability[]): readonly ModelCapability[] {
  return required.filter(capability => !entry.capabilities.includes(capability))
}

function singleCandidate(model: ModelExecutionRequest['model'], candidates: readonly ModelCatalogEntry[]): ModelCatalogEntry {
  const [only] = candidates
  if (candidates.length > 1) throw new AmbiguousModelRequestError(describeModel(model), namesOf(candidates))
  return only as ModelCatalogEntry
}

function effectiveContextLength(entry: ModelCatalogEntry, requested: number | undefined): number {
  const contextLength = requested ?? entry.maxContextLength
  if (contextLength > entry.maxContextLength) {
    throw new ContextLengthExceededError(contextLength, entry.maxContextLength, entry.name)
  }
  return contextLength
}

function sortedByName(entries: readonly ModelCatalogEntry[]): readonly ModelCatalogEntry[] {
  return [...entries].sort(byName)
}

function byName(left: ModelCatalogEntry, right: ModelCatalogEntry): number {
  if (left.name === right.name) return 0
  return left.name < right.name ? -1 : 1
}

function namesOf(entries: readonly ModelCatalogEntry[]): readonly string[] {
  return sortedByName(entries).map(entry => entry.name)
}

function describeModel(model: ModelExecutionRequest['model']): string {
  if (typeof model === 'string') return `«${model}»`
  const filters = [`repository=${model.repository}`]
  if (model.quantization !== undefined) filters.push(`quantization=${model.quantization}`)
  if (model.revision !== undefined) filters.push(`revision=${model.revision}`)
  return `{${filters.join(', ')}}`
}
