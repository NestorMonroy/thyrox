/**
 * Catálogo de modelos declarados (ADR-007 1.7.0, `ModelCatalog`): qué modelos,
 * variantes, revisiones y cuantizaciones existen como declaración. No dice si
 * alguno está residente ni dónde se sirve: eso es del scheduler.
 *
 * Cada entrada se valida campo a campo y se rehúsa con la ruta del campo que
 * falla; el nombre contractual tiene que derivarse exactamente de sus partes.
 * El catálogo es inmutable y se persiste como JSON canónico (claves ordenadas,
 * entradas por nombre) con escritura atómica. La ruta del archivo es parámetro
 * del consumidor (DEC-04): este módulo no fija ningún hogar.
 */

import { readFile, rename, rm, stat, writeFile } from 'node:fs/promises'

import type { ArtifactFormat, CatalogArtifact, ModelCapability, ModelCatalogEntry } from './catalogEntry.js'
import { readGgufMetadata, type GgufMetadata } from './ggufMetadata.js'
import { KV_CACHE_BYTES_PER_ELEMENT, MissingGgufKeyError, attentionShapeOf, type AttentionShape, type KvCacheType } from './memoryEstimate.js'
import { InvalidModelNameInputError, thyroxModelName, type ModelSource } from './modelName.js'
import { normalizeQuantizationLevel, UnknownQuantizationLevelError, type QuantizationLevel } from './quantizationLevel.js'

export class InvalidCatalogEntryError extends Error {
  constructor(readonly field: string, readonly reason: string) {
    super(`entrada de catálogo inválida en ${field}: ${reason}`)
    this.name = 'InvalidCatalogEntryError'
  }
}

export class CatalogEntryConflictError extends Error {
  constructor(readonly entryName: string) {
    super(`el catálogo ya declara «${entryName}» con otro contenido`)
    this.name = 'CatalogEntryConflictError'
  }
}

/** Recalcular la forma de una entrada que el catálogo no declara: no se crea por esa vía. */
export class CatalogEntryMissingError extends Error {
  constructor(readonly entryName: string) {
    super(`el catálogo no declara «${entryName}»: una entrada nueva se declara con with`)
    this.name = 'CatalogEntryMissingError'
  }
}

export class CatalogFileError extends Error {
  constructor(readonly path: string, reason: string) {
    super(`catálogo ilegible (${path}): ${reason}`)
    this.name = 'CatalogFileError'
  }
}

/** Lo que declara quien registra un GGUF; el resto se lee del archivo. */
export interface GgufCatalogDeclaration {
  readonly path: string
  readonly repository: string
  readonly source: ModelSource
  readonly revision: string
  readonly quantization: string
  /** Digest del archivo, calculado por quien declara: el paquete no depende de un módulo de hash. */
  readonly sha256: string
  readonly capabilities: readonly ModelCapability[]
  readonly declaredAt: string
  readonly defaultKvCacheType: KvCacheType
}

const ROOT_FIELD = '<raíz>'
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/
const ISO_UTC_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/
const ISO_SECOND_PRECISION_LENGTH = 'YYYY-MM-DDTHH:MM:SS'.length
const FULL_REVISION_PATTERN_BY_SOURCE: Readonly<Record<ModelSource, RegExp>> = {
  hf: /^[0-9a-f]{40}$/,
  ollama: /^[0-9a-f]{64}$/,
}
const ARTIFACT_FORMATS: ReadonlySet<ArtifactFormat> = new Set(['gguf', 'ollama-registry'])
const MODEL_CAPABILITIES: ReadonlySet<ModelCapability> = new Set(['completion', 'tools', 'embeddings'])
const GGUF_ARCHITECTURE_KEY = 'general.architecture'
const FILE_NOT_FOUND_CODE = 'ENOENT'

type JsonObject = Record<string, unknown>

/** Valida una entrada desconocida y devuelve una copia con sólo los campos del contrato. */
export function validateCatalogEntry(value: unknown): ModelCatalogEntry {
  const root = requireObject(value, ROOT_FIELD)
  const repository = requireNonEmptyString(root, 'repository', '')
  const source = requireSource(root)
  const revision = requireFullRevision(root, source)
  const quantization = requireCanonicalQuantization(root)
  const name = requireDerivedName(root, { repository, source, revision, quantization })
  return {
    name,
    repository,
    source,
    revision,
    quantization,
    artifact: requireArtifact(root),
    architecture: requireNonEmptyString(root, 'architecture', ''),
    attention: requireAttention(root),
    maxContextLength: requirePositiveInteger(root, 'maxContextLength', ''),
    defaultKvCacheType: requireKvCacheType(root),
    capabilities: requireCapabilities(root),
    declaredAt: requireUtcInstant(root, 'declaredAt'),
  }
}

