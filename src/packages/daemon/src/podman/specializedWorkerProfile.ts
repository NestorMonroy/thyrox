/**
 * Perfil de worker especializado de Podman (ADR-THYROX-007 Regla 2-bis,
 * TASK-THYROX-0614): imagen versionada y reproducible —Python, Torch y CUDA
 * fijados por su versión exacta— que ejecuta Thyrox desde `dist/` con sus
 * recursos de runtime (H-THYROX-263: cada recurso que un módulo resuelve
 * relativo a sí mismo queda emitido junto a su `.js`, así que el mecanismo
 * de build copia el árbol `dist/` COMPLETO, nunca un archivo suelto).
 *
 * A diferencia de `repositoryJobProfile.ts` —que opera SOBRE el árbol del
 * anfitrión con un montaje overlay en tiempo de ejecución—, un worker
 * especializado (semantic_search_worker es el primero) es un servicio: su
 * `dist/` se copia DENTRO de la imagen al construirla (`COPY . <ruta>`), no
 * se monta en cada arranque. Por construcción, este módulo nunca compone
 * `--rootfs` ni un montaje `:O`: `distHostPath` es el CONTEXTO de build, no
 * un volumen de contenedor, y `specializedWorkerProfileArgv` reutiliza sólo
 * los límites de `workerResourceProfile.ts`, sin montajes propios.
 *
 * Sólo el mecanismo de build y de fijación de versiones vive aquí. El
 * modelo de búsqueda semántica y sus dimensiones quedan fuera —esperan a
 * D5— y no tienen campo en `SpecializedWorkerProfile`.
 */

import {
  DEFAULT_WORKER_RESOURCE_PROFILE,
  InvalidWorkerResourceProfileError,
  validateWorkerResourceProfile,
  workerResourceLimitArgv,
  type WorkerResourceProfile,
} from './workerResourceProfile.js'

/** Ruta fija, dentro de la imagen, donde el build copia el árbol `dist/`. */
export const SPECIALIZED_WORKER_DIST_PATH = '/opt/thyrox/dist'

/** Registro por defecto de las imágenes de worker especializado — sobreescribible por parámetro, nunca por edición. */
export const DEFAULT_SPECIALIZED_WORKER_REGISTRY = 'docker.io/thyrox'

const WORKER_KIND_PATTERN = /^[a-z][a-z0-9-]*$/
const RUNTIME_VERSION_PATTERN = /^[0-9]+(\.[0-9]+){1,2}$/

/** Versiones fijadas del stack de aprendizaje automático que la imagen pin: nunca `latest`, siempre un número exacto. */
export type SpecializedWorkerRuntimeStack = {
  pythonVersion: string
  torchVersion: string
  cudaVersion: string
}

export type SpecializedWorkerProfile = {
  workerKind: string
  runtimeStack: SpecializedWorkerRuntimeStack
  /** Árbol `dist/` en el anfitrión — es el CONTEXTO de `podman build`, no un montaje de `podman run`. */
  distHostPath: string
  /** Ruta del entrypoint de Thyrox, relativa a `dist/` dentro de la imagen. */
  entryRelativePath: string
  resources: WorkerResourceProfile
}

/** El perfil por defecto: límites más restrictivos de `workerResourceProfile.ts`, sin montajes. */
export function createSpecializedWorkerProfile(
  workerKind: string,
  runtimeStack: SpecializedWorkerRuntimeStack,
  distHostPath: string,
  entryRelativePath: string,
): SpecializedWorkerProfile {
  return { workerKind, runtimeStack, distHostPath, entryRelativePath, resources: DEFAULT_WORKER_RESOURCE_PROFILE }
}

function requireValidWorkerKind(workerKind: string): void {
  if (!WORKER_KIND_PATTERN.test(workerKind)) {
    throw new InvalidWorkerResourceProfileError('workerKind', `identificador de worker especializado inválido: ${workerKind}`)
  }
}

function requireValidRuntimeVersion(field: string, value: string): void {
  if (!RUNTIME_VERSION_PATTERN.test(value)) {
    throw new InvalidWorkerResourceProfileError(field, `${field} debe ser una versión numérica fijada (ej. 3.11), recibido: ${value}`)
  }
}

function requireAbsoluteDistHostPath(distHostPath: string): void {
  if (!distHostPath.startsWith('/')) {
    throw new InvalidWorkerResourceProfileError('distHostPath', `debe ser una ruta absoluta, recibido: ${distHostPath}`)
  }
}

/** La raíz del anfitrión como contexto de build es el equivalente, para este mecanismo, de `--rootfs /:O` — nunca se acepta. */
function requireDistHostPathNotRoot(distHostPath: string): void {
  if (distHostPath === '/') {
    throw new InvalidWorkerResourceProfileError('distHostPath', 'distHostPath no puede ser la raíz del anfitrión (equivalente a --rootfs /)')
  }
}

function requireNonEmptyEntryPath(entryRelativePath: string): void {
  if (!entryRelativePath) {
    throw new InvalidWorkerResourceProfileError('entryRelativePath', 'entryRelativePath no puede estar vacío')
  }
}

function requireEntryPathNotAbsolute(entryRelativePath: string): void {
  if (entryRelativePath.startsWith('/')) {
    throw new InvalidWorkerResourceProfileError('entryRelativePath', `debe ser relativa a dist/, no absoluta: ${entryRelativePath}`)
  }
}

