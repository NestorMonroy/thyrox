/**
 * Contrato del perfil de límites de recursos de un worker de Podman
 * (ADR-THYROX-007 Regla 2, TASK-THYROX-0615).
 *
 * Cada bandera que este módulo compone ya se midió contra su control en
 * `src/lib/podman_capabilities.sh` (`--pids-limit`, `--memory`, `--cpus`,
 * `--network none`, `--read-only`, montajes `:ro`). Aquí sólo vive el
 * CONTRATO del perfil —su validación y su traducción a argv—, nunca la
 * ejecución: el `PodmanWorkerManager` que crea y lanza contenedores es
 * trabajo futuro, no de este archivo.
 */

export type WorkerNetworkMode = 'none' | 'bridge'
export type WorkerMountMode = 'ro' | 'rw'

export type WorkerResourceMount = {
  source: string
  destination: string
  mode: WorkerMountMode
}

export type WorkerResourceProfile = {
  cpus: number
  memoryMib: number
  pidsLimit: number
  network: WorkerNetworkMode
  readOnlyRootfs: boolean
  mounts: WorkerResourceMount[]
}

const KNOWN_NETWORK_MODES: readonly WorkerNetworkMode[] = ['none', 'bridge']
const KNOWN_MOUNT_MODES: readonly WorkerMountMode[] = ['ro', 'rw']

/**
 * El perfil más restrictivo medido: sin red, rootfs de sólo lectura, sin
 * montajes declarados. Relajar cualquiera de los tres es explícito en el
 * perfil que se declare — nunca el default silencioso.
 */
export const DEFAULT_WORKER_RESOURCE_PROFILE: WorkerResourceProfile = {
  cpus: 1,
  memoryMib: 1024,
  pidsLimit: 128,
  network: 'none',
  readOnlyRootfs: true,
  mounts: [],
}

/** Un campo del perfil no pasó su validación; nombra el campo, nunca lo omite en silencio. */
export class InvalidWorkerResourceProfileError extends Error {
  readonly field: string

  constructor(field: string, message: string) {
    super(message)
    this.name = 'InvalidWorkerResourceProfileError'
    this.field = field
  }
}

function requirePositiveNumber(field: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new InvalidWorkerResourceProfileError(field, `${field} debe ser un número > 0, recibido: ${value}`)
  }
}

function requirePositiveInteger(field: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new InvalidWorkerResourceProfileError(field, `${field} debe ser un entero >= 1, recibido: ${value}`)
  }
}

function requireKnownNetwork(network: WorkerNetworkMode): void {
  if (!KNOWN_NETWORK_MODES.includes(network)) {
    throw new InvalidWorkerResourceProfileError('network', `red desconocida: ${network}`)
  }
}

function requireValidMount(mount: WorkerResourceMount, index: number): void {
  const field = `mounts[${index}]`
  if (!mount.source) {
    throw new InvalidWorkerResourceProfileError(`${field}.source`, 'el origen del montaje no puede estar vacío')
  }
  if (!mount.destination.startsWith('/')) {
    throw new InvalidWorkerResourceProfileError(
      `${field}.destination`,
      `el destino del montaje debe ser una ruta absoluta, recibido: ${mount.destination}`,
    )
  }
  if (!KNOWN_MOUNT_MODES.includes(mount.mode)) {
    throw new InvalidWorkerResourceProfileError(`${field}.mode`, `modo de montaje desconocido: ${mount.mode}`)
  }
}

/** Valida el perfil completo; rehúsa en el primer campo inválido, nombrándolo. */
export function validateWorkerResourceProfile(profile: WorkerResourceProfile): void {
  requirePositiveNumber('cpus', profile.cpus)
  requirePositiveNumber('memoryMib', profile.memoryMib)
  requirePositiveInteger('pidsLimit', profile.pidsLimit)
  requireKnownNetwork(profile.network)
  profile.mounts.forEach((mount, index) => requireValidMount(mount, index))
}

function cpuLimitArgv(cpus: number): string[] {
  return ['--cpus', String(cpus)]
}

function memoryLimitArgv(memoryMib: number): string[] {
  return ['--memory', `${memoryMib}m`]
}

function pidsLimitArgv(pidsLimit: number): string[] {
  return ['--pids-limit', String(pidsLimit)]
}

function networkArgv(network: WorkerNetworkMode): string[] {
  return ['--network', network]
}

function rootfsArgv(readOnlyRootfs: boolean): string[] {
  return readOnlyRootfs ? ['--read-only', '--read-only-tmpfs=false'] : []
}

function mountArgv(mount: WorkerResourceMount): string[] {
  return ['-v', `${mount.source}:${mount.destination}:${mount.mode}`]
}

/**
 * Traduce un perfil validado al argv de límites para `podman create`/`run`
 * — no ejecuta nada, sólo compone el argv (mismo contrato que
 * `thyrox_infrastructure_create_argv` en `src/lib/infrastructure.sh`: un
 * perfil inválido rehúsa antes de emitir ningún argumento).
 */
export function workerResourceLimitArgv(profile: WorkerResourceProfile): string[] {
  validateWorkerResourceProfile(profile)
  return [
    ...cpuLimitArgv(profile.cpus),
    ...memoryLimitArgv(profile.memoryMib),
    ...pidsLimitArgv(profile.pidsLimit),
    ...networkArgv(profile.network),
    ...rootfsArgv(profile.readOnlyRootfs),
    ...profile.mounts.flatMap(mountArgv),
  ]
}
