/**
 * Adquisición de un artefacto GGUF ya cuantizado y publicado por su autor
 * (TASK-THYROX-0720). No lo cuantiza thyrox, y la procedencia lo dice: se
 * registra como `external`, con su repositorio, revisión, archivo, sha256,
 * tamaño, cuantización, licencia y fecha de adquisición, y pasa por la misma
 * validación que lo que thyrox cuantiza antes de entrar al catálogo.
 *
 * El sha256 se fija al pedirlo: si el repositorio publica otro para el mismo
 * archivo, se rehúsa antes de descargar. La operación es idempotente: un
 * archivo ya presente y verificado no se descarga, y una validación
 * registrada sobre el mismo sha256 no se repite.
 */
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { catalogEntryFromGguf, loadModelCatalog, saveModelCatalog } from '@thyrox/model-artifacts/modelCatalog.ts'
import { SCRATCH_METADATA_MARGIN_BYTES, type SourceSpec } from '@thyrox/model-artifacts/quantizationPlan.ts'
import { workerContainerName } from '@thyrox/podman-execution/workerContainerLifecycle.ts'

import {
  EVAL_CORPUS_FILES,
  GGUF_FILE_TYPE,
  GgufValidationError,
  evalCorpusPath,
  validateGgufArtifact,
  type GgufValidation,
} from './ggufValidation.js'
import { downloadSource, fetchSourceSpec, isVerifiedOnDisk, type Fetcher } from './huggingFaceSource.js'
import type { LabStep, LabStepResult } from './quantizationLab.js'
import type { ResourceAdmission } from './resourceAdmission.js'

const STATE_FILE = 'import.json'
const PROVENANCE_FILE = 'provenance.json'
const REFUSAL_FILE = 'refusal.json'
const UNDECLARED_LICENSE = 'undeclared'

export interface ExternalArtifactRequest {
  readonly repository: string
  readonly revision: string
  readonly file: string
  /** El sha256 que se fija al pedirlo, sin prefijo. */
  readonly sha256: string
  readonly quantization: 'Q4_K_M'
  readonly scratchDir: string
  readonly runDir: string
  readonly memoryLimitBytes: number
}

export interface ExternalArtifactDeps {
  readonly fetcher: Fetcher
  readonly runInLab: (step: LabStep) => Promise<LabStepResult>
  readonly admission: ResourceAdmission
  readonly freeBytes: (path: string) => Promise<number>
  readonly catalogPath: string
  readonly now: () => Date
}

export interface ExternalProvenance {
  readonly provenance: 'external'
  readonly repository: string
  readonly revision: string
  readonly file: string
  readonly sha256: string
  readonly bytes: number
  readonly quantization: string
  readonly license: string
  readonly acquiredAt: string
  readonly validation: GgufValidation['validation']
  readonly modelName: string
}

export type ImportOutcome =
  | { readonly kind: 'completed'; readonly provenance: ExternalProvenance }
  | { readonly kind: 'refused'; readonly reason: string }
  | { readonly kind: 'failed'; readonly reason: string }

interface ImportState {
  acquiredAt?: string
  checked?: GgufValidation
}

export function importIdOf(request: Pick<ExternalArtifactRequest, 'repository' | 'revision' | 'file'>): string {
  const repository = request.repository.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `import-${repository}-${request.revision.slice(0, 12)}`
}

export async function importExternalArtifact(request: ExternalArtifactRequest, deps: ExternalArtifactDeps): Promise<ImportOutcome> {
  await mkdir(request.runDir, { recursive: true })
  await mkdir(request.scratchDir, { recursive: true })
  const source = await fetchSourceSpec(deps.fetcher, request.repository, request.revision)
  const subset = artifactSubset(source, request.file)
  const refusal = await preflight(request, subset, deps)
  if (refusal !== undefined) return refuse(request, refusal, deps)
  try {
    return await acquire(request, subset, deps)
  } catch (error) {
    if (error instanceof GgufValidationError) return { kind: 'failed', reason: error.message }
    throw error
  } finally {
    await deps.admission.releaseAll()
  }
}

/** El artefacto y los archivos del corpus de validación; nada más del repositorio. */
function artifactSubset(source: SourceSpec, file: string): SourceSpec {
  const wanted = new Set<string>([file, ...EVAL_CORPUS_FILES])
  return { ...source, files: source.files.filter(candidate => wanted.has(candidate.path)) }
}

