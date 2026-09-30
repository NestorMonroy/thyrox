/**
 * Catálogo de niveles de cuantización y del backend que puede producir cada
 * uno. Es la única fuente de verdad: el contrato de nombre y el despachador lo
 * leen, no lo copian.
 *
 * Medido (TASK-THYROX-0694, banco model-quantization-pipeline-20260930T224613):
 * - `llama-quantize --help` de `ghcr.io/ggml-org/llama.cpp:full` lista los
 *   tipos de `LLAMA_QUANTIZE_LEVELS`; `Q3_K`, `Q4_K` y `Q5_K` son alias de su
 *   variante `_M`.
 * - `ollama create --quantize` (0.35.0) sólo acepta `int4`, `int8`, `nvfp4`,
 *   `mxfp4` y `mxfp8`, y sólo desde safetensors; rechaza `q8_0` y `q4_K_M`.
 * - `f16` y `bf16` son la salida de `convert_hf_to_gguf.py`, no una
 *   cuantización.
 *
 * Los niveles canónicos van en minúsculas y sin guion: el guion separa partes
 * del nombre `thyrox-…`.
 */

export type QuantizationBackend = 'llama-quantize' | 'ollama-create' | 'convert'

const LLAMA_QUANTIZE_LEVELS = [
  'q1_0', 'q2_0', 'q4_0', 'q4_1', 'mxfp4_moe', 'q5_0', 'q5_1',
  'iq2_xxs', 'iq2_xs', 'iq2_s', 'iq2_m', 'iq1_s', 'iq1_m', 'tq1_0', 'tq2_0',
  'q2_k', 'q2_k_s', 'iq3_xxs', 'iq3_s', 'iq3_m', 'iq3_xs',
  'q3_k_s', 'q3_k_m', 'q3_k_l', 'iq4_nl', 'iq4_xs',
  'q4_k_s', 'q4_k_m', 'q5_k_s', 'q5_k_m', 'q6_k', 'q8_0',
] as const

const OLLAMA_CREATE_LEVELS = ['int4', 'int8', 'nvfp4', 'mxfp4', 'mxfp8'] as const

const CONVERT_LEVELS = ['f16', 'bf16'] as const

export type QuantizationLevel =
  | typeof LLAMA_QUANTIZE_LEVELS[number]
  | typeof OLLAMA_CREATE_LEVELS[number]
  | typeof CONVERT_LEVELS[number]

/** Alias que `llama-quantize` acepta para un nivel que ya tiene nombre propio. */
const LEVEL_ALIASES: Readonly<Record<string, QuantizationLevel>> = {
  q3_k: 'q3_k_m',
  q4_k: 'q4_k_m',
  q5_k: 'q5_k_m',
}

function backendTable(): Readonly<Record<QuantizationLevel, QuantizationBackend>> {
  const table: Partial<Record<QuantizationLevel, QuantizationBackend>> = {}
  for (const level of LLAMA_QUANTIZE_LEVELS) table[level] = 'llama-quantize'
  for (const level of OLLAMA_CREATE_LEVELS) table[level] = 'ollama-create'
  for (const level of CONVERT_LEVELS) table[level] = 'convert'
  return table as Record<QuantizationLevel, QuantizationBackend>
}

export const QUANTIZATION_LEVELS: Readonly<Record<QuantizationLevel, QuantizationBackend>> = backendTable()

export class UnknownQuantizationLevelError extends Error {
  constructor(readonly level: string) {
    super(`nivel de cuantización desconocido: «${level}»`)
    this.name = 'UnknownQuantizationLevelError'
  }
}

function isQuantizationLevel(candidate: string): candidate is QuantizationLevel {
  return Object.hasOwn(QUANTIZATION_LEVELS, candidate)
}

/** Devuelve el nivel canónico (minúsculas, alias resuelto) o rehúsa nombrándolo. */
export function normalizeQuantizationLevel(level: string): QuantizationLevel {
  const lowered = level.toLowerCase()
  const canonical = LEVEL_ALIASES[lowered] ?? lowered
  if (!isQuantizationLevel(canonical)) throw new UnknownQuantizationLevelError(level)
  return canonical
}

/** El backend que produce el nivel; lo desconocido se rehúsa, no toma un default. */
export function quantizationBackend(level: string): QuantizationBackend {
  return QUANTIZATION_LEVELS[normalizeQuantizationLevel(level)]
}
