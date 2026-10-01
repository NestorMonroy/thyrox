/**
 * Declara en el catálogo un modelo ya instalado en el Ollama gestionado: lee
 * su digest de `/api/tags` y su blob GGUF de `/api/show`, verifica el sha256
 * del blob en el volumen, construye la entrada con `catalogEntryFromGguf`,
 * registra el nombre contractual en Ollama (`/api/copy`) y guarda el catálogo.
 *
 * Un nombre que ya es contractual (`parseThyroxModelName`) conserva la
 * identidad que declara —repositorio, fuente y cuantización— y sólo se
 * completa su revisión: el digest del manifiesto si la fuente es `ollama`, el
 * commit que da `--revision` si es `hf`, porque el nombre lleva sólo 12
 * caracteres. Tomarlo como un modelo de la biblioteca de Ollama mentiría sobre
 * su procedencia. Cualquier otro nombre es un modelo de la biblioteca.
 *
 * El orden es el de los efectos: nada se copia ni se escribe hasta que la
 * entrada está construida y el catálogo la acepta; si la copia falla, el
 * catálogo no cambia.
 */

import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { ModelCapability, ModelCatalogEntry } from '@thyrox/model-artifacts/catalogEntry.ts'
import type { KvCacheType } from '@thyrox/model-artifacts/memoryEstimate.ts'
import { catalogEntryFromGguf, loadModelCatalog, saveModelCatalog } from '@thyrox/model-artifacts/modelCatalog.ts'
import { parseThyroxModelName, type ModelSource, type ParsedThyroxModelName } from '@thyrox/model-artifacts/modelName.ts'

import type { ModelDetails, OllamaApi } from './ollamaApi.js'
import { repositoryOfOllamaName, withExplicitTag } from './ollamaName.js'
import { sha256OfFile } from './sha256File.js'
import { hostBlobPath, modelBlobOfModelfile } from './volumeBlobs.js'

/** La caché KV con que Ollama sirve si no se declara `OLLAMA_KV_CACHE_TYPE`. */
export const OLLAMA_DEFAULT_KV_CACHE_TYPE: KvCacheType = 'f16'

/** Capacidad de `/api/show` → capacidad del catálogo; las demás (vision, thinking…) no se declaran. */
const CATALOG_CAPABILITY_BY_OLLAMA: Readonly<Record<string, ModelCapability>> = {
  completion: 'completion',
  tools: 'tools',
  embedding: 'embeddings',
}
const DIGEST_PREFIX = 'sha256:'
const ISO_SECOND_PRECISION_LENGTH = 'YYYY-MM-DDTHH:MM:SS'.length
const HF_COMMIT_PATTERN = /^[0-9a-f]{40}$/
const REVISION_FLAG = '--revision'

export class ModelDeclarationError extends Error {
  constructor(readonly ollamaName: string, reason: string) {
    super(`no se puede declarar «${ollamaName}»: ${reason}`)
    this.name = 'ModelDeclarationError'
  }
}

export interface DeclarationContext {
  readonly api: OllamaApi
  /** Punto de montaje en el anfitrión del volumen de modelos. */
  readonly mountpoint: string
  readonly catalogPath: string
  readonly now: () => Date
}

export interface DeclarationOptions {
  /** Commit completo de Hugging Face; sólo lo admite un nombre contractual de fuente `hf`. */
  readonly revision?: string
}

/** Lo que la entrada afirma sobre la procedencia del modelo. */
interface ModelIdentity {
  readonly repository: string
  readonly source: ModelSource
  readonly revision: string
  readonly quantization: string
}

export async function declareInstalledModel(ollamaName: string, context: DeclarationContext, options: DeclarationOptions = {}): Promise<ModelCatalogEntry> {
  const taggedName = withExplicitTag(ollamaName)
  const manifestRevision = await manifestDigest(context.api, taggedName)
  const details = await context.api.modelDetails(taggedName)
  const identity = identityOf(taggedName, { manifestRevision, details, declaredRevision: options.revision })
  const blob = modelBlobOfModelfile(details.modelfile)
  const blobPath = hostBlobPath(blob.containerPath, context.mountpoint)
  await requireBlobDigest(taggedName, blobPath, blob.sha256)
  const built = await catalogEntryFromGguf({
    path: blobPath,
    ...identity,
    sha256: blob.sha256,
    capabilities: catalogCapabilities(taggedName, details.capabilities),
    declaredAt: secondPrecisionInstant(context.now()),
    defaultKvCacheType: OLLAMA_DEFAULT_KV_CACHE_TYPE,
  })
  const catalog = await loadModelCatalog(context.catalogPath)
  const entry = keepingFirstDeclaration(built, catalog.byName(built.name))
  const updated = catalog.with(entry)
  if (entry.name !== taggedName) await context.api.copyModel(taggedName, entry.name)
  await mkdir(dirname(context.catalogPath), { recursive: true })
  await saveModelCatalog(context.catalogPath, updated)
  return entry
}

