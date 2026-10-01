/**
 * Qué hace cada paso de la cuantización (TASK-THYROX-0718). Cada paso
 * recibe el contexto de la ejecución y devuelve el artefacto que dejó, si
 * dejó uno; el orquestador decide si hay que correrlo y registra lo que
 * devuelve. Un paso que falla lanza `QuantizationStepError` con el detalle de
 * la herramienta, y el plan queda para reanudar desde él.
 */
import { readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { readGgufMetadata, type GgufHeader } from '@thyrox/model-artifacts/ggufMetadata.ts'
import {
  estimatedBytesAt,
  Q4_K_M_BITS_PER_WEIGHT,
  type QuantizationMethod,
  type QuantizationStep,
  type SourceSpec,
  type StepRecord,
} from '@thyrox/model-artifacts/quantizationPlan.ts'

import { downloadSource, type Fetcher } from './huggingFaceSource.js'
import { LAB_SCRATCH_MOUNT, type LabStep, type LabStepResult } from './quantizationLab.js'
import { sha256OfFile } from './sha256File.js'

const GGUF_ARCHITECTURE_KEY = 'general.architecture'
const GGUF_FILE_TYPE_KEY = 'general.file_type'

/** `llama_ftype` de llama.cpp: el tipo que declara un GGUF en `general.file_type`. */
export const GGUF_FILE_TYPE = { F16: 1, Q8_0: 7, Q4_K_M: 15 } as const

/** El intermedio de cada método: su `--outtype` y su `general.file_type`. */
const INTERMEDIATE_OF: Readonly<Record<QuantizationMethod, { outtype: string; fileType: number; label: string }>> = {
  direct: { outtype: 'f16', fileType: GGUF_FILE_TYPE.F16, label: 'F16' },
  requantized_q8_to_q4: { outtype: 'q8_0', fileType: GGUF_FILE_TYPE.Q8_0, label: 'Q8_0' },
}

/** Corpus de perplejidad del banco: README y LICENSE de la fuente, contexto 128, 4 hilos. */
const EVAL_CORPUS_FILES = ['README.md', 'LICENSE'] as const
const PERPLEXITY_CONTEXT = '128'
const PERPLEXITY_THREADS = '4'
const INFERENCE_PROMPT = 'def fibonacci(n):'
const INFERENCE_TOKENS = '16'
/** El Q4 medido tiene que caer en este rango alrededor de su estimación por bits por peso. */
const QUANTIZED_SIZE_TOLERANCE = { minimumRatio: 0.5, maximumRatio: 1.5 } as const

const PERPLEXITY_PATTERN = /Final estimate: PPL = ([0-9.]+)/
const TOKENS_PER_SECOND_PATTERN = /speed:\s*([0-9.]+)\s*t\/s/

export class QuantizationStepError extends Error {
  constructor(readonly step: QuantizationStep, reason: string) {
    super(`${step}: ${reason}`)
    this.name = 'QuantizationStepError'
  }
}

export interface ArtifactValidationFacts {
  readonly perplexity: number
  readonly tokensPerSecond: number
  readonly loaded: boolean
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
  readonly containerName: string
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

function inLab(hostPath: string, scratchDir: string): string {
  return `${LAB_SCRATCH_MOUNT}${hostPath.slice(scratchDir.length)}`
}

async function artifactOf(path: string): Promise<NonNullable<StepRecord['artifact']>> {
  return { path, sha256: await sha256OfFile(path), bytes: (await stat(path)).size }
}

async function runToolOrFail(context: StepContext, step: QuantizationStep, command: readonly string[]): Promise<LabStepResult> {
  const result = await context.runInLab({ containerName: context.containerName, command })
  if (result.exitCode !== 0) throw new QuantizationStepError(step, `exit ${result.exitCode}: ${lastLines(result.stderr)}`)
  return result
}

function lastLines(text: string): string {
  return text.trim().split('\n').slice(-5).join(' | ')
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

function evalCorpusPath(scratchDir: string): string {
  return join(scratchDir, 'eval.txt')
}

function largestFile(source: SourceSpec): string {
  return [...source.files].sort((left, right) => right.sizeBytes - left.sizeBytes)[0]!.path
}

const convert: StepAction = async context => {
  const output = intermediatePath(context.scratchDir, context.method)
  await runToolOrFail(context, 'convert', ['python', '/app/convert_hf_to_gguf.py', inLab(sourceDir(context.scratchDir), context.scratchDir),
    '--outtype', INTERMEDIATE_OF[context.method].outtype, '--outfile', inLab(output, context.scratchDir)])
  return artifactOf(output)
}

const verifyIntermediate: StepAction = async context => {
  const path = intermediatePath(context.scratchDir, context.method)
  const header = await readGgufMetadata(path)
  requireFileType('verify-intermediate', header, INTERMEDIATE_OF[context.method].fileType)
  context.observations.architecture = requireArchitecture('verify-intermediate', header)
  context.observations.intermediateBytes = (await stat(path)).size
  return undefined
}

function requireFileType(step: QuantizationStep, header: GgufHeader, expected: number): void {
  const actual = Number(header.metadata[GGUF_FILE_TYPE_KEY])
  if (actual !== expected) throw new QuantizationStepError(step, `general.file_type ${actual}, se esperaba ${expected}`)
  if (header.tensorCount === 0) throw new QuantizationStepError(step, 'el GGUF no tiene tensores')
}

function requireArchitecture(step: QuantizationStep, header: GgufHeader): string {
  const architecture = header.metadata[GGUF_ARCHITECTURE_KEY]
  if (typeof architecture !== 'string' || architecture === '') throw new QuantizationStepError(step, 'el GGUF no declara general.architecture')
  return architecture
}

const releaseSource: StepAction = async context => {
  await rm(sourceDir(context.scratchDir), { recursive: true, force: true })
  return undefined
}

const quantize: StepAction = async context => {
  const output = quantizedPath(context.scratchDir)
  const requantize = context.method === 'requantized_q8_to_q4' ? ['--allow-requantize'] : []
  await runToolOrFail(context, 'quantize', ['llama-quantize', ...requantize,
    inLab(intermediatePath(context.scratchDir, context.method), context.scratchDir), inLab(output, context.scratchDir), 'Q4_K_M'])
  return artifactOf(output)
}

const validate: StepAction = async context => {
  const path = quantizedPath(context.scratchDir)
  const header = await readGgufMetadata(path)
  requireFileType('validate', header, GGUF_FILE_TYPE.Q4_K_M)
  requireSameArchitecture(context, header)
  const bytes = (await stat(path)).size
  requireExpectedSize(context, bytes)
  const inference = await runToolOrFail(context, 'validate', ['llama-simple', '-m', inLab(path, context.scratchDir), '-n', INFERENCE_TOKENS, INFERENCE_PROMPT])
  const perplexity = await runToolOrFail(context, 'validate', ['llama-perplexity', '-m', inLab(path, context.scratchDir),
    '-f', inLab(evalCorpusPath(context.scratchDir), context.scratchDir), '-c', PERPLEXITY_CONTEXT, '-t', PERPLEXITY_THREADS])
  context.observations.validation = {
    loaded: inference.stdout.trim().length > 0,
    tokensPerSecond: parseNumber('validate', TOKENS_PER_SECOND_PATTERN, `${inference.stdout}\n${inference.stderr}`, 'velocidad de llama-simple'),
    perplexity: parseNumber('validate', PERPLEXITY_PATTERN, `${perplexity.stdout}\n${perplexity.stderr}`, 'perplejidad final'),
  }
  if (!context.observations.validation.loaded) throw new QuantizationStepError('validate', 'llama-simple no generó texto')
  context.observations.quantizedBytes = bytes
  context.observations.quantizedSha256 = await sha256OfFile(path)
  return undefined
}

function requireSameArchitecture(context: StepContext, header: GgufHeader): void {
  const architecture = requireArchitecture('validate', header)
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

function parseNumber(step: QuantizationStep, pattern: RegExp, text: string, what: string): number {
  const match = pattern.exec(text)
  if (match === null) throw new QuantizationStepError(step, `no se encontró la ${what} en la salida`)
  return Number(match[1])
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