/** Construye la entrada de un GGUF en disco: arquitectura, atención y contexto salen de su metadata. */
export async function catalogEntryFromGguf(declaration: GgufCatalogDeclaration): Promise<ModelCatalogEntry> {
  const { metadata } = await readGgufMetadata(declaration.path)
  const attention = attentionShapeOf(metadata)
  const architecture = metadata[GGUF_ARCHITECTURE_KEY] as string
  const { size } = await stat(declaration.path)
  const artifact: CatalogArtifact = { format: 'gguf', sha256: declaration.sha256, bytes: size }
  return validateCatalogEntry({
    name: derivedName(declaration),
    repository: declaration.repository,
    source: declaration.source,
    revision: declaration.revision,
    quantization: canonicalQuantization(declaration.quantization),
    artifact,
    architecture,
    attention,
    maxContextLength: contextLengthOf(metadata, architecture),
    defaultKvCacheType: declaration.defaultKvCacheType,
    capabilities: declaration.capabilities,
    declaredAt: declaration.declaredAt,
  })
}

/** Colección inmutable de entradas, indexada por nombre contractual. */
export class ModelCatalog {
  private constructor(private readonly entriesByName: ReadonlyMap<string, ModelCatalogEntry>) {}

  static empty(): ModelCatalog {
    return new ModelCatalog(new Map())
  }

  /** Todas las entradas, ordenadas por nombre. */
  entries(): readonly ModelCatalogEntry[] {
    return Object.freeze([...this.entriesByName.values()].sort(byName))
  }

  byName(name: string): ModelCatalogEntry | undefined {
    return this.entriesByName.get(name)
  }

  /** Las variantes de un repositorio, por instante de declaración y después por nombre. */
  variantsOf(repository: string): readonly ModelCatalogEntry[] {
    const variants = [...this.entriesByName.values()].filter(entry => entry.repository === repository)
    return Object.freeze(variants.sort(byDeclarationThenName))
  }

  /** Un catálogo nuevo con la entrada; una idéntica ya presente no cambia nada, una distinta se rehúsa. */
  with(value: ModelCatalogEntry): ModelCatalog {
    const entry = validateCatalogEntry(value)
    const existing = this.entriesByName.get(entry.name)
    if (existing !== undefined) return this.keepIdentical(existing, entry)
    return new ModelCatalog(new Map([...this.entriesByName, [entry.name, entry]]))
  }

  /**
   * Un catálogo nuevo en el que la entrada existente toma la forma de atención
   * recalculada. La identidad sigue inmutable: cualquier otra diferencia es un
   * conflicto. Existe porque la forma es un dato derivado del artefacto y su
   * cálculo se corrigió (`attention.key_length`, H-THYROX-448).
   */
  withRederived(value: ModelCatalogEntry): ModelCatalog {
    const entry = validateCatalogEntry(value)
    const existing = this.entriesByName.get(entry.name)
    if (existing === undefined) throw new CatalogEntryMissingError(entry.name)
    if (canonicalJson({ ...existing, attention: entry.attention }) !== canonicalJson(entry)) throw new CatalogEntryConflictError(entry.name)
    return new ModelCatalog(new Map([...this.entriesByName, [entry.name, entry]]))
  }

  private keepIdentical(existing: ModelCatalogEntry, candidate: ModelCatalogEntry): ModelCatalog {
    if (canonicalJson(existing) !== canonicalJson(candidate)) throw new CatalogEntryConflictError(candidate.name)
    return this
  }
}

/** Lee el catálogo; un archivo ausente es un catálogo vacío, uno ilegible o inválido es un error con la ruta. */
export async function loadModelCatalog(path: string): Promise<ModelCatalog> {
  const text = await readCatalogText(path)
  if (text === undefined) return ModelCatalog.empty()
  return catalogFromText(path, text)
}

