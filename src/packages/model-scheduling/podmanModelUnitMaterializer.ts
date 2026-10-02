/**
 * `PodmanModelUnitMaterializer`: materializa un `ExecutionGrant` vigente en
 * un contenedor de runtime por residencia (ADR-007 1.13.0, topología A).
 *
 * Rechaza sin tocar Podman un grant caducado o de una generación que no es la
 * vigente (M17, M19); con la coordinación no disponible también rechaza. El
 * contenedor lleva en sus etiquetas la identidad de la unidad —grant,
 * residencia, generación, digest— para que `units()` la reconstruya al
 * reconciliar sin otra fuente. No borra imágenes ni volúmenes: `destroy`
 * retira el contenedor de la unidad y nada más.
 *
 * El contenedor lo compone la primitiva neutral `@thyrox/podman-execution`
 * (ADR-007 1.7.1): dueño `model-coordinator` en las etiquetas de dueño,
 * límites de recursos del perfil, red `bridge` con el puerto del runtime
 * publicado sólo en `127.0.0.1` y los dispositivos del grant en forma CDI.
 * Nunca red `host`: el runtime no escucha en la red del anfitrión.
 */
import type { WorkerResourceMount } from '@thyrox/podman-execution/workerResourceProfile.ts'
import type { ExecutionGrant, ModelRuntime } from '@thyrox/model-artifacts/executionGrant.ts'
import type { ArtifactFormat } from '@thyrox/model-artifacts/catalogEntry.ts'
import type { ModelSource } from '@thyrox/model-artifacts/modelName.ts'
import { QUANTIZATION_LEVELS, type QuantizationLevel } from '@thyrox/model-artifacts/quantizationLevel.ts'
import type { ResolvedModelArtifact } from '@thyrox/model-artifacts/resolvedModelArtifact.ts'
import type { PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import { ContainerRunError } from '@thyrox/podman-execution/containerRun.ts'
import { listLabeledContainers } from '@thyrox/podman-execution/podmanObservation.ts'
import { type ExecutionAuthorization, type ExecutionUnit, materializeExecution } from '@thyrox/podman-execution/executionAuthorization.ts'
import {
  ownerFromLabels,
  type ContainerOwner,
  removeExecutionContainer,
  WORKER_CONTAINER_NAME_PREFIX,
  workerContainerName,
} from '@thyrox/podman-execution/workerContainerLifecycle.ts'
import type { WorkerPublishedPort } from '@thyrox/podman-execution/workerResourceProfile.ts'

import type { ModelExecutionUnit, MaterializationOutcome, ModelUnitMaterializer } from './modelUnitMaterializer.ts'

/** Prefijo del nombre de contenedor de una unidad de modelo. */
export const MODEL_UNIT_CONTAINER_PREFIX = WORKER_CONTAINER_NAME_PREFIX

/** Las etiquetas con que una unidad se identifica en Podman. */
export const MODEL_UNIT_LABELS = {
  unit: 'thyrox.model.unit',
  grant: 'thyrox.model.grant',
  model: 'thyrox.model.name',
  repository: 'thyrox.model.repository',
  source: 'thyrox.model.source',
  /** Revisión completa, nunca sus 12 primeros hex. */
  revision: 'thyrox.model.revision',
  format: 'thyrox.model.format',
  quantization: 'thyrox.model.quantization',
  bytes: 'thyrox.model.bytes',
  residency: 'thyrox.model.residency',
  generation: 'thyrox.model.generation',
  sha256: 'thyrox.model.sha256',
  runtime: 'thyrox.model.runtime',
  port: 'thyrox.model.port',
  createdAt: 'thyrox.model.created-at',
  /** UUID de los dispositivos concedidos, separados por coma; vacío en CPU. */
  devices: 'thyrox.model.devices',
} as const

type ModelUnitLabelKey = keyof typeof MODEL_UNIT_LABELS

/**
 * Las etiquetas sin las cuales un contenedor no es una unidad reconstruible.
 * `devices` no está: su ausencia se lee como «sin dispositivos».
 */
const REQUIRED_LABEL_KEYS: readonly ModelUnitLabelKey[] = [
  'unit', 'grant', 'model', 'repository', 'source', 'revision', 'format', 'quantization', 'bytes',
  'residency', 'generation', 'sha256', 'runtime', 'port', 'createdAt',
]

/** Cómo se levanta el contenedor de un runtime: imagen local y entorno según el puerto de loopback. */
export interface RuntimeContainerProfile {
  /** Referencia local; la primitiva no descarga imágenes. */
  readonly image: string
  /** El puerto donde escucha el runtime dentro del contenedor. */
  readonly containerPort: number
  /** Entorno del runtime; sólo valores públicos (la primitiva neutral rehúsa nombres de credencial). */
  readonly environment: Readonly<Record<string, string>>
  /**
   * Cómo ve la unidad el artefacto concedido, si el runtime lo lee del disco
   * en vez de recibirlo por su API (TASK-THYROX-0776): el directorio del
   * anfitrión que lo contiene, verificado, se monta de sólo lectura.
   */
  readonly artifactMount?: ArtifactMount
}

/** El artefacto del grant expuesto a la unidad: de dónde se lee y dónde lo ve el runtime. */
export interface ArtifactMount {
  hostDirectory(artifact: ResolvedModelArtifact): string
  readonly containerDirectory: string
}

/** Límites de recursos de un contenedor de unidad. */
export interface ModelUnitLimits {
  readonly cpus: number
  readonly memoryMib: number
  readonly pidsLimit: number
}

export interface PodmanModelUnitMaterializerOptions {
  readonly podman: PodmanExecutor
  /** La generación vigente de una residencia, de la coordinación. */
  currentGeneration(residencyKey: string): Promise<number | 'unavailable'>
  readonly profiles: Partial<Record<ModelRuntime, RuntimeContainerProfile>>
  /** Un puerto de loopback libre para la unidad. */
  allocatePort(): Promise<number>
  readonly now: () => Date
  /** El coordinador dueño de las unidades: `kind` es `model-coordinator`. */
  readonly owner: ContainerOwner
  readonly limits: ModelUnitLimits
}

const UNIT_ID_PREFIX = 'unit-'
const LOOPBACK_HOST: WorkerPublishedPort['hostAddress'] = '127.0.0.1'
const GPU_DEVICE_PREFIX = 'nvidia.com/gpu='
const DEVICE_SEPARATOR = ','
/** Pid que Podman informa para un contenedor que no corre. */
const NOT_RUNNING_PID = 0
const DECIMAL_INTEGER = /^-?\d+$/
const KNOWN_RUNTIMES: readonly ModelRuntime[] = ['ollama', 'llama.cpp', 'transformers']

/** La unidad de un grant: una por grant, así que su identidad deriva de él. */
export function modelUnitId(grantId: string): string {
  return `${UNIT_ID_PREFIX}${grantId}`
}

export function modelUnitContainerName(unitId: string): string {
  return workerContainerName(unitId)
}

function loopbackEndpoint(port: number): string {
  return `http://${LOOPBACK_HOST}:${port}`
}

function grantedDevices(grant: ExecutionGrant): readonly string[] {
  return grant.placement.kind === 'gpu' ? grant.placement.devices : []
}

function isExpired(grant: ExecutionGrant, now: Date): boolean {
  return now.getTime() >= Date.parse(grant.expiresAt)
}

/** Lo que fija el contenedor de una unidad antes de crearlo. */
interface ModelUnitContainerSpec {
  readonly grant: ExecutionGrant
  readonly unitId: string
  readonly port: number
  readonly createdAt: string
  readonly profile: RuntimeContainerProfile
  readonly owner: ContainerOwner
  readonly limits: ModelUnitLimits
}

function unitLabels(spec: ModelUnitContainerSpec): Record<ModelUnitLabelKey, string> {
  const { grant } = spec
  return {
    unit: spec.unitId,
    grant: grant.grantId,
    model: grant.artifact.modelId,
    repository: grant.artifact.repository,
    source: grant.artifact.source,
    revision: grant.artifact.revision,
    format: grant.artifact.format,
    quantization: grant.artifact.quantization,
    bytes: String(grant.artifact.bytes),
    residency: grant.residency.instance,
    generation: String(grant.residency.generation),
    sha256: grant.artifact.artifactId,
    runtime: grant.runtime,
    port: String(spec.port),
    createdAt: spec.createdAt,
    devices: grantedDevices(grant).join(DEVICE_SEPARATOR),
  }
}

/** Las etiquetas de la unidad con su clave completa de Podman (`thyrox.model.*`). */
function unitLabelArguments(spec: ModelUnitContainerSpec): Record<string, string> {
  const labels = unitLabels(spec)
  return Object.fromEntries((Object.keys(labels) as ModelUnitLabelKey[]).map(key => [MODEL_UNIT_LABELS[key], labels[key]]))
}

/** Los dispositivos del grant en forma CDI; vacío en CPU. */
function cdiDevices(grant: ExecutionGrant): string[] {
  return grantedDevices(grant).map(uuid => `${GPU_DEVICE_PREFIX}${uuid}`)
}

/**
 * El grant compuesto en la autorización canónica del contenedor: red
 * `bridge` —nunca `host`— con el puerto del runtime publicado sólo en
 * loopback, el entorno del perfil, los dispositivos concedidos y las
 * etiquetas de la unidad. La caducidad del grant viaja con ella.
 */
export function modelUnitAuthorization(spec: ModelUnitContainerSpec): ExecutionAuthorization {
  return {
    executionId: spec.unitId,
    reference: { kind: 'grant', grantId: spec.grant.grantId },
    owner: spec.owner,
    kind: 'model-runtime',
    image: spec.profile.image,
    mounts: artifactMounts(spec),
    resources: spec.limits,
    network: 'bridge',
    environment: spec.profile.environment,
    publishedPorts: [{ hostAddress: LOOPBACK_HOST, hostPort: spec.port, containerPort: spec.profile.containerPort }],
    devices: cdiDevices(spec.grant),
    labels: unitLabelArguments(spec),
    expiresAt: Date.parse(spec.grant.expiresAt),
  }
}

/** El artefacto concedido de sólo lectura, si el perfil lo declara; ningún otro montaje. */
function artifactMounts(spec: ModelUnitContainerSpec): WorkerResourceMount[] {
  const mount = spec.profile.artifactMount
  if (mount === undefined) return []
  return [{ source: mount.hostDirectory(spec.grant.artifact), destination: mount.containerDirectory, mode: 'ro' }]
}

function pidsOf(pid: unknown): readonly number[] {
  return typeof pid === 'number' && pid !== NOT_RUNNING_PID ? [pid] : []
}

/** Una entrada de `podman ps --format json`, con sólo lo que la reconstrucción lee. */
interface ListedContainer {
  readonly Id?: unknown
  readonly Names?: unknown
  readonly Labels?: Record<string, unknown> | null
  readonly Pid?: unknown
}

function labelValue(container: ListedContainer, key: ModelUnitLabelKey): string | undefined {
  const value = container.Labels?.[MODEL_UNIT_LABELS[key]]
  return typeof value === 'string' ? value : undefined
}

function hasUnitIdentity(container: ListedContainer): boolean {
  return typeof container.Id === 'string' && REQUIRED_LABEL_KEYS.every(key => labelValue(container, key) !== undefined)
}

function parseInteger(text: string): number | undefined {
  return DECIMAL_INTEGER.test(text) ? Number(text) : undefined
}

function isKnownRuntime(text: string): text is ModelRuntime {
  return (KNOWN_RUNTIMES as readonly string[]).includes(text)
}

function parseDevices(text: string | undefined): readonly string[] {
  return text ? text.split(DEVICE_SEPARATOR) : []
}

/**
 * Reconstruye la unidad de un contenedor listado sólo con sus etiquetas. Un
 * contenedor sin la identidad completa, o con una generación, un puerto o un
 * runtime ilegibles, no es una unidad de esta primitiva: `undefined`.
 */
function unitFromContainer(container: ListedContainer): ModelExecutionUnit | undefined {
  if (!hasUnitIdentity(container)) return undefined
  const label = (key: ModelUnitLabelKey): string => labelValue(container, key) as string
  const generation = parseInteger(label('generation'))
  const port = parseInteger(label('port'))
  const runtime = label('runtime')
  const artifact = artifactFromLabels(label)
  const owner = ownerFromLabels(container.Labels)
  const [containerName] = Array.isArray(container.Names) ? container.Names : []
  if (generation === undefined || port === undefined || !isKnownRuntime(runtime) || artifact === undefined
    || owner === undefined || typeof containerName !== 'string') return undefined
  return {
    unitId: label('unit'),
    kind: 'model-runtime',
    reference: { kind: 'grant', grantId: label('grant') },
    owner,
    containerName,
    grantId: label('grant'),
    artifact,
    residencyKey: label('residency'),
    generation,
    runtime,
    endpoint: loopbackEndpoint(port),
    containerId: container.Id as string,
    devices: parseDevices(labelValue(container, 'devices')),
    hostPids: pidsOf(container.Pid),
    createdAt: label('createdAt'),
  }
}

export class PodmanModelUnitMaterializer implements ModelUnitMaterializer {
  constructor(private readonly options: PodmanModelUnitMaterializerOptions) {}

  async materialize(grant: ExecutionGrant): Promise<MaterializationOutcome> {
    const rejection = await this.admissionRejection(grant)
    if (rejection) return rejection
    const profile = this.options.profiles[grant.runtime]
    if (!profile) return { status: 'failed', reason: `sin perfil de contenedor para el runtime ${grant.runtime}`, partial: false }
    return this.createUnit(grant, profile)
  }

  /** La retirada la hace el dueño de Podman (ADR-007 Regla 4, P2); aquí sólo se nombra la unidad. */
  async destroy(unitId: string): Promise<'destroyed' | 'absent' | 'failed'> {
    return removeExecutionContainer(this.options.podman, modelUnitContainerName(unitId))
  }

  /** La lista la observa el dueño (P3) y lanza si Podman no lista: un vacío no distingue «no hay» de «no se pudo mirar». */
  async units(): Promise<readonly ModelExecutionUnit[]> {
    const listed = await listLabeledContainers(this.options.podman, MODEL_UNIT_LABELS.unit)
    return listed.flatMap(container => unitFromContainer(container as ListedContainer) ?? [])
  }

  /** El rechazo que el grant merece antes de tocar Podman, o `undefined` si es vigente. */
  private async admissionRejection(grant: ExecutionGrant): Promise<MaterializationOutcome | undefined> {
    if (isExpired(grant, this.options.now())) {
      return { status: 'rejected', reason: 'expired_grant', detail: `el grant ${grant.grantId} caducó en ${grant.expiresAt}` }
    }
    const current = await this.options.currentGeneration(grant.residency.instance)
    if (current === grant.residency.generation) return undefined
    return {
      status: 'rejected',
      reason: 'stale_generation',
      detail: `la residencia ${grant.residency.instance} está en la generación ${current}, el grant trae la ${grant.residency.generation}`,
    }
  }

  /** Crea, arranca e inspecciona; todo fallo posterior a `create` deja un contenedor y se declara `partial`. */
  private async createUnit(grant: ExecutionGrant, profile: RuntimeContainerProfile): Promise<MaterializationOutcome> {
    const { podman } = this.options
    const unitId = modelUnitId(grant.grantId)
    const name = modelUnitContainerName(unitId)
    const port = await this.options.allocatePort()
    const createdAt = this.options.now().toISOString()
    const { owner, limits } = this.options
    const authorization = modelUnitAuthorization({ grant, unitId, port, createdAt, profile, owner, limits })
    let materialized: ExecutionUnit
    try {
      materialized = await materializeExecution(podman, authorization, Date.parse(createdAt))
    } catch (error) {
      if (!(error instanceof ContainerRunError)) throw error
      // `create` que falla no deja nada; `start` o `inspect` que fallan dejan el contenedor creado.
      if (error.stage === 'create') return { status: 'failed', reason: `podman create ${name}: ${error.message}`, partial: false }
      return partialFailure(unitId, `podman ${error.stage} ${name}: ${error.message}`)
    }
    const unit: ModelExecutionUnit = {
      ...materialized,
      kind: 'model-runtime',
      reference: { kind: 'grant', grantId: grant.grantId },
      grantId: grant.grantId,
      artifact: grant.artifact,
      residencyKey: grant.residency.instance,
      generation: grant.residency.generation,
      runtime: grant.runtime,
      endpoint: loopbackEndpoint(port),
      devices: grantedDevices(grant),
    }
    return { status: 'materialized', unit }
  }

}

function partialFailure(unitId: string, reason: string): MaterializationOutcome {
  return { status: 'failed', reason, partial: true, unitId }
}

const MODEL_SOURCES: readonly string[] = ['hf', 'ollama'] satisfies readonly ModelSource[]
const ARTIFACT_FORMATS: readonly string[] = ['gguf', 'ollama-registry', 'safetensors'] satisfies readonly ArtifactFormat[]

/** La identidad resuelta que las etiquetas declaran; incompleta o ilegible es `undefined`. */
function artifactFromLabels(label: (key: ModelUnitLabelKey) => string): ResolvedModelArtifact | undefined {
  const source = label('source')
  const format = label('format')
  const quantization = label('quantization')
  const bytes = parseInteger(label('bytes'))
  if (!MODEL_SOURCES.includes(source) || !ARTIFACT_FORMATS.includes(format)) return undefined
  if (!Object.hasOwn(QUANTIZATION_LEVELS, quantization) || bytes === undefined) return undefined
  return {
    modelId: label('model'),
    repository: label('repository'),
    source: source as ModelSource,
    revision: label('revision'),
    artifactId: label('sha256'),
    format: format as ArtifactFormat,
    quantization: quantization as QuantizationLevel,
    bytes,
  }
}
