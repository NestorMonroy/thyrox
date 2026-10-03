/**
 * Estimación de la memoria que ocupa un GGUF al servirse: peso + caché KV +
 * un margen de buffers. Los parámetros salen de la metadata del propio GGUF
 * (`<arch>.block_count`, `<arch>.attention.head_count_kv`, …, con `<arch>` =
 * `general.architecture`), no de una tabla escrita a mano; una clave ausente
 * se rehúsa con su nombre, porque un cero subestimaría la admisión.
 */

import type { GgufMetadata, GgufValue } from './ggufMetadata.js'

/**
 * Bytes por elemento de la caché KV según su tipo. `q8_0` y `q4_0` son
 * bloques de 32 elementos de 34 y 18 bytes (escala f16 + cuantos).
 */
export const KV_CACHE_BYTES_PER_ELEMENT = {
  f32: 4,
  f16: 2,
  q8_0: 34 / 32,
  q4_0: 18 / 32,
} as const

export type KvCacheType = keyof typeof KV_CACHE_BYTES_PER_ELEMENT

/**
 * Margen de buffers de cómputo y del runtime, por encima de peso y caché KV.
 * Medido con Ollama 0.35.0 (`/api/ps`, 2026-09-30) sirviendo
 * `model-Q4_K_M.gguf` de Qwen2.5-0.5B-Instruct con caché f16: lo reservado
 * menos peso y KV fue 196 640 506 bytes a contexto 2048 y 248 555 504 a 8192.
 * 256 MiB cubre las dos medidas; crece con el contexto, así que para modelos o
 * contextos mayores es un piso de una sola medición, no una constante general.
 */
export const SERVING_BUFFER_MARGIN_BYTES = 256 * 1024 * 1024

/** Una clave y otra por cada tensor de la caché: K y V. */
const KV_TENSORS_PER_LAYER = 2

export interface ServingMemoryInput {
  readonly ggufBytes: number
  readonly metadata: GgufMetadata
  readonly contextLength: number
  readonly kvCacheType: KvCacheType
}

export interface ServingMemoryEstimate {
  readonly weightsBytes: number
  readonly kvCacheBytes: number
  readonly bufferBytes: number
  readonly totalBytes: number
}

export class MissingGgufKeyError extends Error {
  constructor(readonly key: string) {
    super(`falta la clave GGUF «${key}» para estimar la memoria`)
    this.name = 'MissingGgufKeyError'
  }
}

export class InvalidMemoryEstimateInputError extends Error {
  constructor(readonly field: string, reason: string) {
    super(`entrada inválida para estimar la memoria en ${field}: ${reason}`)
    this.name = 'InvalidMemoryEstimateInputError'
  }
}

/** Forma de la atención: lo único de la metadata que la caché KV necesita. */
export interface AttentionShape {
  readonly blockCount: number
  readonly kvHeadCount: number
  readonly headDimension: number
}

/** La misma estimación a partir de una forma ya extraída (la del catálogo). */
export interface ShapeServingMemoryInput {
  readonly ggufBytes: number
  readonly attention: AttentionShape
  readonly contextLength: number
  readonly kvCacheType: KvCacheType
}

/** Peso + caché KV + margen de buffers, en bytes. */
export function estimateServingMemory(input: ServingMemoryInput): ServingMemoryEstimate {
  return estimateServingMemoryFromShape({
    ggufBytes: input.ggufBytes,
    attention: attentionShapeOf(input.metadata),
    contextLength: input.contextLength,
    kvCacheType: input.kvCacheType,
  })
}

/** Peso + caché KV + margen de buffers, sin releer la metadata. */
export function estimateServingMemoryFromShape(input: ShapeServingMemoryInput): ServingMemoryEstimate {
  requirePositiveInteger('ggufBytes', input.ggufBytes)
  requirePositiveInteger('contextLength', input.contextLength)
  requireAttentionShape(input.attention)
  const kvCacheBytes = kvCacheSize(input.attention, input.contextLength, kvBytesPerElement(input.kvCacheType))
  return {
    weightsBytes: input.ggufBytes,
    kvCacheBytes,
    bufferBytes: SERVING_BUFFER_MARGIN_BYTES,
    totalBytes: input.ggufBytes + kvCacheBytes + SERVING_BUFFER_MARGIN_BYTES,
  }
}

