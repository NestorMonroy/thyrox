/**
 * `local-models-catalog declare <nombre-ollama> [--revision <commit>]` y
 * `local-models-catalog list [--json]`: el catálogo de modelos locales de la
 * instalación (`localModelHome`). `--revision` da el commit completo de
 * Hugging Face que un nombre contractual de fuente `hf` sólo lleva en 12
 * caracteres.
 *
 * `local-models-catalog locate --publication <publication.json>` lee el
 * registro que escribe `bin/artifact-registry-publish-artifact` y, sólo si su
 * estado es `verified`, añade al índice de ubicaciones una entrada por cada
 * archivo `.gguf`: su sha256 como contenido y el digest de `reference` como
 * manifest. Es lo que hace resoluble un contenido del catálogo para
 * `ensureModel`. Salidas: 0 hecho · 2 rehusado, con la causa y la ruta.
 */

import { mkdir, readFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { localArtifactHome, localModelHome } from '@thyrox/model-artifacts/localModelHome.ts'
import { loadArtifactLocationIndex, saveArtifactLocationIndex, type ArtifactLocation } from '@thyrox/model-artifacts/modelArtifactResolver.ts'
import { loadModelCatalog } from '@thyrox/model-artifacts/modelCatalog.ts'

import { EXIT_NOT_APPROVED, EXIT_OK, EXIT_REFUSED, type CommandOutput } from './commandOutput.js'
import { declareInstalledModel, type DeclarationOptions } from './declareInstalledModel.js'
import { managedOllama, type Environment } from './managedOllama.js'
import { OllamaApi } from './ollamaApi.js'
import { infrastructureEnsureCommand, OLLAMA_CONTAINER, requireInfrastructure, type InfrastructureEnsure } from './infrastructureReadiness.js'
import { adoptLocalArtifact } from './modelArtifactCache.js'
import { CONTAINER_MODELS_DIR, hostBlobPath, volumeMountpoint } from './volumeBlobs.js'

export const CATALOG_USAGE = [
  'uso: local-models-catalog declare <nombre-ollama> [--revision <commit>]',
  '     local-models-catalog list [--json]',
  '     local-models-catalog locate --publication <publication.json>',
  '     local-models-catalog adopt <nombre-contractual>',
].join('\n')

export interface CommandContext {
  readonly env: Environment
  readonly thyroxRoot: string
  readonly output: CommandOutput
  readonly now: () => Date
  /** Reconciliación de la infraestructura antes de usarla; sin declarar, `bin/infrastructure_ensure` del árbol. */
  readonly ensureInfrastructure?: InfrastructureEnsure
}

/** El ensure del contexto, o el del árbol de thyrox. */
export function infrastructureEnsureOf(context: CommandContext): InfrastructureEnsure {
  return context.ensureInfrastructure ?? infrastructureEnsureCommand(context.thyroxRoot)
}

interface DeclareArguments {
  readonly ollamaName: string
  readonly options: DeclarationOptions
}

const REVISION_FLAG = '--revision'
const PUBLICATION_FLAG = '--publication'
const GGUF_SUFFIX = '.gguf'
const VERIFIED = 'verified'
/** `<registry>/<repositorio>@sha256:<64 hex>`, la forma de `publicationRecord`. */
const PUBLICATION_REFERENCE = /^([^/@]+)\/([^@]+)@(sha256:[0-9a-f]{64})$/

/** Lo que `locate` lee del registro de publicación. */
interface PublicationRecord {
  readonly status?: unknown
  readonly reference?: unknown
  readonly files?: unknown
}

/** Un archivo publicado, en la forma `ArtifactFile` del registro. */
interface PublishedFile {
  readonly title: string
  readonly size: number
  readonly sha256: string
}

export async function runCatalogCommand(argv: readonly string[], context: CommandContext): Promise<number> {
  const [subcommand, ...rest] = argv
  try {
    const declaration = subcommand === 'declare' ? parseDeclareArguments(rest) : undefined
    if (declaration !== undefined) return await declare(declaration, context)
    if (subcommand === 'list') return await list(rest.includes('--json'), context)
    const publicationPath = subcommand === 'locate' ? parseLocateArguments(rest) : undefined
    if (publicationPath !== undefined) return await locate(publicationPath, context)
    const adoptedName = subcommand === 'adopt' && rest.length === 1 ? rest[0] : undefined
    if (adoptedName !== undefined) return await adopt(adoptedName, context)
  } catch (error) {
    context.output.stderr(`local-models-catalog: ${(error as Error).message}`)
    return EXIT_REFUSED
  }
  context.output.stderr(CATALOG_USAGE)
  return EXIT_REFUSED
}

/** `<nombre>` o `<nombre> --revision <commit>`; cualquier otra forma no es una declaración. */
function parseDeclareArguments(argv: readonly string[]): DeclareArguments | undefined {
  const [ollamaName, flag, revision, ...extra] = argv
  if (ollamaName === undefined || ollamaName.startsWith('-') || extra.length > 0) return undefined
  if (flag === undefined) return { ollamaName, options: {} }
  if (flag !== REVISION_FLAG || revision === undefined) return undefined
  return { ollamaName, options: { revision } }
}

async function declare(declaration: DeclareArguments, context: CommandContext): Promise<number> {
  await requireInfrastructure([OLLAMA_CONTAINER], infrastructureEnsureOf(context))
  const ollama = managedOllama(context.env)
  const entry = await declareInstalledModel(declaration.ollamaName, {
    api: new OllamaApi(ollama.baseUrl),
    mountpoint: await volumeMountpoint(ollama.podmanBin, ollama.volume),
    catalogPath: catalogPath(context),
    now: context.now,
  }, declaration.options)
  context.output.stdout(`declarado: ${entry.name} (${entry.artifact.bytes} bytes, sha256 ${entry.artifact.sha256})`)
  return EXIT_OK
}

/**
 * Adopta en la caché de artefactos, por enlace duro y tras verificar su sha256,
 * el blob que el volumen del Ollama gestionado ya tiene para una entrada del
 * catálogo (TASK-THYROX-0782): la unidad lo recibe sin descarga ni copia.
 */
async function adopt(name: string, context: CommandContext): Promise<number> {
  const entry = (await loadModelCatalog(catalogPath(context))).entries().find(candidate => candidate.name === name)
  if (entry === undefined) throw new Error(`«${name}» no está en el catálogo`)
  if (entry.artifact.format !== 'gguf') throw new Error(`«${name}» es ${entry.artifact.format}: sólo un GGUF vive en el volumen de Ollama`)
  const ollama = managedOllama(context.env)
  const mountpoint = await volumeMountpoint(ollama.podmanBin, ollama.volume)
  const sourcePath = hostBlobPath(`${CONTAINER_MODELS_DIR}/models/blobs/sha256-${entry.artifact.sha256}`, mountpoint)
  const cacheDir = localArtifactHome(context.env, context.thyroxRoot).artifactCache
  const outcome = await adoptLocalArtifact({ artifact: entry.artifact, sourcePath, cacheDir })
  if ('path' in outcome) {
    context.output.stdout(`${outcome.status === 'adopted' ? 'adoptado' : 'ya en caché'}: ${name} → ${outcome.path}`)
    return EXIT_OK
  }
  context.output.stderr(`local-models-catalog: ${name} no se adoptó (${outcome.status}): ${outcome.reason}`)
  return EXIT_NOT_APPROVED
}

async function list(asJson: boolean, context: CommandContext): Promise<number> {
  const entries = (await loadModelCatalog(catalogPath(context))).entries()
  if (asJson) context.output.stdout(JSON.stringify({ entries }))
  else entries.forEach(entry => context.output.stdout(`${entry.name}\t${entry.capabilities.join(',')}\tctx ${entry.maxContextLength}`))
  return EXIT_OK
}

function catalogPath(context: CommandContext): string {
  return localModelHome(context.env, context.thyroxRoot).catalog
}

/** `--publication <ruta>` y nada más; cualquier otra forma no es un locate. */
function parseLocateArguments(argv: readonly string[]): string | undefined {
  const [flag, path, ...extra] = argv
  if (flag !== PUBLICATION_FLAG || path === undefined || extra.length > 0) return undefined
  return path
}

async function locate(publicationPath: string, context: CommandContext): Promise<number> {
  const locations = locationsOf(publicationPath, JSON.parse(await readFile(publicationPath, 'utf8')) as PublicationRecord)
  const indexPath = localArtifactHome(context.env, context.thyroxRoot).artifactLocations
  const index = locations.reduce((current, location) => current.with(location), await loadArtifactLocationIndex(indexPath))
  await mkdir(dirname(indexPath), { recursive: true })
  await saveArtifactLocationIndex(indexPath, index)
  locations.forEach(location => context.output.stdout(`ubicado: sha256 ${location.contentSha256} en ${location.registry}/${location.repository}@${location.manifestDigest}`))
  return EXIT_OK
}

/** Una ubicación por cada `.gguf` de una publicación verificada; cualquier otra cosa rehúsa con la ruta. */
function locationsOf(publicationPath: string, record: PublicationRecord): ArtifactLocation[] {
  if (record.status !== VERIFIED) throw new Error(`${publicationPath}: la publicación está ${String(record.status)}, no ${VERIFIED}`)
  const reference = PUBLICATION_REFERENCE.exec(String(record.reference))
  if (reference === null) throw new Error(`${publicationPath}: referencia ${JSON.stringify(record.reference)} sin la forma <registry>/<repositorio>@sha256:<digest>`)
  const [, registry = '', repository = '', manifestDigest = ''] = reference
  const ggufFiles = publishedFiles(record).filter(file => file.title.endsWith(GGUF_SUFFIX))
  if (ggufFiles.length === 0) throw new Error(`${publicationPath}: la publicación no contiene ningún archivo ${GGUF_SUFFIX}`)
  return ggufFiles.map(file => ({ contentSha256: file.sha256, bytes: file.size, registry, repository, manifestDigest }))
}

function publishedFiles(record: PublicationRecord): readonly PublishedFile[] {
  return Array.isArray(record.files) ? record.files as PublishedFile[] : []
}
