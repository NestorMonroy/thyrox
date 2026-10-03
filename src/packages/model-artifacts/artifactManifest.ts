/**
 * Manifiesto de procedencia de un artefacto GGUF: de qué repositorio y
 * revisión salió, el sha256 de cada archivo de la fuente, qué convertidor e
 * imagen (con digest) lo produjo, a qué nivel, el sha256 y los bytes del GGUF,
 * su validación y cuándo se creó.
 *
 * Se serializa a JSON canónico (claves ordenadas en todos los niveles), así que
 * dos manifiestos iguales dan el mismo texto byte a byte. Al leer se valida:
 * un campo que falta es un error con su ruta, nunca un valor por defecto.
 */

import { thyroxModelName, type ModelSource } from './modelName.js'
import { normalizeQuantizationLevel, UnknownQuantizationLevelError } from './quantizationLevel.js'

export interface SourceFileDigest {
  readonly path: string
  readonly sha256: string
}

export interface ConverterProvenance {
  readonly name: string
  readonly image: string
  /** Digest de la imagen (`sha256:`+64 hex): una etiqueta sola no fija el convertidor. */
  readonly imageDigest: string
}

export interface GgufDigest {
  readonly sha256: string
  readonly bytes: number
}

export interface ArtifactValidation {
  readonly perplexity: number
  readonly tokensPerSecond: number
  readonly loaded: boolean
}

export interface ArtifactManifest {
  readonly repository: string
  readonly source: ModelSource
  readonly revision: string
  readonly sourceFiles: readonly SourceFileDigest[]
  readonly converter: ConverterProvenance
  readonly quantization: string
  readonly gguf: GgufDigest
  readonly validation: ArtifactValidation
  /** Instante ISO 8601 en UTC. */
  readonly createdAt: string
}

export class InvalidArtifactManifestError extends Error {
  constructor(readonly field: string, reason: string) {
    super(`manifiesto de artefacto inválido en ${field}: ${reason}`)
    this.name = 'InvalidArtifactManifestError'
  }
}

const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/
const IMAGE_DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/
const ISO_UTC_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/

type JsonObject = Record<string, unknown>

/** Serializa a JSON canónico; valida antes, para no escribir un manifiesto que no se podría leer. */
export function serializeArtifactManifest(manifest: ArtifactManifest): string {
  validateArtifactManifest(manifest)
  return JSON.stringify(canonicalize(manifest))
}

/** Lee y valida un manifiesto; rehúsa con la ruta del campo que falla. */
export function parseArtifactManifest(text: string): ArtifactManifest {
  const value = parseJson(text)
  validateArtifactManifest(value)
  return value
}

/** El nombre del contrato `thyrox-…` que corresponde a este artefacto. */
export function artifactModelName(manifest: ArtifactManifest): string {
  return thyroxModelName(manifest)
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch (error) {
    throw new InvalidArtifactManifestError('<raíz>', `no es JSON (${(error as Error).message})`)
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (!isObject(value)) return value
  const sortedKeys = Object.keys(value).sort()
  return Object.fromEntries(sortedKeys.map(key => [key, canonicalize(value[key])]))
}

function validateArtifactManifest(value: unknown): asserts value is ArtifactManifest {
  const root = requireObject(value, '<raíz>')
  requireNonEmptyString(root, 'repository', '')
  requireNonEmptyString(root, 'source', '')
  requireNonEmptyString(root, 'revision', '')
  validateSourceFiles(root)
  validateConverter(requireObject(root.converter, 'converter'))
  validateQuantization(root)
  validateGguf(requireObject(root.gguf, 'gguf'))
  validateValidation(requireObject(root.validation, 'validation'))
  validateCreatedAt(root)
}

function validateSourceFiles(root: JsonObject): void {
  const files = root.sourceFiles
  if (files === undefined) throw new InvalidArtifactManifestError('sourceFiles', 'falta')
  if (!Array.isArray(files) || files.length === 0) {
    throw new InvalidArtifactManifestError('sourceFiles', 'se espera una lista no vacía')
  }
  files.forEach((file: unknown, index) => {
    const prefix = `sourceFiles[${index}]`
    const entry = requireObject(file, prefix)
    requireNonEmptyString(entry, 'path', prefix)
    requireMatching(entry, 'sha256', prefix, SHA256_HEX_PATTERN)
  })
}

function validateConverter(converter: JsonObject): void {
  requireNonEmptyString(converter, 'name', 'converter')
  requireNonEmptyString(converter, 'image', 'converter')
  requireMatching(converter, 'imageDigest', 'converter', IMAGE_DIGEST_PATTERN)
}

function validateQuantization(root: JsonObject): void {
  const level = requireNonEmptyString(root, 'quantization', '')
  try {
    normalizeQuantizationLevel(level)
  } catch (error) {
    if (error instanceof UnknownQuantizationLevelError) throw new InvalidArtifactManifestError('quantization', error.message)
    throw error
  }
}

function validateGguf(gguf: JsonObject): void {
  requireMatching(gguf, 'sha256', 'gguf', SHA256_HEX_PATTERN)
  const bytes = requirePresent(gguf, 'bytes', 'gguf')
  if (!isPositiveInteger(bytes)) throw new InvalidArtifactManifestError('gguf.bytes', `se espera un entero positivo, llegó ${String(bytes)}`)
}

function validateValidation(validation: JsonObject): void {
  requireFiniteNumber(validation, 'perplexity', 'validation')
  requireFiniteNumber(validation, 'tokensPerSecond', 'validation')
  const loaded = requirePresent(validation, 'loaded', 'validation')
  if (typeof loaded !== 'boolean') throw new InvalidArtifactManifestError('validation.loaded', 'se espera un booleano')
}

function validateCreatedAt(root: JsonObject): void {
  const createdAt = requireNonEmptyString(root, 'createdAt', '')
  if (!ISO_UTC_INSTANT_PATTERN.test(createdAt) || Number.isNaN(Date.parse(createdAt))) {
    throw new InvalidArtifactManifestError('createdAt', `«${createdAt}» no es un instante ISO 8601 en UTC`)
  }
}

function fieldPath(prefix: string, key: string): string {
  return prefix === '' ? key : `${prefix}.${key}`
}

function requirePresent(object: JsonObject, key: string, prefix: string): unknown {
  if (!Object.hasOwn(object, key)) throw new InvalidArtifactManifestError(fieldPath(prefix, key), 'falta')
  return object[key]
}

function requireNonEmptyString(object: JsonObject, key: string, prefix: string): string {
  const value = requirePresent(object, key, prefix)
  if (typeof value !== 'string' || value === '') {
    throw new InvalidArtifactManifestError(fieldPath(prefix, key), 'se espera una cadena no vacía')
  }
  return value
}

function requireMatching(object: JsonObject, key: string, prefix: string, pattern: RegExp): void {
  const value = requireNonEmptyString(object, key, prefix)
  if (!pattern.test(value)) throw new InvalidArtifactManifestError(fieldPath(prefix, key), `«${value}» no cumple ${pattern.source}`)
}

function requireFiniteNumber(object: JsonObject, key: string, prefix: string): void {
  const value = requirePresent(object, key, prefix)
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new InvalidArtifactManifestError(fieldPath(prefix, key), 'se espera un número finito')
  }
}

function requireObject(value: unknown, field: string): JsonObject {
  if (value === undefined) throw new InvalidArtifactManifestError(field, 'falta')
  if (!isObject(value)) throw new InvalidArtifactManifestError(field, 'se espera un objeto')
  return value
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPositiveInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}
