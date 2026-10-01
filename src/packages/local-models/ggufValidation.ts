/**
 * La validación de un artefacto GGUF dentro del laboratorio, común a lo que
 * cuantiza thyrox (TASK-THYROX-0718) y a lo que se adquiere publicado
 * (TASK-THYROX-0720): abre el archivo, comprueba su tipo y su arquitectura,
 * genera texto con `llama-simple`, mide la perplejidad sobre un corpus fijo y
 * calcula su sha256. El artefacto se prueba aquí; nunca registrándolo en un
 * runtime de inferencia y llamándolo por nombre.
 */
import { stat } from 'node:fs/promises'
import { join } from 'node:path'

import { readGgufMetadata, type GgufHeader } from '@thyrox/model-artifacts/ggufMetadata.ts'

import { LAB_SCRATCH_MOUNT, type LabStep, type LabStepResult } from './quantizationLab.js'
import { sha256OfFile } from './sha256File.js'

const GGUF_ARCHITECTURE_KEY = 'general.architecture'
const GGUF_FILE_TYPE_KEY = 'general.file_type'

/** `llama_ftype` de llama.cpp: el tipo que declara un GGUF en `general.file_type`. */
export const GGUF_FILE_TYPE = { F16: 1, Q8_0: 7, Q4_K_M: 15 } as const

/** Corpus de perplejidad del banco: README y LICENSE de la fuente, contexto 128, 4 hilos. */
export const EVAL_CORPUS_FILES = ['README.md', 'LICENSE'] as const
const PERPLEXITY_CONTEXT = '128'
const PERPLEXITY_THREADS = '4'
const INFERENCE_PROMPT = 'def fibonacci(n):'
const INFERENCE_TOKENS = '16'

const PERPLEXITY_PATTERN = /Final estimate: PPL = ([0-9.]+)/
const TOKENS_PER_SECOND_PATTERN = /speed:\s*([0-9.]+)\s*t\/s/

export class GgufValidationError extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'GgufValidationError'
  }
}

export interface ArtifactValidationFacts {
  readonly perplexity: number
  readonly tokensPerSecond: number
  readonly loaded: boolean
}

export interface GgufValidationInput {
  readonly path: string
  readonly scratchDir: string
  readonly corpusPath: string
  readonly workerId: string
  readonly expectedFileType: number
  readonly runInLab: (step: LabStep) => Promise<LabStepResult>
}

export interface GgufValidation {
  readonly architecture: string
  readonly bytes: number
  readonly sha256: string
  readonly validation: ArtifactValidationFacts
}

export function evalCorpusPath(scratchDir: string): string {
  return join(scratchDir, 'eval.txt')
}

/** La ruta que ve el contenedor para un archivo del scratch del anfitrión. */
export function labPathOf(hostPath: string, scratchDir: string): string {
  return `${LAB_SCRATCH_MOUNT}${hostPath.slice(scratchDir.length)}`
}

export async function readGgufFacts(path: string, expectedFileType: number): Promise<string> {
  const header = await readGgufMetadata(path)
  requireFileType(header, expectedFileType)
  return requireArchitecture(header)
}

export async function validateGgufArtifact(input: GgufValidationInput): Promise<GgufValidation> {
  const architecture = await readGgufFacts(input.path, input.expectedFileType)
  const model = labPathOf(input.path, input.scratchDir)
  const inference = await runOrFail(input, ['llama-simple', '-m', model, '-n', INFERENCE_TOKENS, INFERENCE_PROMPT])
  if (inference.stdout.trim().length === 0) throw new GgufValidationError('llama-simple no generó texto')
  const perplexity = await runOrFail(input, ['llama-perplexity', '-m', model,
    '-f', labPathOf(input.corpusPath, input.scratchDir), '-c', PERPLEXITY_CONTEXT, '-t', PERPLEXITY_THREADS])
  return {
    architecture,
    bytes: (await stat(input.path)).size,
    sha256: await sha256OfFile(input.path),
    validation: {
      loaded: true,
      tokensPerSecond: parseNumber(TOKENS_PER_SECOND_PATTERN, combined(inference), 'velocidad de llama-simple'),
      perplexity: parseNumber(PERPLEXITY_PATTERN, combined(perplexity), 'perplejidad final'),
    },
  }
}

function requireFileType(header: GgufHeader, expected: number): void {
  const actual = Number(header.metadata[GGUF_FILE_TYPE_KEY])
  if (actual !== expected) throw new GgufValidationError(`general.file_type ${actual}, se esperaba ${expected}`)
  if (header.tensorCount === 0) throw new GgufValidationError('el GGUF no tiene tensores')
}

function requireArchitecture(header: GgufHeader): string {
  const architecture = header.metadata[GGUF_ARCHITECTURE_KEY]
  if (typeof architecture !== 'string' || architecture === '') throw new GgufValidationError('el GGUF no declara general.architecture')
  return architecture
}

async function runOrFail(input: GgufValidationInput, command: readonly string[]): Promise<LabStepResult> {
  const result = await input.runInLab({ workerId: input.workerId, command })
  if (result.exitCode !== 0) throw new GgufValidationError(`${command[0]} exit ${result.exitCode}: ${lastLines(result.stderr)}`)
  return result
}

export function lastLines(text: string): string {
  return text.trim().split('\n').slice(-5).join(' | ')
}

function combined(result: LabStepResult): string {
  return `${result.stdout}\n${result.stderr}`
}

function parseNumber(pattern: RegExp, text: string, what: string): number {
  const match = pattern.exec(text)
  if (match === null) throw new GgufValidationError(`no se encontró la ${what} en la salida`)
  return Number(match[1])
}