function kvCacheSize(shape: AttentionShape, contextLength: number, bytesPerElement: number): number {
  const elements = KV_TENSORS_PER_LAYER * shape.blockCount * contextLength * shape.kvHeadCount * shape.headDimension
  return Math.ceil(elements * bytesPerElement)
}

/** Forma de la atención desde la metadata GGUF; una clave ausente se rehúsa con su nombre. */
export function attentionShapeOf(metadata: GgufMetadata): AttentionShape {
  const architecture = architectureOf(metadata)
  const headCountKey = `${architecture}.attention.head_count`
  const headCount = positiveIntegerKey(metadata, headCountKey)
  return {
    blockCount: positiveIntegerKey(metadata, `${architecture}.block_count`),
    kvHeadCount: kvHeadCountOf(metadata, `${architecture}.attention.head_count_kv`, headCount),
    headDimension: headDimensionOf(metadata, architecture, headCount),
  }
}

/**
 * La dimensión de cabeza: la declarada (`attention.key_length`) si el GGUF la
 * trae; si no, la del embedding repartido entre las cabezas. Qwen3-4B declara
 * 128 con un embedding de 2560 y 32 cabezas: derivarla daba 80 y la caché KV
 * salía al 62.5 % de la real (H-THYROX-448).
 */
function headDimensionOf(metadata: GgufMetadata, architecture: string, headCount: number): number {
  const keyLengthKey = `${architecture}.attention.key_length`
  if (metadata[keyLengthKey] !== undefined) return positiveIntegerKey(metadata, keyLengthKey)
  const embeddingKey = `${architecture}.embedding_length`
  const embeddingLength = positiveIntegerKey(metadata, embeddingKey)
  if (embeddingLength % headCount !== 0) {
    throw new InvalidMemoryEstimateInputError(`${architecture}.attention.head_count`, `${embeddingKey}=${embeddingLength} no se reparte entre ${headCount} cabezas`)
  }
  return embeddingLength / headCount
}

/**
 * La especificación GGUF declara `attention.head_count_kv` opcional: ausente,
 * vale `head_count` (atención sin GQA, como nomic-bert). Presente, se valida.
 */
function kvHeadCountOf(metadata: GgufMetadata, key: string, headCount: number): number {
  return Object.hasOwn(metadata, key) ? positiveIntegerKey(metadata, key) : headCount
}

function requireAttentionShape(shape: AttentionShape): void {
  requirePositiveInteger('attention.blockCount', shape.blockCount)
  requirePositiveInteger('attention.kvHeadCount', shape.kvHeadCount)
  requirePositiveInteger('attention.headDimension', shape.headDimension)
}

function architectureOf(metadata: GgufMetadata): string {
  const key = 'general.architecture'
  const value = requireKey(metadata, key)
  if (typeof value !== 'string' || value === '') throw new InvalidMemoryEstimateInputError(key, 'se espera una cadena no vacía')
  return value
}

function positiveIntegerKey(metadata: GgufMetadata, key: string): number {
  const value = requireKey(metadata, key)
  if (typeof value !== 'number') throw new InvalidMemoryEstimateInputError(key, `se espera un entero, llegó ${String(value)}`)
  requirePositiveInteger(key, value)
  return value
}

function requireKey(metadata: GgufMetadata, key: string): GgufValue {
  if (!Object.hasOwn(metadata, key)) throw new MissingGgufKeyError(key)
  return metadata[key] as GgufValue
}

function requirePositiveInteger(field: string, value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new InvalidMemoryEstimateInputError(field, `se espera un entero positivo, llegó ${value}`)
}

function kvBytesPerElement(kvCacheType: string): number {
  if (!Object.hasOwn(KV_CACHE_BYTES_PER_ELEMENT, kvCacheType)) {
    throw new InvalidMemoryEstimateInputError('kvCacheType', `«${kvCacheType}» no es ${Object.keys(KV_CACHE_BYTES_PER_ELEMENT).join(', ')}`)
  }
  return KV_CACHE_BYTES_PER_ELEMENT[kvCacheType as KvCacheType]
}
