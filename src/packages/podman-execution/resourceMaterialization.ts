/**
 * Materialización declarativa de un recurso Podman (ADR-007 1.15.0,
 * TASK-THYROX-0739): el mismo mecanismo para un worker y para la
 * infraestructura gestionada, con dueños y ciclos de vida distintos.
 *
 * `ensureResource(desired)` es idempotente: crea, arranca, conserva o recrea el
 * contenedor, monta volúmenes con nombre y secretos como archivo, y comprueba la
 * salud declarada. Devuelve la acción y las razones de deriva explícitas.
 *
 * Invariantes:
 * - recrear el contenedor nunca retira un volumen: el volumen es la verdad
 *   durable y el contenedor es descartable;
 * - el valor de un secreto viaja por stdin a `podman secret create`, nunca en
 *   argv, entorno, inspect ni en un mensaje de error;
 * - un contenedor con ese nombre y otro dueño es una colisión y no se adopta;
 * - `running` no es `ready`: la salud se reporta aparte de crear y arrancar.
 */

import { createHash } from 'node:crypto'

import type { PodmanCommandResult, PodmanExecutor } from './podmanExecutor.js'
import { isLockCollision } from './podmanLockCollision.js'
import type { WorkerPublishedPort } from './workerResourceProfile.js'
import {
  InvalidWorkerContainerSpecError,
  OWNER_ID_LABEL_KEY,
  OWNER_KIND_LABEL_KEY,
  WORKER_CONTAINER_NAME_PREFIX,
  ownerLabelArgv,
  requireValidOwner,
  type ContainerOwner,
} from './workerContainerLifecycle.js'

/** Tipo de recurso: decide la política de nombre, no el mecanismo. */
export type ResourceKind = 'worker' | 'infrastructure'

export type NamedVolumeMount = { volume: string; destination: string; readOnly?: boolean }
export type BindMount = { source: string; destination: string; readOnly: boolean }
/** Un secreto de Podman montado como archivo en `/run/secrets/<target>`. */
export type SecretFileMount = { secret: string; target: string }
export type HealthDeclaration = { command: readonly string[]; timeoutSeconds: number; intervalSeconds: number }
export type ResourceNetwork = { mode: 'host' } | { mode: 'none' } | { mode: 'named'; name: string }
export type RestartPolicy = 'no' | 'on-failure' | 'always'

export type DesiredResource = {
  kind: ResourceKind
  name: string
  owner: ContainerOwner
  image: string
  network: ResourceNetwork
  publishedPorts?: readonly WorkerPublishedPort[]
  namedVolumes?: readonly NamedVolumeMount[]
  bindMounts?: readonly BindMount[]
  /** Sólo valores públicos: un valor igual a un secreto se rehúsa. */
  environment?: Readonly<Record<string, string>>
  secrets?: readonly SecretFileMount[]
  restartPolicy?: RestartPolicy
  command?: readonly string[]
  labels?: Readonly<Record<string, string>>
  health?: HealthDeclaration
  /**
   * La etiqueta con que el dueño marcó a sus contenedores antes de llevar las
   * etiquetas de dueño. Un contenedor con ese nombre que la lleva se migra
   * (se recrea), en vez de tratarse como colisión.
   */
  legacyRoleLabel?: { key: string; value: string }
}

/** Valores de los secretos declarados, por nombre de secreto. Nunca forman parte del `DesiredResource`. */
export type SecretValues = ReadonlyMap<string, string>

export type DriftReason =
  | 'image'
  | 'volume'
  | 'configuration'
  | 'secret-declaration'
  | 'secret-value'
  | 'stale-process'
  | 'health-failure'
  | 'ownership-collision'
  | 'legacy-owner-labels'

/** La deriva de un predecesor del mismo dueño sin etiquetas de dueño. */
export const LEGACY_ROLE_DRIFT: DriftReason = 'legacy-owner-labels'

/** Lo que sustituye a un valor secreto en cualquier texto que la primitiva publica. */
export const SECRET_REDACTION = '<redacted>'

