/**
 * Adquisición de un artefacto GGUF ya cuantizado y publicado por su autor
 * (TASK-THYROX-0720). No lo cuantiza thyrox, y la procedencia lo dice: se
 * registra como `external`, con su repositorio, revisión, archivo, sha256,
 * tamaño, cuantización, licencia y fecha de adquisición, y pasa por la misma
 * validación que lo que thyrox cuantiza antes de entrar al catálogo.
 *
 * El sha256 se fija al pedirlo: si el repositorio publica otro para el mismo
 * archivo, se rehúsa antes de descargar.
 *
 * Un autor puede publicar el GGUF partido en shards (`<base>-00001-of-0000N.gguf`).
 * Cada shard se fija por su sha256 y el conjunto tiene que ser la partición
 * completa; el laboratorio los fusiona con `llama-gguf-split --merge` y el
 * archivo fusionado es el artefacto, porque catálogo, caché y runtime lo
 * identifican por un único sha256. La procedencia conserva cada shard oficial
 * y con qué se ensambló: el sha256 del fusionado se mide, no se fija. La operación es idempotente: un
 * archivo ya presente y verificado no se descarga, y una validación
 * registrada sobre el mismo sha256 no se repite.
 */
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { readGgufMetadata } from '@thyrox/model-artifacts/ggufMetadata.ts'
import { catalogEntryFromGguf, loadModelCatalog, saveModelCatalog } from '@thyrox/model-artifacts/modelCatalog.ts'
import { comparisonRefusal, type EvaluationIdentity } from '@thyrox/model-artifacts/evaluationIdentity.ts'
import { SCRATCH_METADATA_MARGIN_BYTES, TOOL_PARAMETERS_VERSION, type SourceSpec } from '@thyrox/model-artifacts/quantizationPlan.ts'
import { workerContainerName } from '@thyrox/podman-execution/workerContainerLifecycle.ts'

import {
  EVAL_CORPUS_FILES,
  GGUF_FILE_TYPE,
  GgufValidationError,
  evalCorpusPath,
  labPathOf,
  lastLines,
  declaredCapabilitiesOf,
  validateGgufArtifact,
  type GgufValidation,
} from './ggufValidation.js'
import { downloadSource, fetchSourceSpec, isVerifiedOnDisk, type Fetcher } from './huggingFaceSource.js'
import type { LabStep, LabStepResult } from './quantizationLab.js'
import type { ResourceAdmission } from './resourceAdmission.js'
import { sha256OfFile } from './sha256File.js'

const STATE_FILE = 'import.json'
const PROVENANCE_FILE = 'provenance.json'
const REFUSAL_FILE = 'refusal.json'
const UNDECLARED_LICENSE = 'undeclared'
export const MERGE_TOOL = 'llama-gguf-split'
const MERGE_DESCRIPTION = `${MERGE_TOOL} --merge`
/** `<base>-<índice>-of-<total>.gguf`, el nombre con que llama.cpp parte un GGUF. */
const SHARD_PATTERN = /^(.+)-(\d{5})-of-(\d{5})\.gguf$/
const SPLIT_COUNT_KEY = 'split.count'

/** Un archivo publicado por el autor, fijado por su sha256 sin prefijo. */
export interface ArtifactPart {
  readonly file: string
  readonly sha256: string
}

export interface ExternalArtifactRequest {
  readonly repository: string
  readonly revision: string
  /** Un archivo, o la partición completa en shards, en orden. */
  readonly parts: readonly ArtifactPart[]
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
  /** Digest de la imagen del laboratorio que valida: una validación con otra imagen no se reutiliza. */
  readonly labImageDigest: string
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
  readonly evaluationIdentity: EvaluationIdentity
  readonly modelName: string
  /** Sólo si el autor lo publicó en shards: cada uno tal como se descargó y verificó. */
  readonly shards?: readonly ShardProvenance[]
  readonly assembly?: { readonly tool: string; readonly labImageDigest: string }
}

