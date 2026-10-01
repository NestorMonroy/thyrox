/**
 * La ejecución idempotente de una cuantización (TASK-THYROX-0718, 0722).
 *
 * El estado de la ejecución —petición, fuente fijada, imagen del laboratorio,
 * registros de cada paso y observaciones— se escribe en `<run>/run.json`
 * ANTES de mover nada, y se reescribe de forma atómica tras cada paso. Una
 * reejecución sobre el mismo directorio salta los pasos cuyo registro sigue
 * siendo cierto en disco y retoma el primero que no lo es. Una petición
 * distinta sobre un directorio ya usado se rehúsa: el estado no se mezcla.
 *
 * Antes de descargar nada, se comprueba la capacidad del scratch contra el
 * pico estimado y el mínimo declarado (0722) y se reservan disco y memoria por
 * la admisión común; si algo no cabe, la ejecución rehúsa con las cifras
 * observadas y no publica métricas de pasos que no corrieron.
 */
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  QUANTIZATION_STEPS,
  evaluateScratchCapacity,
  isStepComplete,
  requiredScratchBytes,
  sourceBytes,
  validateSourceSpec,
  type QuantizationMethod,
  type QuantizationStep,
  type SourceSpec,
  type StepRecord,
} from '@thyrox/model-artifacts/quantizationPlan.ts'

import { fetchSourceSpec, type Fetcher } from './huggingFaceSource.js'
import type { LabStep, LabStepResult } from './quantizationLab.js'
import { QuantizationStepError, STEP_ACTIONS, type RunObservations } from './quantizationSteps.js'
import type { ResourceAdmission } from './resourceAdmission.js'
import { sha256OfFile } from './sha256File.js'

const RUN_STATE_FILE = 'run.json'
const REFUSAL_FILE = 'refusal.json'
const DISK_SAMPLE_INTERVAL_MS = 1_000

export interface QuantizationRequest {
  readonly repository: string
  readonly revision: string
  readonly level: 'Q4_K_M'
  readonly method: QuantizationMethod
  readonly scratchDir: string
  readonly runDir: string
  /** El mínimo libre que la tarea exige al scratch aunque el pico estimado sea menor. */
  readonly minimumFreeBytes: number
  readonly memoryLimitBytes: number
}

export interface LabImage {
  readonly reference: string
  readonly id: string
  readonly digest: string
}

export interface StepMetrics {
  durationMs: number
  peakMemoryBytes?: number
}

export interface RunState {
  readonly request: Omit<QuantizationRequest, 'scratchDir' | 'runDir'>
  readonly source: SourceSpec
  readonly image: LabImage
  records: StepRecord[]
  observations: RunObservations
  metrics: { minimumFreeBytes?: number; steps: Partial<Record<QuantizationStep, StepMetrics>> }
}

export interface QuantizationRunDeps {
  readonly fetcher: Fetcher
  readonly runInLab: (step: LabStep) => Promise<LabStepResult>
  readonly labImage: LabImage
  readonly admission: ResourceAdmission
  /** Lo libre en el sistema de archivos de `path`, según `statfs`. */
  readonly freeBytes: (path: string) => Promise<number>
  /** Escribe la procedencia y la entrada del catálogo; devuelve el artefacto que deja (el manifiesto). */
  readonly register: (state: RunState, request: QuantizationRequest) => Promise<StepRecord['artifact']>
  readonly now: () => Date
}

export type QuantizationOutcome =
  | { readonly kind: 'completed'; readonly state: RunState }
  | { readonly kind: 'refused'; readonly reason: string }
  | { readonly kind: 'failed'; readonly step: QuantizationStep; readonly reason: string }

export class RunStateConflictError extends Error {
  constructor(runDir: string) {
    super(`${runDir} ya guarda otra ejecución (otra fuente, nivel o método); usa otro --run-dir`)
    this.name = 'RunStateConflictError'
  }
}