export type EnsureAction = 'created' | 'started' | 'kept' | 'recreated' | 'failed'
export type HealthState = 'healthy' | 'unhealthy' | 'not-declared' | 'not-checked'
export type VolumeState = { volume: string; state: 'created' | 'preserved' }

export type EnsureFailure = { stage: string; message: string; lockCollision: boolean }

export type EnsureOutcome = {
  name: string
  action: EnsureAction
  drift: DriftReason[]
  created: boolean
  started: boolean
  health: HealthState
  volumes: VolumeState[]
  failure?: EnsureFailure
}

export interface ResourceMaterializationDeps {
  podman: PodmanExecutor
  /** La vida se mide sobre el PID real, nunca sobre el estado que reporta Podman. */
  isProcessAlive: (pid: number) => boolean
  sleep: (milliseconds: number) => Promise<void>
}

/** La declaración no es materializable; nombra el campo y no toca Podman. */
export class InvalidDesiredResourceError extends Error {
  readonly field: string

  constructor(field: string, message: string) {
    super(message)
    this.name = 'InvalidDesiredResourceError'
    this.field = field
  }
}


/** Etiqueta con el tipo de recurso: decide la política de nombre al leerlo de vuelta. */
export const RESOURCE_KIND_LABEL_KEY = 'thyrox.resource-kind'
/** Huella de la configuración declarada que no tiene medida directa en `inspect`. */
export const CONFIG_DIGEST_LABEL_KEY = 'thyrox.resource-config-digest'
/** Huella de la declaración de secretos (nombre y destino, nunca el valor). */
export const SECRETS_DIGEST_LABEL_KEY = 'thyrox.resource-secrets-digest'
/** Etiqueta de un secreto de Podman con la huella SHA-256 de su valor. */
export const SECRET_VALUE_DIGEST_LABEL_KEY = 'thyrox.secret-digest'
/** Directorio donde Podman monta un secreto declarado con `type=mount`. */
export const SECRET_MOUNT_DIRECTORY = '/run/secrets'

const SAFE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/
const LOOPBACK_ADDRESS = '127.0.0.1'
const MILLISECONDS_PER_SECOND = 1000
const MISSING_LABEL_VALUE = '<no value>'

type InspectedResource = {
  status: string
  pid: number
  labels: Record<string, string>
  image: string
  volumes: { name: string; destination: string }[]
}

function invalid(field: string, message: string): never {
  throw new InvalidDesiredResourceError(field, message)
}

function requireSafeName(field: string, value: string): void {
  if (!SAFE_NAME_PATTERN.test(value)) invalid(field, `${field} inválido: «${value}»`)
}

function requireNamingPolicy(desired: DesiredResource): void {
  requireSafeName('name', desired.name)
  const workerNamed = desired.name.startsWith(WORKER_CONTAINER_NAME_PREFIX)
  if (desired.kind === 'infrastructure') {
    if (desired.owner.kind !== 'infrastructure') invalid('owner.kind', `la infraestructura la posee el dueño infrastructure, no ${desired.owner.kind}`)
    if (workerNamed) invalid('name', `un recurso de infraestructura no lleva el prefijo de worker: ${desired.name}`)
    return
  }
  if (desired.owner.kind === 'infrastructure') invalid('owner.kind', 'un worker no lo posee el dueño infrastructure')
  if (!workerNamed) invalid('name', `un worker lleva el prefijo ${WORKER_CONTAINER_NAME_PREFIX}: ${desired.name}`)
}

function requireValidOwnerOf(desired: DesiredResource): void {
  try {
    requireValidOwner(desired.owner)
  } catch (error) {
    if (error instanceof InvalidWorkerContainerSpecError) invalid(error.field, error.message)
    throw error
  }
}

function requireNetworkAndPorts(desired: DesiredResource): void {
  const ports = desired.publishedPorts ?? []
  if (desired.network.mode === 'host' && ports.length > 0) invalid('publishedPorts', 'la red del anfitrión no publica puertos: el puerto lo fija el servicio')
  for (const port of ports) {
    if (port.hostAddress !== LOOPBACK_ADDRESS) invalid('publishedPorts', `un puerto sólo se publica en ${LOOPBACK_ADDRESS}`)
  }
  if (desired.network.mode === 'named') requireSafeName('network.name', desired.network.name)
}