export interface ShardProvenance {
  readonly file: string
  readonly sha256: string
  readonly bytes: number
}

export type ImportOutcome =
  | { readonly kind: 'completed'; readonly provenance: ExternalProvenance }
  | { readonly kind: 'refused'; readonly reason: string }
  | { readonly kind: 'failed'; readonly reason: string }

interface ImportState {
  acquiredAt?: string
  /** El fusionado de qué shards, con qué imagen, y su sha256 medido. */
  assembled?: { shardSha256: string[]; sha256: string; labImageDigest: string }
  checked?: GgufValidation
  evaluationIdentity?: EvaluationIdentity
}

export function importIdOf(request: Pick<ExternalArtifactRequest, 'repository' | 'revision'>): string {
  const repository = request.repository.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `import-${repository}-${request.revision.slice(0, 12)}`
}

export async function importExternalArtifact(request: ExternalArtifactRequest, deps: ExternalArtifactDeps): Promise<ImportOutcome> {
  await mkdir(request.runDir, { recursive: true })
  await mkdir(request.scratchDir, { recursive: true })
  const source = await fetchSourceSpec(deps.fetcher, request.repository, request.revision)
  const subset = artifactSubset(source, request.parts)
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

/** El archivo que es el artefacto: el único publicado, o el que fusiona los shards. */
export function artifactFileOf(parts: readonly ArtifactPart[]): string {
  if (!isSharded(parts)) return parts[0]!.file
  return `${SHARD_PATTERN.exec(parts[0]!.file)![1]}.gguf`
}

function isSharded(parts: readonly ArtifactPart[]): boolean {
  return parts.length > 1
}

/**
 * Los shards pedidos tienen que ser la partición completa y en orden: misma
 * base, índices 1..N y total N. Uno suelto, o uno de más o de menos, no
 * fusiona el modelo que el autor publicó.
 */
function splitRefusal(parts: readonly ArtifactPart[]): string | undefined {
  if (parts.length === 0) return 'no se pidió ningún archivo'
  const matches = parts.map(part => SHARD_PATTERN.exec(part.file))
  if (!isSharded(parts)) {
    const single = matches[0]
    return single === null || single === undefined || single[3] === '00001' ? undefined
      : `${parts[0]!.file} es un shard de ${Number(single[3])}; se piden todos`
  }
  const base = matches[0]?.[1]
  const complete = matches.every((match, index) => match !== null && match[1] === base
    && Number(match[2]) === index + 1 && Number(match[3]) === parts.length)
  return complete ? undefined : `los shards pedidos no son la partición completa y en orden: ${parts.map(part => part.file).join(', ')}`
}

/** El artefacto y los archivos del corpus de validación; nada más del repositorio. */
function artifactSubset(source: SourceSpec, parts: readonly ArtifactPart[]): SourceSpec {
  const wanted = new Set<string>([...parts.map(part => part.file), ...EVAL_CORPUS_FILES])
  return { ...source, files: source.files.filter(candidate => wanted.has(candidate.path)) }
}

async function preflight(request: ExternalArtifactRequest, subset: SourceSpec, deps: ExternalArtifactDeps): Promise<string | undefined> {
  const split = splitRefusal(request.parts)
  if (split !== undefined) return split
  if (publishedCorpusFiles(subset).length === 0) {
    return `${request.repository}@${request.revision} no publica ningún archivo del corpus de validación (${EVAL_CORPUS_FILES.join(', ')})`
  }
  for (const part of request.parts) {
    const artifact = subset.files.find(file => file.path === part.file)
    if (artifact === undefined) return `${request.repository}@${request.revision} no publica ${part.file}`
    if (artifact.digest !== `sha256:${part.sha256}`) return `${part.file} se publica como ${artifact.digest}, no con el sha256 fijado ${part.sha256}`
  }
  const needBytes = await missingBytes(subset, request.scratchDir) + await assemblyBytes(request, subset) + SCRATCH_METADATA_MARGIN_BYTES
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

/** Lo que ocupará el fusionado si aún no está: tantos bytes como sus shards. */
async function assemblyBytes(request: ExternalArtifactRequest, subset: SourceSpec): Promise<number> {
  if (!isSharded(request.parts)) return 0
  const present = await stat(join(request.scratchDir, artifactFileOf(request.parts))).then(() => true, () => false)
  return present ? 0 : shardsOf(request, subset).reduce((sum, shard) => sum + shard.bytes, 0)
}

function shardsOf(request: ExternalArtifactRequest, subset: SourceSpec): ShardProvenance[] {
  return request.parts.map(part => ({ file: part.file, sha256: part.sha256,
    bytes: subset.files.find(file => file.path === part.file)!.sizeBytes }))
}

async function refuse(request: ExternalArtifactRequest, reason: string, deps: ExternalArtifactDeps): Promise<ImportOutcome> {
  await deps.admission.releaseAll()
  await writeJson(join(request.runDir, REFUSAL_FILE), { refusedAt: deps.now().toISOString(), reason })
  return { kind: 'refused', reason }
}

async function acquire(request: ExternalArtifactRequest, subset: SourceSpec, deps: ExternalArtifactDeps): Promise<ImportOutcome> {
  const state = await readState(request.runDir)
  const path = join(request.scratchDir, artifactFileOf(request.parts))
  await downloadSource(deps.fetcher, subset, request.scratchDir)
  state.acquiredAt ??= deps.now().toISOString()
  await writeCorpus(request.scratchDir, publishedCorpusFiles(subset))
  if (isSharded(request.parts)) await assemble(request, path, state, deps)
  const identity = await evaluationIdentityOf(request, deps)
  if (!(await isValidated(state, identity, path, subset, request))) {
    state.checked = await validateGgufArtifact({ path, scratchDir: request.scratchDir, corpusPath: evalCorpusPath(request.scratchDir),
      workerId: importIdOf(request), expectedFileType: GGUF_FILE_TYPE.Q4_K_M, runInLab: deps.runInLab })
    state.evaluationIdentity = identity
    await writeJson(join(request.runDir, STATE_FILE), state)
  }
  return { kind: 'completed', provenance: await register(request, subset, path, state, deps) }
}

/**
 * Fusiona los shards en el laboratorio, salvo que el fusionado en disco sea
 * el de estos mismos shards y esta misma imagen. Un fusionado nuevo invalida
 * la validación anterior: es otro archivo hasta que se mida.
 */
async function assemble(request: ExternalArtifactRequest, path: string, state: ImportState, deps: ExternalArtifactDeps): Promise<void> {
  const shardSha256 = request.parts.map(part => part.sha256)
  if (await isAssembled(state, shardSha256, path, deps)) return
  await rm(path, { force: true })
  const first = join(request.scratchDir, request.parts[0]!.file)
  const result = await deps.runInLab({ workerId: importIdOf(request),
    command: [MERGE_TOOL, '--merge', labPathOf(first, request.scratchDir), labPathOf(path, request.scratchDir)] })
  if (result.exitCode !== 0) throw new GgufValidationError(`${MERGE_TOOL} exit ${result.exitCode}: ${lastLines(result.stderr)}`)
  await requireUnsplit(path)
  state.assembled = { shardSha256, sha256: await sha256OfFile(path), labImageDigest: deps.labImageDigest }
  delete state.checked
  await writeJson(join(request.runDir, STATE_FILE), state)
}

async function isAssembled(state: ImportState, shardSha256: readonly string[], path: string, deps: ExternalArtifactDeps): Promise<boolean> {
  const previous = state.assembled
  if (previous === undefined || previous.labImageDigest !== deps.labImageDigest) return false
  if (previous.shardSha256.join() !== shardSha256.join()) return false
  return await sha256OfFile(path).catch(() => undefined) === previous.sha256
}

/** Un fusionado que todavía declara `split.count` > 1 no es el modelo entero. */
async function requireUnsplit(path: string): Promise<void> {
  const count = Number((await readGgufMetadata(path)).metadata[SPLIT_COUNT_KEY] ?? 1)
  if (count > 1) throw new GgufValidationError(`${MERGE_DESCRIPTION} dejó un GGUF que aún declara ${SPLIT_COUNT_KEY} = ${count}`)
}

/**
 * Una validación sirve sólo si se hizo sobre este mismo archivo, verificado en
 * disco, y con la misma identidad de evaluación: otro corpus, otra imagen u
 * otros parámetros la invalidan aunque el artefacto no haya cambiado.
 */
async function isValidated(state: ImportState, identity: EvaluationIdentity, path: string, subset: SourceSpec,
  request: ExternalArtifactRequest): Promise<boolean> {
  const sameEvaluation = state.evaluationIdentity !== undefined && comparisonRefusal(state.evaluationIdentity, identity) === undefined
  if (!sameEvaluation) return false
  if (isSharded(request.parts)) return state.assembled !== undefined && state.checked?.sha256 === state.assembled.sha256
  const artifact = subset.files.find(file => file.path === request.parts[0]!.file)!
  return state.checked?.sha256 === request.parts[0]!.sha256 && await isVerifiedOnDisk(path, artifact)
}

async function evaluationIdentityOf(request: ExternalArtifactRequest, deps: ExternalArtifactDeps): Promise<EvaluationIdentity> {
  return {
    sourceRepository: request.repository,
    sourceRevision: request.revision,
    corpusSha256: await sha256OfFile(evalCorpusPath(request.scratchDir)),
    imageDigest: deps.labImageDigest,
    toolParameters: TOOL_PARAMETERS_VERSION,
  }
}

/**
 * Los archivos del corpus que la fuente publica: no toda fuente trae `LICENSE`
 * (nomic-embed-text-v1.5-GGUF declara su licencia en la metadata del modelo y
 * sólo publica `README.md`), y el corpus se arma con lo que hay.
 */
function publishedCorpusFiles(subset: SourceSpec): string[] {
  const published = new Set(subset.files.map(file => file.path))
  return EVAL_CORPUS_FILES.filter(name => published.has(name))
}

async function writeCorpus(scratchDir: string, corpusFiles: readonly string[]): Promise<void> {
  const parts = await Promise.all(corpusFiles.map(name => readFile(join(scratchDir, name), 'utf8')))
  await writeFile(evalCorpusPath(scratchDir), parts.join('\n'))
}

async function register(request: ExternalArtifactRequest, subset: SourceSpec, path: string, state: ImportState,
  deps: ExternalArtifactDeps): Promise<ExternalProvenance> {
  const checked = state.checked!
  const acquiredAt = state.acquiredAt!
  const entry = await catalogEntryFromGguf({ path, repository: request.repository, source: 'hf', revision: request.revision,
    quantization: request.quantization, sha256: checked.sha256, capabilities: await declaredCapabilitiesOf(path),
    declaredAt: acquiredAt.replace(/\.\d+Z$/, 'Z'), defaultKvCacheType: 'f16' })
  await saveModelCatalog(deps.catalogPath, (await loadModelCatalog(deps.catalogPath)).with(entry))
  const provenance: ExternalProvenance = {
    provenance: 'external', repository: request.repository, revision: request.revision, file: artifactFileOf(request.parts),
    sha256: checked.sha256, bytes: checked.bytes, quantization: request.quantization,
    license: subset.license ?? UNDECLARED_LICENSE, acquiredAt, validation: checked.validation,
    evaluationIdentity: state.evaluationIdentity!, modelName: entry.name,
    ...(isSharded(request.parts) ? {
      shards: shardsOf(request, subset),
      assembly: { tool: MERGE_DESCRIPTION, labImageDigest: state.assembled!.labImageDigest },
    } : {}),
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
