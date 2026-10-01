/**
 * Qué hace cada paso de la cuantización (TASK-THYROX-0718). Cada paso
 * recibe el contexto de la ejecución y devuelve el artefacto que dejó, si
 * dejó uno; el orquestador decide si hay que correrlo y registra lo que
 * devuelve. Un paso que falla lanza `QuantizationStepError` con el detalle de
 * la herramienta, y el plan queda para reanudar desde él.
 */
import { readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  estimatedBytesAt,
  Q4_K_M_BITS_PER_WEIGHT,
  type QuantizationMethod,
  type QuantizationStep,
  type SourceSpec,
  type StepRecord,
} from '@thyrox/model-artifacts/quantizationPlan.ts'

import {
  EVAL_CORPUS_FILES,
  GGUF_FILE_TYPE,
  GgufValidationError,
  evalCorpusPath,
  labPathOf,
  lastLines,
  readGgufFacts,
  validateGgufArtifact,
  type ArtifactValidationFacts,
} from './ggufValidation.js'
import { downloadSource, type Fetcher } from './huggingFaceSource.js'
import type { LabStep, LabStepResult } from './quantizationLab.js'
import { sha256OfFile } from './sha256File.js'

/** El intermedio de cada método: su `--outtype` y su `general.file_type`. */
const INTERMEDIATE_OF: Readonly<Record<QuantizationMethod, { outtype: string; fileType: number; label: string }>> = {
  direct: { outtype: 'f16', fileType: GGUF_FILE_TYPE.F16, label: 'F16' },
  requantized_q8_to_q4: { outtype: 'q8_0', fileType: GGUF_FILE_TYPE.Q8_0, label: 'Q8_0' },
}

/** El Q4 medido tiene que caer en este rango alrededor de su estimación por bits por peso. */
const QUANTIZED_SIZE_TOLERANCE = { minimumRatio: 0.5, maximumRatio: 1.5 } as const

export class QuantizationStepError extends Error {
  constructor(readonly step: QuantizationStep, reason: string) {
    super(`${step}: ${reason}`)
    this.name = 'QuantizationStepError'
  }
}

/** Lo que los pasos observan y otros pasos necesitan; se persiste con el plan. */
export interface RunObservations {
  architecture?: string
  intermediateBytes?: number
  quantizedBytes?: number
  quantizedSha256?: string
  validation?: ArtifactValidationFacts
  sourceSha256: Record<string, string>
  downloadedBytes: number
}

export interface StepContext {
  readonly source: SourceSpec
  readonly method: QuantizationMethod
  readonly scratchDir: string
  readonly runDir: string
  readonly workerId: string
  readonly fetcher: Fetcher
  readonly runInLab: (step: LabStep) => Promise<LabStepResult>
  readonly observations: RunObservations
  readonly register: () => Promise<StepRecord['artifact']>
}

export type StepAction = (context: StepContext) => Promise<StepRecord['artifact']>

export function sourceDir(scratchDir: string): string {
  return join(scratchDir, 'source')
}

export function intermediatePath(scratchDir: string, method: QuantizationMethod): string {
  return join(scratchDir, `model-${INTERMEDIATE_OF[method].label}.gguf`)
}

export function quantizedPath(scratchDir: string): string {
  return join(scratchDir, 'model-Q4_K_M.gguf')
}

async function artifactOf(path: string): Promise<NonNullable<StepRecord['artifact']>> {
  return { path, sha256: await sha256OfFile(path), bytes: (await stat(path)).size }
}

async function runToolOrFail(context: StepContext, step: QuantizationStep, command: readonly string[]): Promise<LabStepResult> {
  const result = await context.runInLab({ workerId: context.workerId, command })
  if (result.exitCode !== 0) throw new QuantizationStepError(step, `exit ${result.exitCode}: ${lastLines(result.stderr)}`)
  return result
}

const download: StepAction = async context => {
  const directory = sourceDir(context.scratchDir)
  context.observations.downloadedBytes += await downloadSource(context.fetcher, context.source, directory)
  await recordSourceSha256(context, directory)
  await writeEvalCorpus(directory, context.scratchDir)
  return artifactOf(join(directory, largestFile(context.source)))
}