function requireMounts(desired: DesiredResource): void {
  for (const mount of desired.namedVolumes ?? []) {
    requireSafeName('namedVolumes.volume', mount.volume)
    if (!mount.destination.startsWith('/')) invalid('namedVolumes.destination', `destino no absoluto: ${mount.destination}`)
  }
  for (const mount of desired.bindMounts ?? []) {
    if (!mount.source.startsWith('/') || !mount.destination.startsWith('/')) invalid('bindMounts', 'un montaje de anfitrión exige rutas absolutas')
  }
}

function requireSecrets(desired: DesiredResource, secrets: SecretValues): void {
  const values = [...secrets.values()].filter(value => value.length > 0)
  for (const mount of desired.secrets ?? []) {
    requireSafeName('secrets.secret', mount.secret)
    requireSafeName('secrets.target', mount.target)
    if (!secrets.get(mount.secret)) invalid('secrets', `el secreto ${mount.secret} está declarado y no tiene valor`)
  }
  for (const [key, value] of Object.entries(desired.environment ?? {})) {
    if (values.some(secret => value.includes(secret))) invalid(`environment.${key}`, `${key} lleva el valor de un secreto: un secreto se monta como archivo, no viaja como entorno`)
  }
}

/** Valida la declaración entera antes de tocar Podman; rehúsa nombrando el campo. */
export function validateDesiredResource(desired: DesiredResource, secrets: SecretValues): void {
  requireValidOwnerOf(desired)
  requireNamingPolicy(desired)
  if (!desired.image) invalid('image', 'la imagen no puede estar vacía')
  requireNetworkAndPorts(desired)
  requireMounts(desired)
  requireSecrets(desired, secrets)
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

function sortedRecord(record: Readonly<Record<string, string>> | undefined): [string, string][] {
  return Object.entries(record ?? {}).sort(([a], [b]) => a.localeCompare(b))
}

/** Huella de lo que no tiene medida directa en `inspect`: red, puertos, montajes de anfitrión, entorno, reinicio, comando y etiquetas propias. */
export function configDigest(desired: DesiredResource): string {
  return sha256(JSON.stringify({
    network: desired.network,
    publishedPorts: desired.publishedPorts ?? [],
    bindMounts: desired.bindMounts ?? [],
    environment: sortedRecord(desired.environment),
    restartPolicy: desired.restartPolicy ?? null,
    command: desired.command ?? [],
    labels: sortedRecord(desired.labels),
  }))
}

export function secretsDeclarationDigest(desired: DesiredResource): string {
  return sha256(JSON.stringify((desired.secrets ?? []).map(mount => [mount.secret, mount.target])))
}

/** Sustituye cada valor secreto por `SECRET_REDACTION` en un texto que la primitiva va a publicar. */
export function redactSecrets(text: string, secrets: SecretValues): string {
  let redacted = text
  for (const value of secrets.values()) {
    if (value.length > 0) redacted = redacted.split(value).join(SECRET_REDACTION)
  }
  return redacted
}

function labelArgv(key: string, value: string): string[] {
  return ['--label', `${key}=${value}`]
}

function networkArgv(network: ResourceNetwork): string[] {
  return ['--network', network.mode === 'named' ? network.name : network.mode]
}

function volumeMountArgv(mount: NamedVolumeMount): string[] {
  return ['--mount', `type=volume,source=${mount.volume},destination=${mount.destination}${mount.readOnly ? ',ro' : ''}`]
}

function bindMountArgv(mount: BindMount): string[] {
  return ['--mount', `type=bind,source=${mount.source},destination=${mount.destination}${mount.readOnly ? ',ro' : ''}`]
}

/** Traduce una declaración validada al argv de `podman create`. Nunca contiene un valor secreto. */
export function createResourceArgv(desired: DesiredResource): string[] {
  return [
    'create',
    '--name', desired.name,
    ...ownerLabelArgv(desired.owner),
    ...labelArgv(RESOURCE_KIND_LABEL_KEY, desired.kind),
    ...labelArgv(CONFIG_DIGEST_LABEL_KEY, configDigest(desired)),
    ...labelArgv(SECRETS_DIGEST_LABEL_KEY, secretsDeclarationDigest(desired)),
    ...sortedRecord(desired.labels).flatMap(([key, value]) => labelArgv(key, value)),
    ...(desired.restartPolicy ? [`--restart=${desired.restartPolicy}`] : []),
    ...networkArgv(desired.network),
    ...(desired.publishedPorts ?? []).flatMap(port => ['-p', `${port.hostAddress}:${port.hostPort}:${port.containerPort}`]),
    ...(desired.namedVolumes ?? []).flatMap(volumeMountArgv),
    ...(desired.bindMounts ?? []).flatMap(bindMountArgv),
    ...sortedRecord(desired.environment).flatMap(([key, value]) => ['-e', `${key}=${value}`]),
    ...(desired.secrets ?? []).flatMap(mount => ['--secret', `${mount.secret},type=mount,target=${mount.target}`]),
    desired.image,
    ...(desired.command ?? []),
  ]
}

type PodmanDocument = {
  State?: { Status?: string; Pid?: number }
  Config?: { Labels?: Record<string, string> | null; Image?: string }
  ImageName?: string
  Mounts?: { Type?: string; Name?: string; Destination?: string }[]
}

async function inspectResource(deps: ResourceMaterializationDeps, name: string): Promise<InspectedResource | null> {
  const result = await deps.podman.run(['container', 'inspect', name])
  if (result.exitCode !== 0) return null
  const [document] = JSON.parse(result.stdout) as PodmanDocument[]
  return {
    status: document?.State?.Status ?? '',
    pid: document?.State?.Pid ?? 0,
    labels: document?.Config?.Labels ?? {},
    image: document?.Config?.Image || document?.ImageName || '',
    volumes: (document?.Mounts ?? [])
      .filter(mount => mount.Type === 'volume')
      .map(mount => ({ name: mount.Name ?? '', destination: mount.Destination ?? '' })),
  }
}

type Ownership = 'owned' | 'legacy' | 'foreign'

function ownershipOf(existing: InspectedResource, desired: DesiredResource): Ownership {
  const kind = existing.labels[OWNER_KIND_LABEL_KEY]
  const id = existing.labels[OWNER_ID_LABEL_KEY]
  if (kind === desired.owner.kind && id === desired.owner.id) return 'owned'
  const legacy = desired.legacyRoleLabel
  const unlabeled = kind === undefined || kind === '' || kind === MISSING_LABEL_VALUE
  if (unlabeled && legacy && existing.labels[legacy.key] === legacy.value) return 'legacy'
  return 'foreign'
}

function volumeKey(volume: string, destination: string): string {
  return `${volume}\u0000${destination}`
}

function volumesDrifted(existing: InspectedResource, desired: DesiredResource): boolean {
  const mounted = existing.volumes.map(mount => volumeKey(mount.name, mount.destination)).sort()
  const declared = (desired.namedVolumes ?? []).map(mount => volumeKey(mount.volume, mount.destination)).sort()
  return JSON.stringify(mounted) !== JSON.stringify(declared)
}

/** Etiqueta que Podman añade a una referencia sin etiqueta ni digest al guardarla. */
const DEFAULT_IMAGE_TAG = 'latest'

/**
 * La referencia tal como Podman la guarda en el contenedor: una sin etiqueta ni
 * digest queda con `:latest` (medido en 4.9.3 sobre una imagen local); una
 * calificada y etiquetada queda igual.
 */
export function normalizeImageReference(reference: string): string {
  if (reference.includes('@')) return reference
  const lastSegment = reference.slice(reference.lastIndexOf('/') + 1)
  return lastSegment.includes(':') ? reference : `${reference}:${DEFAULT_IMAGE_TAG}`
}

function driftOf(existing: InspectedResource, desired: DesiredResource, secretReplaced: boolean): DriftReason[] {
  const drift: DriftReason[] = []
  if (normalizeImageReference(existing.image) !== normalizeImageReference(desired.image)) drift.push('image')
  if (volumesDrifted(existing, desired)) drift.push('volume')
  if (existing.labels[CONFIG_DIGEST_LABEL_KEY] !== configDigest(desired)) drift.push('configuration')
  if (existing.labels[SECRETS_DIGEST_LABEL_KEY] !== secretsDeclarationDigest(desired)) drift.push('secret-declaration')
  if (secretReplaced) drift.push('secret-value')
  return drift
}

class MaterializationStepError extends Error {
  constructor(readonly stage: string, readonly result: PodmanCommandResult) {
    super(stage)
  }
}

async function step(deps: ResourceMaterializationDeps, stage: string, args: readonly string[], stdin?: string): Promise<PodmanCommandResult> {
  const result = await deps.podman.run(args, stdin === undefined ? undefined : { stdin })
  if (result.exitCode !== 0) throw new MaterializationStepError(stage, result)
  return result
}

async function ensureNetwork(deps: ResourceMaterializationDeps, network: ResourceNetwork): Promise<void> {
  if (network.mode !== 'named') return
  const exists = await deps.podman.run(['network', 'exists', network.name])
  if (exists.exitCode !== 0) await step(deps, 'network', ['network', 'create', network.name])
}

async function ensureVolumes(deps: ResourceMaterializationDeps, desired: DesiredResource): Promise<VolumeState[]> {
  const states: VolumeState[] = []
  for (const mount of desired.namedVolumes ?? []) {
    const exists = await deps.podman.run(['volume', 'exists', mount.volume])
    if (exists.exitCode === 0) {
      states.push({ volume: mount.volume, state: 'preserved' })
      continue
    }
    await step(deps, 'volume', ['volume', 'create', mount.volume])
    states.push({ volume: mount.volume, state: 'created' })
  }
  return states
}

export type SecretOutcome = 'created' | 'replaced' | 'unchanged'

/**
 * Asegura un secreto de Podman con su valor. El valor viaja sólo por stdin a
 * `podman secret create`; el secreto lleva el sha256 del valor en una etiqueta,
 * y si ya existe con el mismo digest no se toca.
 */
export async function ensureSecretValue(deps: Pick<ResourceMaterializationDeps, 'podman'>, name: string, value: string): Promise<SecretOutcome> {
  const digest = sha256(value)
  const inspected = await deps.podman.run(['secret', 'inspect', '--format', `{{index .Spec.Labels "${SECRET_VALUE_DIGEST_LABEL_KEY}"}}`, name])
  if (inspected.exitCode === 0 && inspected.stdout.trim() === digest) return 'unchanged'
  const replace = inspected.exitCode === 0 ? ['--replace'] : []
  await step(deps as ResourceMaterializationDeps, 'secret', ['secret', 'create', ...replace, '--label', `${SECRET_VALUE_DIGEST_LABEL_KEY}=${digest}`, name, '-'], value)
  return inspected.exitCode === 0 ? 'replaced' : 'created'
}

/** Asegura cada secreto declarado con su valor; devuelve si alguno existía con otro valor y se reemplazó. */
async function ensureSecrets(deps: ResourceMaterializationDeps, desired: DesiredResource, secrets: SecretValues): Promise<boolean> {
  let replaced = false
  for (const mount of desired.secrets ?? []) {
    replaced = (await ensureSecretValue(deps, mount.secret, secrets.get(mount.secret) ?? '')) === 'replaced' || replaced
  }
  return replaced
}


/** Corre la salud declarada hasta que responde 0 o vence su plazo; nunca la infiere del estado de Podman. */
async function awaitHealthy(deps: ResourceMaterializationDeps, desired: DesiredResource, health: HealthDeclaration): Promise<PodmanCommandResult | null> {
  const attempts = Math.max(1, Math.ceil(health.timeoutSeconds / health.intervalSeconds))
  let last: PodmanCommandResult | null = null
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    last = await deps.podman.run(['exec', desired.name, ...health.command])
    if (last.exitCode === 0) return null
    if (attempt + 1 < attempts) await deps.sleep(health.intervalSeconds * MILLISECONDS_PER_SECOND)
  }
  return last
}