/** Nombre estable de la ejecución: su lease y su contenedor. */
export function runIdOf(request: Pick<QuantizationRequest, 'repository' | 'revision' | 'method'>): string {
  const repository = request.repository.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `${repository}-${request.revision.slice(0, 12)}-${request.method.replace(/_/g, '-')}`
}

export async function runQuantization(request: QuantizationRequest, deps: QuantizationRunDeps): Promise<QuantizationOutcome> {
  await mkdir(request.runDir, { recursive: true })
  await mkdir(request.scratchDir, { recursive: true })
  const state = await loadOrPlan(request, deps)
  const refusal = await preflight(state, request, deps)
  if (refusal !== undefined) return refuse(request, refusal, deps)
  const sampler = new DiskSampler(request.scratchDir, deps.freeBytes)
  try {
    await saveState(request.runDir, state)
    return await runPendingSteps(state, request, deps, sampler)
  } finally {
    sampler.stop()
    state.metrics.minimumFreeBytes = sampler.minimumWith(state.metrics.minimumFreeBytes)
    await saveState(request.runDir, state)
    await deps.admission.releaseAll()
  }
}

async function loadOrPlan(request: QuantizationRequest, deps: QuantizationRunDeps): Promise<RunState> {
  const existing = await readState(request.runDir)
  if (existing !== undefined) return requireSameRequest(existing, request)
  const source = await fetchSourceSpec(deps.fetcher, request.repository, request.revision)
  validateSourceSpec(source)
  return {
    request: { repository: request.repository, revision: request.revision, level: request.level, method: request.method,
      minimumFreeBytes: request.minimumFreeBytes, memoryLimitBytes: request.memoryLimitBytes },
    source,
    image: deps.labImage,
    records: [],
    observations: { sourceSha256: {}, downloadedBytes: 0 },
    metrics: { steps: {} },
  }
}

function requireSameRequest(state: RunState, request: QuantizationRequest): RunState {
  const sameRun = state.request.repository === request.repository && state.request.revision === request.revision
    && state.request.method === request.method && state.request.level === request.level
  if (!sameRun) throw new RunStateConflictError(request.runDir)
  return state
}

/** El motivo para no empezar, o `undefined` si cabe y quedó reservado. */
async function preflight(state: RunState, request: QuantizationRequest, deps: QuantizationRunDeps): Promise<string | undefined> {
  const requiredBytes = await remainingScratchBytes(state, request)
  const capacity = evaluateScratchCapacity({ freeBytes: await deps.freeBytes(request.scratchDir), requiredBytes, minimumFreeBytes: request.minimumFreeBytes })
  if (!capacity.admitted) return capacity.reason
  const disk = await deps.admission.admitDisk(requiredBytes, request.scratchDir)
  if (!disk.admitted) return `admisión de disco: ${disk.detail}`
  const memory = await deps.admission.admitMemory(request.memoryLimitBytes, runIdOf(request))
  if (!memory.admitted) return `admisión de memoria: ${memory.detail}`
  return undefined
}

/** El pico que queda por escribir: lo que ya está en disco de esta ejecución no se vuelve a pedir. */
async function remainingScratchBytes(state: RunState, request: QuantizationRequest): Promise<number> {
  const peak = requiredScratchBytes(sourceBytes(state.source), state.request.method)
  const present = await Promise.all(state.records.map(record => presentBytes(record)))
  return Math.max(0, peak - present.reduce((sum, bytes) => sum + bytes, 0))
}

async function presentBytes(record: StepRecord): Promise<number> {
  if (record.artifact === undefined) return 0
  return stat(record.artifact.path).then(info => info.size, () => 0)
}

async function refuse(request: QuantizationRequest, reason: string, deps: QuantizationRunDeps): Promise<QuantizationOutcome> {
  await deps.admission.releaseAll()
  await writeAtomically(join(request.runDir, REFUSAL_FILE), `${JSON.stringify({ refusedAt: deps.now().toISOString(), reason }, null, 2)}\n`)
  return { kind: 'refused', reason }
}

