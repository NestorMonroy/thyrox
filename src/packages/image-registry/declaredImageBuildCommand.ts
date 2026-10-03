/**
 * La orden `bin/image-registry-build-declared-image`: la única capacidad de
 * construcción que el plano de control concede.
 *
 *   solicitante -> identidad lógica -> definición declarada -> primitiva -> Podman
 *
 * Acepta la referencia del trabajo (`--task` o `--work`) y una identidad del
 * catálogo; cualquier otra opción, una segunda identidad o un comando tras
 * `--` se rehúsan antes de tocar Podman, y la construcción sólo empieza
 * dentro de una reserva de disco de su pico declarado. Lo que la orden no admite es
 * precisamente lo que haría de ella el `build-image` genérico: contexto,
 * Containerfile, red, ciclo de vida, etiqueta, imagen o montajes elegidos por
 * quien llama.
 */
import { join } from 'node:path'
import { parseArgs } from 'node:util'

import { TASK_CITATION_PATTERN, WORK_CONSUMER_PATTERN, WORK_ID_PATTERN, type ExecutionReference } from '@thyrox/podman-execution/executionAuthorization.ts'
import { buildManagedImage } from '@thyrox/podman-execution/executionCommand.ts'
import type { PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

import { candidateTag, DEFINITION_CATALOG_PATH, definitionLabels, type DeclaredImage, type DefinitionRevision, findDeclaredImage, UndeclaredImageError, UnversionedDefinitionError } from './declaredImages.ts'

const EXIT_FAILED = 1
const EXIT_REFUSED = 2
const USAGE = 'uso: image-registry-build-declared-image (--task TASK-<CAPA>-NNNN | --work CONSUMIDOR:ID) <imagen-declarada>'

export type DeclaredImageBuildDeps = {
  env: Readonly<Record<string, string | undefined>>
  podman: PodmanExecutor
  repositoryRoot: string
  output: { stdout(text: string): void; stderr(text: string): void }
  /** El commit del repositorio y si alguna ruta de la definición difiere de él. */
  definitionRevision(paths: readonly string[]): Promise<DefinitionRevision>
  /** Reserva `bytes` de disco antes de construir; `false` si no caben. */
  admitDisk(bytes: number, purpose: string): Promise<boolean>
  /** Suelta la reserva que `admitDisk` concedió. */
  releaseDisk(): Promise<void>
}

class RefusedRequestError extends Error {}

class DiskNotAdmittedError extends Error {
  constructor(purpose: string, bytes: number) {
    super(`no se admite ${purpose}: su pico declarado de ${bytes} bytes no cabe en disco`)
  }
}

/** Todo lo que determina la construcción: el catálogo y lo que la definición nombra. */
function definitionClosure(image: DeclaredImage): string[] {
  return [DEFINITION_CATALOG_PATH, image.context, ...(image.containerfile === undefined ? [] : [image.containerfile])]
}

/** Sólo la referencia y una identidad; `strict` rehúsa toda otra opción. */
function parseRequest(argv: string[]): { reference: ExecutionReference; imageId: string } {
  let parsed
  try {
    parsed = parseArgs({ args: argv, strict: true, allowPositionals: true, options: { task: { type: 'string' }, work: { type: 'string' } } })
  } catch (error) {
    throw new RefusedRequestError(error instanceof Error ? error.message : String(error))
  }
  const { values, positionals } = parsed
  if (positionals.length !== 1) throw new RefusedRequestError(`se pide exactamente una imagen declarada; llegaron ${positionals.length}`)
  return { reference: referenceOf(values.task, values.work), imageId: positionals[0]! }
}

function referenceOf(task: string | undefined, work: string | undefined): ExecutionReference {
  if ((task === undefined) === (work === undefined)) throw new RefusedRequestError('declara --task o --work, uno solo')
  if (task !== undefined) {
    if (!TASK_CITATION_PATTERN.test(task)) throw new RefusedRequestError(`--task va TASK-<CAPA>-NNNN, recibido: ${task}`)
    return { kind: 'task', citation: task }
  }
  const separator = work!.indexOf(':')
  const consumer = work!.slice(0, separator)
  const workId = work!.slice(separator + 1)
  if (separator <= 0 || !WORK_CONSUMER_PATTERN.test(consumer) || !WORK_ID_PATTERN.test(workId)) {
    throw new RefusedRequestError(`--work va CONSUMIDOR:ID con los patrones de la autorización, recibido: ${work}`)
  }
  return { kind: 'work', consumer, workId }
}

function isRefusal(error: unknown): boolean {
  return error instanceof RefusedRequestError || error instanceof UndeclaredImageError || error instanceof UnversionedDefinitionError
    || error instanceof DiskNotAdmittedError
}

/** Construye dentro de una reserva de disco, y la suelta pase lo que pase con la construcción. */
async function buildAdmitted<T>(deps: DeclaredImageBuildDeps, bytes: number, purpose: string, build: () => Promise<T>): Promise<T> {
  if (!(await deps.admitDisk(bytes, purpose))) throw new DiskNotAdmittedError(purpose, bytes)
  try {
    return await build()
  } finally {
    await deps.releaseDisk()
  }
}

export async function runDeclaredImageBuildCommand(argv: string[], deps: DeclaredImageBuildDeps): Promise<number> {
  try {
    const { reference, imageId } = parseRequest(argv)
    const image = findDeclaredImage(imageId)
    const revision = await deps.definitionRevision(definitionClosure(image))
    const tag = candidateTag(image, revision)
    const id = await buildAdmitted(deps, image.estimatedDiskBytes, `build ${tag}`, () => buildManagedImage(deps, {
      reference,
      context: join(deps.repositoryRoot, image.context),
      containerfile: image.containerfile === undefined ? undefined : join(deps.repositoryRoot, image.containerfile),
      tag,
      network: image.network,
      lifecycle: image.lifecycle,
      labels: definitionLabels(image, revision),
    }))
    const record = { image: image.id, tag, id, lifecycle: image.lifecycle, definition: { context: image.context, commit: revision.commit } }
    deps.output.stdout(`${JSON.stringify(record)}\n`)
    return 0
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (isRefusal(error)) {
      deps.output.stderr(`image-registry-build-declared-image: rehusado: ${message}\n${USAGE}\n`)
      return EXIT_REFUSED
    }
    deps.output.stderr(`image-registry-build-declared-image: ${message}\n`)
    return EXIT_FAILED
  }
}
