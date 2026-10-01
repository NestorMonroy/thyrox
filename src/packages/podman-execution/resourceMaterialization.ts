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

import type { PodmanExecutor } from './podmanExecutor.js'
import type { WorkerPublishedPort } from './workerResourceProfile.js'
import type { ContainerOwner } from './workerContainerLifecycle.js'

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

export async function ensureResource(
  _deps: ResourceMaterializationDeps,
  _desired: DesiredResource,
  _secrets: SecretValues,
): Promise<EnsureOutcome> {
  throw new Error('ensureResource: sin implementar')
}