async function runPendingSteps(state: RunState, request: QuantizationRequest, deps: QuantizationRunDeps, sampler: DiskSampler): Promise<QuantizationOutcome> {
  for (const step of QUANTIZATION_STEPS) {
    if (await isStepComplete(step, state.records, isArtifactIntact)) continue
    const failure = await runStep(step, state, request, deps, sampler)
    await saveState(request.runDir, state)
    if (failure !== undefined) return { kind: 'failed', step, reason: failure }
  }
  return { kind: 'completed', state }
}

async function runStep(step: QuantizationStep, state: RunState, request: QuantizationRequest, deps: QuantizationRunDeps, sampler: DiskSampler): Promise<string | undefined> {
  const started = deps.now().getTime()
  const peaks: number[] = []
  try {
    const artifact = await STEP_ACTIONS[step]({
      source: state.source,
      method: state.request.method,
      scratchDir: request.scratchDir,
      runDir: request.runDir,
      containerName: runIdOf(request),
      fetcher: deps.fetcher,
      observations: state.observations,
      runInLab: async labStep => keepPeak(await deps.runInLab(labStep), peaks),
      register: () => deps.register(state, request),
    })
    state.records = [...state.records.filter(record => record.step !== step), recordOf(step, artifact, deps)]
    return undefined
  } catch (error) {
    if (error instanceof QuantizationStepError) return error.message
    return `${step}: ${(error as Error).message}`
  } finally {
    await sampler.sample()
    state.metrics.steps[step] = { durationMs: deps.now().getTime() - started, ...peakOf(peaks) }
  }
}

function keepPeak(result: LabStepResult, peaks: number[]): LabStepResult {
  if (result.peakMemoryBytes !== undefined) peaks.push(result.peakMemoryBytes)
  return result
}

function peakOf(peaks: readonly number[]): { peakMemoryBytes?: number } {
  return peaks.length === 0 ? {} : { peakMemoryBytes: Math.max(...peaks) }
}

function recordOf(step: QuantizationStep, artifact: StepRecord['artifact'], deps: QuantizationRunDeps): StepRecord {
  const completedAt = deps.now().toISOString()
  return artifact === undefined ? { step, completedAt } : { step, completedAt, artifact }
}

async function isArtifactIntact(artifact: NonNullable<StepRecord['artifact']>): Promise<boolean> {
  const size = await stat(artifact.path).then(info => info.size, () => undefined)
  if (size !== artifact.bytes) return false
  return (await sha256OfFile(artifact.path)) === artifact.sha256
}

async function readState(runDir: string): Promise<RunState | undefined> {
  const text = await readFile(join(runDir, RUN_STATE_FILE), 'utf8').catch(() => undefined)
  return text === undefined ? undefined : JSON.parse(text) as RunState
}

async function saveState(runDir: string, state: RunState): Promise<void> {
  await writeAtomically(join(runDir, RUN_STATE_FILE), `${JSON.stringify(state, null, 2)}\n`)
}

async function writeAtomically(path: string, text: string): Promise<void> {
  const partial = `${path}.partial`
  await writeFile(partial, text)
  await rename(partial, path)
}

/** El mínimo de espacio libre del scratch, muestreado cada segundo y al cerrar cada paso. */
class DiskSampler {
  private minimum: number | undefined
  private readonly timer: ReturnType<typeof setInterval>

  constructor(private readonly path: string, private readonly freeBytes: (path: string) => Promise<number>) {
    this.timer = setInterval(() => { void this.sample() }, DISK_SAMPLE_INTERVAL_MS)
  }

  async sample(): Promise<void> {
    const free = await this.freeBytes(this.path)
    if (this.minimum === undefined || free < this.minimum) this.minimum = free
  }

  stop(): void {
    clearInterval(this.timer)
  }

  minimumWith(previous: number | undefined): number | undefined {
    if (previous === undefined) return this.minimum
    if (this.minimum === undefined) return previous
    return Math.min(previous, this.minimum)
  }
}