async function recordSourceSha256(context: StepContext, directory: string): Promise<void> {
  for (const file of context.source.files) {
    const declared = file.digest.startsWith('sha256:') ? file.digest.slice('sha256:'.length) : undefined
    context.observations.sourceSha256[file.path] = declared ?? await sha256OfFile(join(directory, file.path))
  }
}

async function writeEvalCorpus(directory: string, scratchDir: string): Promise<void> {
  const parts = await Promise.all(EVAL_CORPUS_FILES.map(name => readFile(join(directory, name), 'utf8')))
  await writeFile(evalCorpusPath(scratchDir), parts.join('\n'))
}

function largestFile(source: SourceSpec): string {
  return [...source.files].sort((left, right) => right.sizeBytes - left.sizeBytes)[0]!.path
}

const convert: StepAction = async context => {
  const output = intermediatePath(context.scratchDir, context.method)
  await runToolOrFail(context, 'convert', ['python', '/app/convert_hf_to_gguf.py', labPathOf(sourceDir(context.scratchDir), context.scratchDir),
    '--outtype', INTERMEDIATE_OF[context.method].outtype, '--outfile', labPathOf(output, context.scratchDir)])
  return artifactOf(output)
}

const verifyIntermediate: StepAction = async context => {
  const path = intermediatePath(context.scratchDir, context.method)
  context.observations.architecture = await withStep('verify-intermediate', () => readGgufFacts(path, INTERMEDIATE_OF[context.method].fileType))
  context.observations.intermediateBytes = (await stat(path)).size
  return undefined
}

/** Traduce el fallo de validación de un GGUF al paso que lo pidió. */
async function withStep<T>(step: QuantizationStep, action: () => Promise<T>): Promise<T> {
  try {
    return await action()
  } catch (error) {
    if (error instanceof GgufValidationError) throw new QuantizationStepError(step, error.message)
    throw error
  }
}

const releaseSource: StepAction = async context => {
  await rm(sourceDir(context.scratchDir), { recursive: true, force: true })
  return undefined
}

const quantize: StepAction = async context => {
  const output = quantizedPath(context.scratchDir)
  const requantize = context.method === 'requantized_q8_to_q4' ? ['--allow-requantize'] : []
  await runToolOrFail(context, 'quantize', ['llama-quantize', ...requantize,
    labPathOf(intermediatePath(context.scratchDir, context.method), context.scratchDir), labPathOf(output, context.scratchDir), 'Q4_K_M'])
  return artifactOf(output)
}

const validate: StepAction = async context => {
  const path = quantizedPath(context.scratchDir)
  const checked = await withStep('validate', () => validateGgufArtifact({
    path, scratchDir: context.scratchDir, corpusPath: evalCorpusPath(context.scratchDir), workerId: context.workerId,
    expectedFileType: GGUF_FILE_TYPE.Q4_K_M, runInLab: context.runInLab,
  }))
  requireSameArchitecture(context, checked.architecture)
  requireExpectedSize(context, checked.bytes)
  context.observations.validation = checked.validation
  context.observations.quantizedBytes = checked.bytes
  context.observations.quantizedSha256 = checked.sha256
  return undefined
}

function requireSameArchitecture(context: StepContext, architecture: string): void {
  if (architecture !== context.observations.architecture) {
    throw new QuantizationStepError('validate', `arquitectura ${architecture}, el intermedio declaraba ${context.observations.architecture}`)
  }
}

function requireExpectedSize(context: StepContext, bytes: number): void {
  const total = context.source.files.reduce((sum, file) => sum + file.sizeBytes, 0)
  const expected = estimatedBytesAt(total, Q4_K_M_BITS_PER_WEIGHT)
  const ratio = bytes / expected
  if (ratio < QUANTIZED_SIZE_TOLERANCE.minimumRatio || ratio > QUANTIZED_SIZE_TOLERANCE.maximumRatio) {
    throw new QuantizationStepError('validate', `${bytes} bytes, fuera del rango esperado alrededor de ${expected}`)
  }
}

const releaseIntermediate: StepAction = async context => {
  await rm(intermediatePath(context.scratchDir, context.method), { force: true })
  return undefined
}

const register: StepAction = context => context.register()

export const STEP_ACTIONS: Readonly<Record<QuantizationStep, StepAction>> = {
  download,
  convert,
  'verify-intermediate': verifyIntermediate,
  'release-source': releaseSource,
  quantize,
  validate,
  'release-intermediate': releaseIntermediate,
  register,
}