/** Escribe el catálogo como JSON canónico en un temporal hermano y lo renombra sobre la ruta. */
export async function saveModelCatalog(path: string, catalog: ModelCatalog): Promise<void> {
  const temporaryPath = `${path}.${process.pid}.${Date.now()}.tmp`
  try {
    await writeFile(temporaryPath, `${canonicalJson({ entries: catalog.entries() })}\n`, { flag: 'wx' })
    await rename(temporaryPath, path)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

async function readCatalogText(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if (isFileNotFound(error)) return undefined
    throw new CatalogFileError(path, (error as Error).message)
  }
}

function catalogFromText(path: string, text: string): ModelCatalog {
  const entries = parseEntryList(path, text)
  return entries.reduce<ModelCatalog>((catalog, value, index) => withFileContext(path, index, () => catalog.with(value as ModelCatalogEntry)), ModelCatalog.empty())
}

function parseEntryList(path: string, text: string): readonly unknown[] {
  let document: unknown
  try {
    document = JSON.parse(text) as unknown
  } catch (error) {
    throw new CatalogFileError(path, `no es JSON (${(error as Error).message})`)
  }
  if (!isObject(document) || !Array.isArray(document.entries)) throw new CatalogFileError(path, 'se espera un objeto con la lista «entries»')
  return document.entries as unknown[]
}

function withFileContext(path: string, index: number, add: () => ModelCatalog): ModelCatalog {
  try {
    return add()
  } catch (error) {
    if (error instanceof InvalidCatalogEntryError) throw new CatalogFileError(path, `${entryFieldPath(index, error.field)}: ${error.reason}`)
    if (error instanceof CatalogEntryConflictError) throw new CatalogFileError(path, `entries[${index}]: ${error.message}`)
    throw error
  }
}

function entryFieldPath(index: number, field: string): string {
  return field === ROOT_FIELD ? `entries[${index}]` : `entries[${index}].${field}`
}

function isFileNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === FILE_NOT_FOUND_CODE
}

function contextLengthOf(metadata: GgufMetadata, architecture: string): number {
  const key = `${architecture}.context_length`
  if (!Object.hasOwn(metadata, key)) throw new MissingGgufKeyError(key)
  const value = metadata[key]
  if (typeof value !== 'number') throw new InvalidCatalogEntryError(key, `se espera un entero, llegó ${String(value)}`)
  return value
}

function byName(left: ModelCatalogEntry, right: ModelCatalogEntry): number {
  return compareText(left.name, right.name)
}

function byDeclarationThenName(left: ModelCatalogEntry, right: ModelCatalogEntry): number {
  const instantOrder = Date.parse(left.declaredAt) - Date.parse(right.declaredAt)
  return instantOrder === 0 ? byName(left, right) : instantOrder
}

function compareText(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value))
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (!isObject(value)) return value
  const sortedKeys = Object.keys(value).sort()
  return Object.fromEntries(sortedKeys.map(key => [key, canonicalize(value[key])]))
}

function requireSource(root: JsonObject): ModelSource {
  const source = requireNonEmptyString(root, 'source', '')
  if (!Object.hasOwn(FULL_REVISION_PATTERN_BY_SOURCE, source)) throw new InvalidCatalogEntryError('source', `«${source}» no es hf ni ollama`)
  return source as ModelSource
}

function requireFullRevision(root: JsonObject, source: ModelSource): string {
  const revision = requireNonEmptyString(root, 'revision', '')
  const pattern = FULL_REVISION_PATTERN_BY_SOURCE[source]
  if (!pattern.test(revision)) throw new InvalidCatalogEntryError('revision', `«${revision}» no es la revisión completa de ${source} (${pattern.source})`)
  return revision
}

function requireCanonicalQuantization(root: JsonObject): QuantizationLevel {
  const quantization = requireNonEmptyString(root, 'quantization', '')
  const canonical = canonicalQuantization(quantization)
  if (canonical !== quantization) throw new InvalidCatalogEntryError('quantization', `«${quantization}» no es la forma canónica «${canonical}»`)
  return canonical
}

function canonicalQuantization(quantization: string): QuantizationLevel {
  try {
    return normalizeQuantizationLevel(quantization)
  } catch (error) {
    if (error instanceof UnknownQuantizationLevelError) throw new InvalidCatalogEntryError('quantization', error.message)
    throw error
  }
}

function requireDerivedName(root: JsonObject, parts: Parameters<typeof thyroxModelName>[0]): string {
  const name = requireNonEmptyString(root, 'name', '')
  const derived = derivedName(parts)
  if (name !== derived) throw new InvalidCatalogEntryError('name', `«${name}» no se deriva de sus partes («${derived}»)`)
  return name
}

function derivedName(parts: Parameters<typeof thyroxModelName>[0]): string {
  try {
    return thyroxModelName(parts)
  } catch (error) {
    if (!(error instanceof InvalidModelNameInputError)) throw error
    const field = error.field === 'repository' ? 'repository' : 'name'
    throw new InvalidCatalogEntryError(field, error.message)
  }
}