function describeResult(result: PodmanCommandResult): string {
  return [result.stderr.trim(), result.stdout.trim()].filter(text => text.length > 0).join(' | ') || `exit ${result.exitCode}`
}

function failureOf(stage: string, result: PodmanCommandResult, secrets: SecretValues): EnsureFailure {
  const text = `${result.stderr}\n${result.stdout}`
  return { stage, message: redactSecrets(describeResult(result), secrets), lockCollision: isLockCollision(text) }
}

type Plan = { action: Exclude<EnsureAction, 'failed'>; drift: DriftReason[]; recreate: boolean; create: boolean; start: boolean }

function planFor(existing: InspectedResource | null, ownership: Ownership, desired: DesiredResource, secretReplaced: boolean, isAlive: (pid: number) => boolean): Plan {
  if (!existing) return { action: 'created', drift: [], recreate: false, create: true, start: true }
  if (ownership === 'legacy') return { action: 'recreated', drift: [LEGACY_ROLE_DRIFT], recreate: true, create: true, start: true }
  const drift = driftOf(existing, desired, secretReplaced)
  if (drift.length > 0) return { action: 'recreated', drift, recreate: true, create: true, start: true }
  const alive = existing.status === 'running' && existing.pid > 0 && isAlive(existing.pid)
  if (alive) return { action: 'kept', drift: [], recreate: false, create: false, start: false }
  if (existing.status === 'running') return { action: 'recreated', drift: ['stale-process'], recreate: true, create: true, start: true }
  return { action: 'started', drift: [], recreate: false, create: false, start: true }
}

