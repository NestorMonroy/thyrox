/**
 * `local-models-quantize run --repository R --revision SHA --scratch-dir DIR
 *  --run-dir DIR [--method direct|requantized_q8_to_q4] [--minimum-free-bytes N]
 *  [--memory-limit-bytes N] [--cpus N]`
 *
 * Cuantiza una fuente de Hugging Face a Q4_K_M en el laboratorio
 * (TASK-THYROX-0718), con exclusión por Redis (0723) y el scratch que aporta
 * quien invoca (0722). Salidas: 0 hecho · 1 falló un paso (el estado queda
 * para reanudar) · 2 rehusado sin empezar · 4 otra ejecución tiene el lease.
 */
import { statfs, writeFile } from 'node:fs/promises'
import { hostname } from 'node:os'
import { join, resolve } from 'node:path'

import { serializeArtifactManifest, type ArtifactManifest } from '@thyrox/model-artifacts/artifactManifest.ts'
import { localModelHome } from '@thyrox/model-artifacts/localModelHome.ts'
import { catalogEntryFromGguf, loadModelCatalog, saveModelCatalog } from '@thyrox/model-artifacts/modelCatalog.ts'
import { QUANTIZATION_METHODS, type QuantizationMethod, type StepRecord } from '@thyrox/model-artifacts/quantizationPlan.ts'
import { createPodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import { openSharedStateStore } from '@thyrox/shared-state/factory.ts'

import { infrastructureEnsureOf, type CommandContext } from './catalogCommand.js'
import { infrastructureReady, REDIS_CONTAINER } from './infrastructureReadiness.js'
import { EXIT_NOT_APPROVED, EXIT_OK, EXIT_REFUSED } from './commandOutput.js'
import { QuantizationLab, containerMeasureProbe, resolveLabImage } from './quantizationLab.js'
import { runIdOf, runQuantization, type QuantizationRequest, type RunState } from './quantizationRun.js'
import { quantizedPath } from './quantizationSteps.js'
import { DEFAULT_LAB_IMAGE, EXIT_LEASE_BUSY, LAB_IMAGE_ENV, optionsOf } from './labCommandOptions.js'
import { unitResourceAdmission } from './resourceAdmission.js'
import { RunLeaseBusyError, RunLeaseUnavailableError, acquireRunLease, globalLeaseStore } from './runLease.js'
import { sha256OfFile } from './sha256File.js'

export const QUANTIZE_USAGE = 'uso: local-models-quantize run --repository R --revision SHA --scratch-dir DIR --run-dir DIR '
  + '[--method direct|requantized_q8_to_q4] [--minimum-free-bytes N] [--memory-limit-bytes N] [--cpus N]'

const DEFAULT_MEMORY_LIMIT_BYTES = 8 * 1024 ** 3
const DEFAULT_CPUS = 4
const CONVERTER_NAME = 'convert_hf_to_gguf.py'
/** Lo que el registro declara: el artefacto valida el pipeline, no cualifica el modelo para una clase de tarea. */
const QUALIFICATION_NOTE = 'valida el pipeline de cuantización; no cualifica el modelo para cargas de ~73K tokens'

interface QuantizeArguments {
  readonly request: QuantizationRequest
  readonly cpus: number
}

export async function runQuantizeCommand(argv: readonly string[], context: CommandContext): Promise<number> {
  const parsed = parseArguments(argv)
  if (parsed === undefined) {
    context.output.stderr(QUANTIZE_USAGE)
    return EXIT_REFUSED
  }
  const ready = await infrastructureReady([REDIS_CONTAINER], infrastructureEnsureOf(context),
    message => context.output.stderr(`local-models-quantize: ${message}`))
  if (!ready) return EXIT_REFUSED
  const shared = openSharedStateStore({ env: context.env })
  try {
    const lease = await acquireRunLease(globalLeaseStore(shared), runIdOf(parsed.request), `${hostname()}:${process.pid}`)
    try {
      return await quantize(parsed, context)
    } finally {
      await lease.release()
    }
  } catch (error) {
    return reportLeaseFailure(error, context)
  } finally {
    await shared.close()
  }
}

function reportLeaseFailure(error: unknown, context: CommandContext): number {
  context.output.stderr(`local-models-quantize: ${(error as Error).message}`)
  if (error instanceof RunLeaseBusyError) return EXIT_LEASE_BUSY
  if (error instanceof RunLeaseUnavailableError) return EXIT_REFUSED
  throw error
}

async function quantize(parsed: QuantizeArguments, context: CommandContext): Promise<number> {
  const podman = createPodmanExecutor()
  const reference = context.env[LAB_IMAGE_ENV] || DEFAULT_LAB_IMAGE
  const image = { reference, ...(await resolveLabImage(podman, reference)) }
  const lab = new QuantizationLab(podman, image.id, parsed.request.scratchDir,
    { memoryBytes: parsed.request.memoryLimitBytes, cpus: parsed.cpus },
    containerMeasureProbe(join(context.thyroxRoot, 'bin', 'container_measure')),
    { id: runIdOf(parsed.request), pid: process.pid })
  const outcome = await runQuantization(parsed.request, {
    fetcher: url => fetch(url),
    runInLab: step => lab.run(step),
    labImage: image,
    admission: unitResourceAdmission(context.thyroxRoot, podman),
    freeBytes: async path => { const info = await statfs(path); return info.bavail * info.bsize },
    register: (state, request) => registerArtifact(state, request, context),
    now: context.now,
  })
  if (outcome.kind === 'completed') {
    context.output.stdout(`cuantizado: ${join(parsed.request.runDir, 'run.json')}`)
    return EXIT_OK
  }
  context.output.stderr(`local-models-quantize: ${outcome.kind === 'refused' ? 'rehusado' : 'falló'}: ${outcome.reason}`)
  return outcome.kind === 'refused' ? EXIT_REFUSED : EXIT_NOT_APPROVED
}

/** Procedencia completa y entrada del catálogo; repetirlo con el mismo artefacto no cambia nada. */
async function registerArtifact(state: RunState, request: QuantizationRequest, context: CommandContext): Promise<StepRecord['artifact']> {
  const path = quantizedPath(request.scratchDir)
  const sha256 = state.observations.quantizedSha256 ?? await sha256OfFile(path)
  const createdAt = context.now().toISOString().replace(/\.\d+Z$/, 'Z')
  const entry = await catalogEntryFromGguf({ path, repository: request.repository, source: 'hf', revision: request.revision,
    quantization: request.level, sha256, capabilities: ['completion'], declaredAt: createdAt, defaultKvCacheType: 'f16' })
  const catalogPath = localModelHome(context.env, context.thyroxRoot).catalog
  await saveModelCatalog(catalogPath, (await loadModelCatalog(catalogPath)).with(entry))
  const manifestPath = join(request.runDir, 'manifest.json')
  await writeFile(manifestPath, `${serializeArtifactManifest(manifestOf(state, request, sha256, createdAt))}\n`)
  await writeFile(join(request.runDir, 'registration.json'), `${JSON.stringify({
    modelName: entry.name, quantizationMethod: state.request.method, catalog: catalogPath, note: QUALIFICATION_NOTE,
  }, null, 2)}\n`)
  return { path: manifestPath, sha256: await sha256OfFile(manifestPath), bytes: (await Bun.file(manifestPath).size) }
}

function manifestOf(state: RunState, request: QuantizationRequest, sha256: string, createdAt: string): ArtifactManifest {
  const validation = state.observations.validation
  if (validation === undefined || state.observations.quantizedBytes === undefined) throw new Error('no hay validación registrada')
  return {
    repository: request.repository,
    source: 'hf',
    revision: request.revision,
    sourceFiles: Object.entries(state.observations.sourceSha256).map(([path, digest]) => ({ path, sha256: digest })),
    converter: { name: CONVERTER_NAME, image: state.image.reference, imageDigest: state.image.digest },
    quantization: request.level,
    gguf: { sha256, bytes: state.observations.quantizedBytes },
    validation,
    createdAt,
  }
}

function parseArguments(argv: readonly string[]): QuantizeArguments | undefined {
  const [subcommand, ...rest] = argv
  if (subcommand !== 'run') return undefined
  const options = optionsOf(rest)
  if (options === undefined) return undefined
  const { repository, revision } = options
  const scratchDir = options['scratch-dir']
  const runDir = options['run-dir']
  const method = (options.method ?? 'direct') as QuantizationMethod
  if (!repository || !revision || !scratchDir || !runDir || !QUANTIZATION_METHODS.includes(method)) return undefined
  return {
    request: {
      repository, revision, level: 'Q4_K_M', method,
      scratchDir: resolve(scratchDir), runDir: resolve(runDir),
      minimumFreeBytes: Number(options['minimum-free-bytes'] ?? 0),
      memoryLimitBytes: Number(options['memory-limit-bytes'] ?? DEFAULT_MEMORY_LIMIT_BYTES),
    },
    cpus: Number(options.cpus ?? DEFAULT_CPUS),
  }
}
