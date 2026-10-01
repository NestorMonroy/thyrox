/**
 * Declara en el catálogo un modelo ya instalado en el Ollama gestionado: lee
 * su digest de `/api/tags` y su blob GGUF de `/api/show`, verifica el sha256
 * del blob en el volumen, construye la entrada con `catalogEntryFromGguf`,
 * registra el nombre contractual en Ollama (`/api/copy`) y guarda el catálogo.
 *
 * El orden es el de los efectos: nada se copia ni se escribe hasta que la
 * entrada está construida y el catálogo la acepta; si la copia falla, el
 * catálogo no cambia.
 */

import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { ModelCapability, ModelCatalogEntry } from '@thyrox/model-artifacts/catalogEntry.ts'
import type { KvCacheType } from '@thyrox/model-artifacts/memoryEstimate.ts'
import { catalogEntryFromGguf, loadModelCatalog, saveModelCatalog } from '@thyrox/model-artifacts/modelCatalog.ts'

import type { OllamaApi } from './ollamaApi.js'
import { repositoryOfOllamaName, withExplicitTag } from './ollamaName.js'
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

export async function declareInstalledModel(ollamaName: string, context: DeclarationContext): Promise<ModelCatalogEntry> {
  const taggedName = withExplicitTag(ollamaName)
  const revision = await manifestDigest(context.api, taggedName)
  const details = await context.api.modelDetails(taggedName)
  const blob = modelBlobOfModelfile(details.modelfile)
  const blobPath = hostBlobPath(blob.containerPath, context.mountpoint)
  await requireBlobDigest(taggedName, blobPath, blob.sha256)
  const built = await catalogEntryFromGguf({
    path: blobPath,
    repository: repositoryOfOllamaName(taggedName),
    source: 'ollama',
    revision,
    quantization: details.quantizationLevel,
    sha256: blob.sha256,
    capabilities: catalogCapabilities(taggedName, details.capabilities),
    declaredAt: secondPrecisionInstant(context.now()),
    defaultKvCacheType: OLLAMA_DEFAULT_KV_CACHE_TYPE,
  })
  const catalog = await loadModelCatalog(context.catalogPath)
  const entry = keepingFirstDeclaration(built, catalog.byName(built.name))
  const updated = catalog.with(entry)
  await context.api.copyModel(taggedName, entry.name)
  await mkdir(dirname(context.catalogPath), { recursive: true })
  await saveModelCatalog(context.catalogPath, updated)
  return entry
}

async function manifestDigest(api: OllamaApi, taggedName: string): Promise<string> {
  const installed = (await api.installedModels()).find(model => model.name === taggedName)
  if (installed === undefined) throw new ModelDeclarationError(taggedName, `${taggedName} no está instalado en el Ollama gestionado (/api/tags)`)
  return installed.digest.toLowerCase().replace(DIGEST_PREFIX, '')
}

async function requireBlobDigest(taggedName: string, blobPath: string, declared: string): Promise<void> {
  const measured = await sha256OfFile(blobPath)
  if (measured !== declared) throw new ModelDeclarationError(taggedName, `el sha256 de ${blobPath} es ${measured}, su nombre declara ${declared}`)
}

function sha256OfFile(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    createReadStream(path)
      .on('data', chunk => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')))
  })
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
