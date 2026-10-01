/**
 * El almacén local de imágenes del runtime (ADR-THYROX-007, TASK-THYROX-0725):
 * construir con etiquetas, saber si una imagen está, listar por etiqueta y
 * retirar una imagen.
 *
 * La primitiva no da significado a ninguna etiqueta. Qué imagen es efímera,
 * de caché o permanente, y cuándo se retira, lo decide quien la declaró al
 * construirla; aquí sólo se guarda, se filtra y se borra lo que se pide.
 */
import type { PodmanCommandResult, PodmanExecutor } from './podmanExecutor.js'

export type StoredImage = {
  id: string
  names: string[]
  labels: Record<string, string>
  /** Instante de creación, en segundos Unix. */
  createdAt: number
  sizeBytes: number
}

export type ImageBuild = {
  context: string
  /** Ruta del Containerfile; sin ella, el del contexto. */
  containerfile?: string
  tag: string
  labels: Readonly<Record<string, string>>
  /** Red de los RUN; `host` sólo cuando el único egreso es el proxy del anfitrión. */
  network?: 'host'
  /** Argumentos públicos de construcción; una credencial no viaja aquí. */
  buildArgs?: Readonly<Record<string, string>>
  /** Archivos del anfitrión visibles en los RUN, siempre de sólo lectura (la CA del proxy). */
  readOnlyMounts?: readonly { source: string; destination: string }[]
}

export class ImageStoreError extends Error {
  constructor(operation: string, subject: string, result: PodmanCommandResult) {
    super(`falló ${operation} sobre ${subject}: ${result.stderr.trim() || `exit ${result.exitCode}`}`)
    this.name = 'ImageStoreError'
  }
}

type ListedImage = { Id: string; Names?: string[] | null; Labels?: Record<string, string> | null; Created: number; Size: number }

function labelArgs(labels: Readonly<Record<string, string>>): string[] {
  return Object.entries(labels).flatMap(([key, value]) => ['--label', `${key}=${value}`])
}

const CREDENTIAL_NAME_PATTERN = /(TOKEN|SECRET|PASSWORD|PASSWD|KEY|CREDENTIAL)/i

/** La construcción no se puede componer; nombra el argumento. */
export class InvalidImageBuildError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidImageBuildError'
  }
}

function buildEnvironmentArgs(build: ImageBuild): string[] {
  const credentials = Object.keys(build.buildArgs ?? {}).filter(name => CREDENTIAL_NAME_PATTERN.test(name))
  if (credentials.length > 0) {
    throw new InvalidImageBuildError(`${credentials.join(', ')} nombra una credencial y quedaría en la historia de la imagen`)
  }
  const network = build.network === undefined ? [] : ['--network', build.network]
  const buildArgs = Object.entries(build.buildArgs ?? {}).flatMap(([name, value]) => ['--build-arg', `${name}=${value}`])
  const mounts = (build.readOnlyMounts ?? []).flatMap(mount => ['-v', `${mount.source}:${mount.destination}:ro`])
  return [...network, ...buildArgs, ...mounts]
}

/** Construye una imagen con sus etiquetas y devuelve su id. */
export async function buildImage(podman: PodmanExecutor, build: ImageBuild): Promise<string> {
  const containerfile = build.containerfile === undefined ? [] : ['-f', build.containerfile]
  const result = await podman.run(['build', ...labelArgs(build.labels), ...buildEnvironmentArgs(build), ...containerfile, '-t', build.tag, build.context])
  if (result.exitCode !== 0) throw new ImageStoreError('build', build.tag, result)
  const inspected = await podman.run(['image', 'inspect', build.tag, '--format', '{{.Id}}'])
  if (inspected.exitCode !== 0) throw new ImageStoreError('inspect', build.tag, inspected)
  return inspected.stdout.trim()
}

/** `true` si la referencia está en el almacén local; no la trae. */
export async function imageExists(podman: PodmanExecutor, reference: string): Promise<boolean> {
  return (await podman.run(['image', 'exists', reference])).exitCode === 0
}

/** Las imágenes cuyas etiquetas contienen todos los pares dados. */
export async function listImages(podman: PodmanExecutor, labels: Readonly<Record<string, string>>): Promise<StoredImage[]> {
  const filters = Object.entries(labels).flatMap(([key, value]) => ['--filter', `label=${key}=${value}`])
  const result = await podman.run(['images', ...filters, '--format', 'json'])
  if (result.exitCode !== 0) throw new ImageStoreError('list', JSON.stringify(labels), result)
  const listed = JSON.parse(result.stdout.trim() || '[]') as ListedImage[]
  return listed.map(image => ({
    id: image.Id,
    names: image.Names ?? [],
    labels: image.Labels ?? {},
    createdAt: image.Created,
    sizeBytes: image.Size,
  }))
}

export async function removeImage(podman: PodmanExecutor, id: string): Promise<void> {
  const result = await podman.run(['rmi', id])
  if (result.exitCode !== 0) throw new ImageStoreError('rmi', id, result)
}

/** Las etiquetas de una imagen local. */
export async function readLabels(podman: PodmanExecutor, reference: string): Promise<Record<string, string>> {
  const result = await podman.run(['image', 'inspect', reference, '--format', '{{json .Labels}}'])
  if (result.exitCode !== 0) throw new ImageStoreError('inspect', reference, result)
  return (JSON.parse(result.stdout.trim() || 'null') as Record<string, string> | null) ?? {}
}