async function preflight(request: ExternalArtifactRequest, subset: SourceSpec, deps: ExternalArtifactDeps): Promise<string | undefined> {
  const artifact = subset.files.find(file => file.path === request.file)
  if (artifact === undefined) return `${request.repository}@${request.revision} no publica ${request.file}`
  if (artifact.digest !== `sha256:${request.sha256}`) return `${request.file} se publica como ${artifact.digest}, no con el sha256 fijado ${request.sha256}`
  const needBytes = await missingBytes(subset, request.scratchDir) + SCRATCH_METADATA_MARGIN_BYTES
  const free = await deps.freeBytes(request.scratchDir)
  if (free < needBytes) return `el scratch tiene ${free} bytes libres; se necesitan ${needBytes}`
  const disk = await deps.admission.admitDisk(needBytes, request.scratchDir)
  if (!disk.admitted) return `admisión de disco: ${disk.detail}`
  const memory = await deps.admission.admitMemory(request.memoryLimitBytes, workerContainerName(importIdOf(request)))
  if (!memory.admitted) return `admisión de memoria: ${memory.detail}`
  return undefined
}

/**
 * Lo que falta escribir: un archivo ya presente con su tamaño exacto no se
 * vuelve a pedir. Su contenido lo verifica la descarga, que lo baja de nuevo
 * si no coincide; aquí sólo se decide cuánto disco reservar.
 */
async function missingBytes(subset: SourceSpec, scratchDir: string): Promise<number> {
  const sizes = await Promise.all(subset.files.map(async file => {
    const present = await stat(join(scratchDir, file.path)).then(info => info.size, () => undefined)
    return present === file.sizeBytes ? 0 : file.sizeBytes
  }))
  return sizes.reduce((sum, bytes) => sum + bytes, 0)
}

async function refuse(request: ExternalArtifactRequest, reason: string, deps: ExternalArtifactDeps): Promise<ImportOutcome> {
  await deps.admission.releaseAll()
  await writeJson(join(request.runDir, REFUSAL_FILE), { refusedAt: deps.now().toISOString(), reason })
  return { kind: 'refused', reason }
}

async function acquire(request: ExternalArtifactRequest, subset: SourceSpec, deps: ExternalArtifactDeps): Promise<ImportOutcome> {
  const state = await readState(request.runDir)
  const path = join(request.scratchDir, request.file)
  await downloadSource(deps.fetcher, subset, request.scratchDir)
  state.acquiredAt ??= deps.now().toISOString()
  if (!(await isValidated(state, path, subset, request))) {
    await writeCorpus(request.scratchDir)
    state.checked = await validateGgufArtifact({ path, scratchDir: request.scratchDir, corpusPath: evalCorpusPath(request.scratchDir),
      workerId: importIdOf(request), expectedFileType: GGUF_FILE_TYPE.Q4_K_M, runInLab: deps.runInLab })
    await writeJson(join(request.runDir, STATE_FILE), state)
  }
  return { kind: 'completed', provenance: await register(request, subset, path, state, deps) }
}

/** Una validación sirve sólo si se hizo sobre este mismo archivo, verificado en disco. */
async function isValidated(state: ImportState, path: string, subset: SourceSpec, request: ExternalArtifactRequest): Promise<boolean> {
  const artifact = subset.files.find(file => file.path === request.file)!
  return state.checked?.sha256 === request.sha256 && await isVerifiedOnDisk(path, artifact)
}

async function writeCorpus(scratchDir: string): Promise<void> {
  const parts = await Promise.all(EVAL_CORPUS_FILES.map(name => readFile(join(scratchDir, name), 'utf8')))
  await writeFile(evalCorpusPath(scratchDir), parts.join('\n'))
}

async function register(request: ExternalArtifactRequest, subset: SourceSpec, path: string, state: ImportState,
  deps: ExternalArtifactDeps): Promise<ExternalProvenance> {
  const checked = state.checked!
  const acquiredAt = state.acquiredAt!
  const entry = await catalogEntryFromGguf({ path, repository: request.repository, source: 'hf', revision: request.revision,
    quantization: request.quantization, sha256: checked.sha256, capabilities: ['completion'],
    declaredAt: acquiredAt.replace(/\.\d+Z$/, 'Z'), defaultKvCacheType: 'f16' })
  await saveModelCatalog(deps.catalogPath, (await loadModelCatalog(deps.catalogPath)).with(entry))
  const provenance: ExternalProvenance = {
    provenance: 'external', repository: request.repository, revision: request.revision, file: request.file,
    sha256: checked.sha256, bytes: checked.bytes, quantization: request.quantization,
    license: subset.license ?? UNDECLARED_LICENSE, acquiredAt, validation: checked.validation, modelName: entry.name,
  }
  await writeJson(join(request.runDir, PROVENANCE_FILE), provenance)
  return provenance
}

async function readState(runDir: string): Promise<ImportState> {
  const text = await readFile(join(runDir, STATE_FILE), 'utf8').catch(() => undefined)
  return text === undefined ? {} : JSON.parse(text) as ImportState
}

async function writeJson(path: string, value: unknown): Promise<void> {
  const partial = `${path}.partial`
  await writeFile(partial, `${JSON.stringify(value, null, 2)}\n`)
  await rename(partial, path)
}