function requireArtifact(root: JsonObject): CatalogArtifact {
  const artifact = requireObject(root.artifact, 'artifact')
  const format = requireNonEmptyString(artifact, 'format', 'artifact')
  if (!ARTIFACT_FORMATS.has(format as ArtifactFormat)) throw new InvalidCatalogEntryError('artifact.format', `«${format}» no es ${[...ARTIFACT_FORMATS].join(', ')}`)
  return {
    format: format as ArtifactFormat,
    sha256: requireMatching(artifact, 'sha256', 'artifact', SHA256_HEX_PATTERN),
    bytes: requirePositiveInteger(artifact, 'bytes', 'artifact'),
  }
}

function requireAttention(root: JsonObject): AttentionShape {
  const attention = requireObject(root.attention, 'attention')
  return {
    blockCount: requirePositiveInteger(attention, 'blockCount', 'attention'),
    kvHeadCount: requirePositiveInteger(attention, 'kvHeadCount', 'attention'),
    headDimension: requirePositiveInteger(attention, 'headDimension', 'attention'),
  }
}

function requireKvCacheType(root: JsonObject): KvCacheType {
  const kvCacheType = requireNonEmptyString(root, 'defaultKvCacheType', '')
  if (!Object.hasOwn(KV_CACHE_BYTES_PER_ELEMENT, kvCacheType)) {
    throw new InvalidCatalogEntryError('defaultKvCacheType', `«${kvCacheType}» no es ${Object.keys(KV_CACHE_BYTES_PER_ELEMENT).join(', ')}`)
  }
  return kvCacheType as KvCacheType
}

function requireCapabilities(root: JsonObject): readonly ModelCapability[] {
  const capabilities = requirePresent(root, 'capabilities', '')
  if (!Array.isArray(capabilities) || capabilities.length === 0) throw new InvalidCatalogEntryError('capabilities', 'se espera una lista no vacía')
  capabilities.forEach(requireKnownCapability)
  if (new Set(capabilities).size !== capabilities.length) throw new InvalidCatalogEntryError('capabilities', 'hay capacidades repetidas')
  return [...capabilities] as ModelCapability[]
}

function requireKnownCapability(capability: unknown, index: number): void {
  if (!MODEL_CAPABILITIES.has(capability as ModelCapability)) {
    throw new InvalidCatalogEntryError(`capabilities[${index}]`, `«${String(capability)}» no es ${[...MODEL_CAPABILITIES].join(', ')}`)
  }
}

function requireUtcInstant(root: JsonObject, key: string): string {
  const instant = requireNonEmptyString(root, key, '')
  if (!isCalendarUtcInstant(instant)) throw new InvalidCatalogEntryError(key, `«${instant}» no es un instante ISO 8601 en UTC`)
  return instant
}

/** El patrón y además una fecha que existe: `Date` normaliza el 30 de febrero a marzo, y eso se detecta al volver a formatear. */
function isCalendarUtcInstant(instant: string): boolean {
  if (!ISO_UTC_INSTANT_PATTERN.test(instant)) return false
  const parsed = Date.parse(instant)
  if (Number.isNaN(parsed)) return false
  return new Date(parsed).toISOString().slice(0, ISO_SECOND_PRECISION_LENGTH) === instant.slice(0, ISO_SECOND_PRECISION_LENGTH)
}

function fieldPath(prefix: string, key: string): string {
  return prefix === '' ? key : `${prefix}.${key}`
}

function requirePresent(object: JsonObject, key: string, prefix: string): unknown {
  if (!Object.hasOwn(object, key)) throw new InvalidCatalogEntryError(fieldPath(prefix, key), 'falta')
  return object[key]
}

function requireNonEmptyString(object: JsonObject, key: string, prefix: string): string {
  const value = requirePresent(object, key, prefix)
  if (typeof value !== 'string' || value === '') throw new InvalidCatalogEntryError(fieldPath(prefix, key), 'se espera una cadena no vacía')
  return value
}

function requireMatching(object: JsonObject, key: string, prefix: string, pattern: RegExp): string {
  const value = requireNonEmptyString(object, key, prefix)
  if (!pattern.test(value)) throw new InvalidCatalogEntryError(fieldPath(prefix, key), `«${value}» no cumple ${pattern.source}`)
  return value
}

function requirePositiveInteger(object: JsonObject, key: string, prefix: string): number {
  const value = requirePresent(object, key, prefix)
  if (!isPositiveInteger(value)) throw new InvalidCatalogEntryError(fieldPath(prefix, key), `se espera un entero positivo, llegó ${String(value)}`)
  return value
}

function requireObject(value: unknown, field: string): JsonObject {
  if (value === undefined) throw new InvalidCatalogEntryError(field, 'falta')
  if (!isObject(value)) throw new InvalidCatalogEntryError(field, 'se espera un objeto')
  return value
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}