async function manifestDigest(api: OllamaApi, taggedName: string): Promise<string> {
  const installed = (await api.installedModels()).find(model => model.name === taggedName)
  if (installed === undefined) throw new ModelDeclarationError(taggedName, `${taggedName} no está instalado en el Ollama gestionado (/api/tags)`)
  return installed.digest.toLowerCase().replace(DIGEST_PREFIX, '')
}

interface InstalledFacts {
  readonly manifestRevision: string
  readonly details: ModelDetails
  readonly declaredRevision: string | undefined
}

function identityOf(taggedName: string, facts: InstalledFacts): ModelIdentity {
  const contract = parseThyroxModelName(taggedName)
  if (contract === undefined) return libraryIdentity(taggedName, facts)
  return {
    repository: contract.repository,
    source: contract.source,
    quantization: contract.quantization,
    revision: contract.source === 'hf'
      ? hfRevision(taggedName, contract, facts.declaredRevision)
      : ollamaRevision(taggedName, contract, facts),
  }
}

function libraryIdentity(taggedName: string, facts: InstalledFacts): ModelIdentity {
  refuseUnusedRevision(taggedName, facts.declaredRevision, 'no es un nombre contractual')
  return {
    repository: repositoryOfOllamaName(taggedName),
    source: 'ollama',
    revision: facts.manifestRevision,
    quantization: facts.details.quantizationLevel,
  }
}

function ollamaRevision(taggedName: string, contract: ParsedThyroxModelName, facts: InstalledFacts): string {
  refuseUnusedRevision(taggedName, facts.declaredRevision, 'su fuente es ollama: la revisión es el digest del manifiesto')
  requireSamePrefix(taggedName, contract, facts.manifestRevision, 'el digest del manifiesto (/api/tags)')
  return facts.manifestRevision
}

function hfRevision(taggedName: string, contract: ParsedThyroxModelName, declaredRevision: string | undefined): string {
  if (declaredRevision === undefined) {
    throw new ModelDeclarationError(taggedName, `su fuente es hf y el nombre sólo lleva ${contract.revision.length} caracteres del commit: hace falta ${REVISION_FLAG} <commit de 40 hex>`)
  }
  const revision = declaredRevision.toLowerCase()
  if (!HF_COMMIT_PATTERN.test(revision)) {
    throw new ModelDeclarationError(taggedName, `${REVISION_FLAG} ${declaredRevision} no es un commit de Hugging Face de 40 hex`)
  }
  requireSamePrefix(taggedName, contract, revision, `${REVISION_FLAG}`)
  return revision
}

function requireSamePrefix(taggedName: string, contract: ParsedThyroxModelName, revision: string, origin: string): void {
  if (!revision.startsWith(contract.revision)) {
    throw new ModelDeclarationError(taggedName, `${origin} es ${revision} y el nombre declara la revisión ${contract.revision}`)
  }
}

function refuseUnusedRevision(taggedName: string, declaredRevision: string | undefined, reason: string): void {
  if (declaredRevision !== undefined) {
    throw new ModelDeclarationError(taggedName, `${REVISION_FLAG} sólo aplica a un nombre contractual de fuente hf; ${reason}`)
  }
}

async function requireBlobDigest(taggedName: string, blobPath: string, declared: string): Promise<void> {
  const measured = await sha256OfFile(blobPath)
  if (measured !== declared) throw new ModelDeclarationError(taggedName, `el sha256 de ${blobPath} es ${measured}, su nombre declara ${declared}`)
}

function catalogCapabilities(taggedName: string, ollamaCapabilities: readonly string[]): ModelCapability[] {
  const capabilities = ollamaCapabilities.flatMap(capability => {
    const mapped = CATALOG_CAPABILITY_BY_OLLAMA[capability]
    return mapped === undefined ? [] : [mapped]
  })
  if (capabilities.length === 0) {
    throw new ModelDeclarationError(taggedName, `ninguna capacidad de /api/show (${ollamaCapabilities.join(', ')}) es ${Object.keys(CATALOG_CAPABILITY_BY_OLLAMA).join(', ')}`)
  }
  return capabilities
}

/** Volver a declarar lo mismo no es un cambio: el instante es el de la primera declaración. */
function keepingFirstDeclaration(built: ModelCatalogEntry, existing: ModelCatalogEntry | undefined): ModelCatalogEntry {
  return existing === undefined ? built : { ...built, declaredAt: existing.declaredAt }
}

function secondPrecisionInstant(instant: Date): string {
  return `${instant.toISOString().slice(0, ISO_SECOND_PRECISION_LENGTH)}Z`
}
