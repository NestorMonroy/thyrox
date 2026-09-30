/**
 * Perfil repository/job de un worker de Podman (ADR-THYROX-007 Regla 2-bis,
 * TASK-THYROX-0613).
 *
 * Un worker repository/job trabaja SOBRE el repositorio: el árbol del
 * anfitrión se monta `overlay` (`:O`) en `/w` — el worker lee el árbol y sus
 * escrituras no llegan al anfitrión, medido en `overlay_mount`
 * (`src/lib/podman_capabilities.sh`). Reutiliza el perfil de límites de
 * `workerResourceProfile.ts` para CPU, memoria, PIDs, red y rootfs; aquí
 * sólo se añade el montaje del repositorio y la credencial declarada.
 *
 * `--rootfs /:O` (overlay de la raíz completa, no sólo del repositorio)
 * queda deliberadamente SIN modelar: la sonda `overlay_mount` mide un
 * directorio propio, no `/`, y modelarlo sin esa medida sería declarar una
 * capacidad no comprobada. Es opción evaluada, no default (decisión del
 * ejecutor) — se modela cuando se mida.
 */

import {
  DEFAULT_WORKER_RESOURCE_PROFILE,
  InvalidWorkerResourceProfileError,
  validateWorkerResourceProfile,
  workerResourceLimitArgv,
  type WorkerResourceProfile,
} from './workerResourceProfile.js'

/** Destino fijo del montaje overlay del repositorio, por ADR-THYROX-007 Regla 2-bis. */
export const REPOSITORY_CONTAINER_PATH = '/w'

/**
 * Nombre de una credencial declarada en el perfil — NUNCA su valor: el tipo
 * no tiene campo para el valor, así que no hay forma de que este perfil lo
 * transporte por error.
 */
export type RepositoryJobCredential = {
  name: string
  target: string
}

export type RepositoryJobProfile = {
  repositoryHostPath: string
  credential?: RepositoryJobCredential
  resources: WorkerResourceProfile
}

/**
 * Ningún mecanismo mide hoy `efectivo` en la capacidad `credential_injection`
 * de `src/lib/podman_capabilities.sh`: tanto `--env NAME` como
 * `--secret NAME,type=env,target=NAME` entregan el valor al proceso, pero
 * los dos lo dejan visible en `podman inspect` una vez que el contenedor
 * corrió (medido 2026-09-29: `Config.Env` conserva el valor resuelto). El
 * perfil rehúsa declarar la credencial en vez de exponerla en silencio.
 */
export class UnsupportedRepositoryJobCredentialError extends Error {
  readonly credentialName: string

  constructor(credentialName: string) {
    super(
      `la credencial '${credentialName}' no se declara: ni --env ni --secret miden efectivo hoy en ` +
        "'credential_injection' (src/lib/podman_capabilities.sh) — los dos exponen el valor en " +
        "'podman inspect' tras ejecutar el contenedor.",
    )
    this.name = 'UnsupportedRepositoryJobCredentialError'
    this.credentialName = credentialName
  }
}

/** El perfil más restrictivo medido: sin credencial, límites por defecto de `workerResourceProfile.ts`. */
export function createRepositoryJobProfile(repositoryHostPath: string): RepositoryJobProfile {
  return {
    repositoryHostPath,
    resources: DEFAULT_WORKER_RESOURCE_PROFILE,
  }
}

function requireAbsoluteHostPath(repositoryHostPath: string): void {
  if (!repositoryHostPath.startsWith('/')) {
    throw new InvalidWorkerResourceProfileError(
      'repositoryHostPath',
      `debe ser una ruta absoluta, recibido: ${repositoryHostPath}`,
    )
  }
}

/** Valida el perfil completo; rehúsa en el primer campo inválido, nombrándolo. */
export function validateRepositoryJobProfile(profile: RepositoryJobProfile): void {
  requireAbsoluteHostPath(profile.repositoryHostPath)
  if (profile.credential) {
    throw new UnsupportedRepositoryJobCredentialError(profile.credential.name)
  }
  validateWorkerResourceProfile(profile.resources)
}

function repositoryOverlayMountArgv(repositoryHostPath: string): string[] {
  return ['-v', `${repositoryHostPath}:${REPOSITORY_CONTAINER_PATH}:O`]
}

/**
 * Traduce un perfil validado al argv completo de `podman create`/`run`
 * —límites + montaje overlay del repositorio— sin ejecutar nada.
 */
export function repositoryJobProfileArgv(profile: RepositoryJobProfile): string[] {
  validateRepositoryJobProfile(profile)
  return [...workerResourceLimitArgv(profile.resources), ...repositoryOverlayMountArgv(profile.repositoryHostPath)]
}