/**
 * Converge un recurso hacia su declaración. Valida antes de tocar Podman
 * (rehúsa con `InvalidDesiredResourceError`); el resto de fallos vuelven como
 * `failed` con su etapa y un mensaje sin valores secretos.
 */
export async function ensureResource(
  deps: ResourceMaterializationDeps,
  desired: DesiredResource,
  secrets: SecretValues,
): Promise<EnsureOutcome> {
  validateDesiredResource(desired, secrets)
  const outcome: EnsureOutcome = { name: desired.name, action: 'failed', drift: [], created: false, started: false, health: 'not-checked', volumes: [] }
  const existing = await inspectResource(deps, desired.name)
  const ownership = existing ? ownershipOf(existing, desired) : 'owned'
  if (ownership === 'foreign') return { ...outcome, drift: ['ownership-collision'] }
  try {
    await ensureNetwork(deps, desired.network)
    outcome.volumes = await ensureVolumes(deps, desired)
    const secretReplaced = await ensureSecrets(deps, desired, secrets)
    const plan = planFor(existing, ownership, desired, secretReplaced, deps.isProcessAlive)
    outcome.drift = plan.drift
    if (plan.recreate) await step(deps, 'remove', ['rm', '--force', desired.name])
    if (plan.create) {
      await step(deps, 'create', createResourceArgv(desired))
      outcome.created = true
    }
    if (plan.start) {
      await step(deps, 'start', ['start', desired.name])
      outcome.started = true
    }
    outcome.action = plan.action
  } catch (error) {
    if (error instanceof MaterializationStepError) return { ...outcome, action: 'failed', failure: failureOf(error.stage, error.result, secrets) }
    throw error
  }
  if (!desired.health) return { ...outcome, health: 'not-declared' }
  const unhealthy = await awaitHealthy(deps, desired, desired.health)
  if (!unhealthy) return { ...outcome, health: 'healthy' }
  return {
    ...outcome,
    action: 'failed',
    health: 'unhealthy',
    drift: [...outcome.drift, 'health-failure'],
    failure: failureOf('health', unhealthy, secrets),
  }
}