function requireEntryPathHasNoParentSegment(entryRelativePath: string): void {
  if (entryRelativePath.split('/').includes('..')) {
    throw new InvalidWorkerResourceProfileError('entryRelativePath', `no puede salir de dist/ con '..': ${entryRelativePath}`)
  }
}

/** Valida el perfil completo; rehúsa en el primer campo inválido, nombrándolo. */
export function validateSpecializedWorkerProfile(profile: SpecializedWorkerProfile): void {
  requireValidWorkerKind(profile.workerKind)
  requireValidRuntimeVersion('runtimeStack.pythonVersion', profile.runtimeStack.pythonVersion)
  requireValidRuntimeVersion('runtimeStack.torchVersion', profile.runtimeStack.torchVersion)
  requireValidRuntimeVersion('runtimeStack.cudaVersion', profile.runtimeStack.cudaVersion)
  requireAbsoluteDistHostPath(profile.distHostPath)
  requireDistHostPathNotRoot(profile.distHostPath)
  requireNonEmptyEntryPath(profile.entryRelativePath)
  requireEntryPathNotAbsolute(profile.entryRelativePath)
  requireEntryPathHasNoParentSegment(profile.entryRelativePath)
  validateWorkerResourceProfile(profile.resources)
}

/** El mecanismo de fijación: la etiqueta de la imagen deriva de las tres versiones, nunca se escribe a mano. */
export function specializedWorkerRuntimeTag(runtimeStack: SpecializedWorkerRuntimeStack): string {
  return `py${runtimeStack.pythonVersion}-torch${runtimeStack.torchVersion}-cuda${runtimeStack.cudaVersion}`
}

export function specializedWorkerImageReference(
  workerKind: string,
  runtimeStack: SpecializedWorkerRuntimeStack,
  registry: string = DEFAULT_SPECIALIZED_WORKER_REGISTRY,
): string {
  return `${registry}/${workerKind}-worker:${specializedWorkerRuntimeTag(runtimeStack)}`
}

function baseImageInstruction(cudaVersion: string): string {
  return `FROM docker.io/nvidia/cuda:${cudaVersion}-runtime-ubuntu22.04`
}

function pythonTorchInstallInstructions(pythonVersion: string, torchVersion: string): string[] {
  return [
    'RUN apt-get update \\',
    `    && apt-get install -y --no-install-recommends curl ca-certificates python${pythonVersion} python3-pip \\`,
    '    && rm -rf /var/lib/apt/lists/*',
    `RUN python${pythonVersion} -m pip install --no-cache-dir torch==${torchVersion}`,
  ]
}

/** Bun no lleva versión fijada aquí: `thyrox_toolchain_require_bun` no fija ninguna (medido, `src/lib/toolchain.sh`). */
function bunRuntimeInstallInstructions(): string[] {
  return ['RUN curl -fsSL https://bun.sh/install | bash', 'ENV PATH="/root/.bun/bin:${PATH}"']
}

function distCopyInstructions(): string[] {
  return [`COPY . ${SPECIALIZED_WORKER_DIST_PATH}`, `WORKDIR ${SPECIALIZED_WORKER_DIST_PATH}`]
}

function entrypointInstruction(entryRelativePath: string, workerKind: string): string {
  const entryPath = `${SPECIALIZED_WORKER_DIST_PATH}/${entryRelativePath}`
  return `ENTRYPOINT ["bun", "${entryPath}", "--daemon-worker=${workerKind}"]`
}

/**
 * Compone el `Containerfile` de un worker especializado — texto puro, nunca
 * escrito a disco ni construido por este módulo: quien invoca decide cuándo
 * y dónde. `distHostPath` se copia entero como contexto de build para que
 * cada recurso de runtime (H-THYROX-263) llegue junto a su `.js`.
 */
export function specializedWorkerContainerfile(profile: SpecializedWorkerProfile): string {
  validateSpecializedWorkerProfile(profile)
  const { runtimeStack, entryRelativePath, workerKind } = profile
  const lines = [
    baseImageInstruction(runtimeStack.cudaVersion),
    ...pythonTorchInstallInstructions(runtimeStack.pythonVersion, runtimeStack.torchVersion),
    ...bunRuntimeInstallInstructions(),
    ...distCopyInstructions(),
    entrypointInstruction(entryRelativePath, workerKind),
  ]
  return `${lines.join('\n')}\n`
}

/** Traduce un perfil validado al argv de `podman build` — contexto `distHostPath`, imagen fijada por `specializedWorkerImageReference`. */
export function specializedWorkerBuildArgv(profile: SpecializedWorkerProfile, containerfileHostPath: string): string[] {
  validateSpecializedWorkerProfile(profile)
  return [
    'build',
    '-f', containerfileHostPath,
    '-t', specializedWorkerImageReference(profile.workerKind, profile.runtimeStack),
    profile.distHostPath,
  ]
}

/**
 * Traduce un perfil validado al argv de límites de `podman create`/`run` —
 * sólo los de `workerResourceProfile.ts`: el `dist/` ya vive dentro de la
 * imagen, así que este perfil no añade ningún montaje propio.
 */
export function specializedWorkerProfileArgv(profile: SpecializedWorkerProfile): string[] {
  validateSpecializedWorkerProfile(profile)
  return workerResourceLimitArgv(profile.resources)
}
