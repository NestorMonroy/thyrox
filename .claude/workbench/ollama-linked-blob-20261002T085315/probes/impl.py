"""Aplica TASK-THYROX-0782: adopción por enlace duro, `adopt` del catálogo y el montaje rw con staging."""
from pathlib import Path

P = Path("/home/user/thyrox/src/packages")


def replace_once(rel: str, old: str, new: str) -> None:
    path = P / rel
    text = path.read_text(encoding="utf-8")
    assert text.count(old) == 1, f"{rel}: {text.count(old)} coincidencias de {old[:70]!r}"
    path.write_text(text.replace(old, new), encoding="utf-8")


# --- caché: núcleo común de verificar y publicar, y la adopción por enlace ---
cache = "local-models/modelArtifactCache.ts"
replace_once(cache, " * un trabajo de la primitiva de Podman sin credencial.\n */",
             " * un trabajo de la primitiva de Podman sin credencial.\n *\n"
             " * Un blob que ya está en este anfitrión, verificado —el del volumen del Ollama\n"
             " * gestionado—, entra por `adoptLocalArtifact` con un enlace duro en vez de una\n"
             " * descarga (TASK-THYROX-0782): misma verificación y mismo `rename`, cero bytes\n"
             " * copiados. Si el enlace no se puede hacer, falla; nunca copia.\n */")
replace_once(cache, "import { mkdir, rename, rm, stat } from 'node:fs/promises'", "import { link, mkdir, rename, rm, stat } from 'node:fs/promises'")
replace_once(cache, """export interface MaterializationRequest {""", """export type AdoptionOutcome =
  | { readonly status: 'cached' | 'adopted'; readonly path: string; readonly sha256: string }
  | { readonly status: 'rejected' | 'failed'; readonly reason: string }

export interface AdoptionRequest {
  readonly artifact: CatalogArtifact
  /** El blob local que se adopta; tiene que estar en el mismo sistema de archivos que la caché. */
  readonly sourcePath: string
  readonly cacheDir: string
}

/** Escribe el contenido en el temporal `partial`; quien publica lo verifica y lo renombra. */
type PartialWriter = (partial: string) => Promise<FetchOutcome>

type Published<Written extends string> =
  | { readonly status: 'cached' | Written; readonly path: string; readonly sha256: string }
  | { readonly status: 'rejected' | 'failed'; readonly reason: string }

export interface MaterializationRequest {""")
replace_once(cache, """  const path = cachedArtifactPath(cacheDir, artifact.sha256)
  // El sha256 que se devuelve es el MEDIDO sobre el archivo, no el declarado:
  // es la segunda igualdad de READY y no puede ser una copia del catálogo.
  const cached = await measuredSha256(path)
  if (cached === artifact.sha256) return { status: 'cached', path, sha256: cached }

  await mkdir(cacheDir, { recursive: true })
  await rm(path, { force: true })
  const partial = join(cacheDir, `.partial-${artifact.sha256}-${process.pid}-${Date.now()}`)
  try {
    const fetched = await request.fetcher.fetch(pinned, partial)
    if (fetched.status !== 'fetched') return { status: 'failed', reason: fetched.reason }
    const actual = await sha256OfFile(partial)
    if (actual !== artifact.sha256) return { status: 'rejected', reason: `se descargó sha256:${actual}, el catálogo declara sha256:${artifact.sha256}` }
    await rename(partial, path)
    return { status: 'fetched', path, sha256: actual }
  } finally {
    await rm(partial, { force: true })
  }
}""", """  return publishVerified(cacheDir, artifact, 'fetched', partial => request.fetcher.fetch(pinned, partial))
}

/** Adopta un blob local verificado por enlace duro: misma verificación que una descarga, sin copiar. */
export async function adoptLocalArtifact(request: AdoptionRequest): Promise<AdoptionOutcome> {
  return publishVerified(request.cacheDir, request.artifact, 'adopted', partial => linkInto(request.sourcePath, partial))
}

async function linkInto(source: string, partial: string): Promise<FetchOutcome> {
  try {
    await link(source, partial)
    return { status: 'fetched' }
  } catch (error) {
    return { status: 'failed', reason: `no se pudo enlazar ${source}: ${(error as Error).message}` }
  }
}

/** Escribe en un temporal, mide su sha256 y sólo si es el del catálogo lo publica con un `rename` atómico. */
async function publishVerified<Written extends string>(
  cacheDir: string, artifact: CatalogArtifact, written: Written, write: PartialWriter,
): Promise<Published<Written>> {
  const path = cachedArtifactPath(cacheDir, artifact.sha256)
  // El sha256 que se devuelve es el MEDIDO sobre el archivo, no el declarado:
  // es la segunda igualdad de READY y no puede ser una copia del catálogo.
  const cached = await measuredSha256(path)
  if (cached === artifact.sha256) return { status: 'cached', path, sha256: cached }

  await mkdir(cacheDir, { recursive: true })
  await rm(path, { force: true })
  const partial = join(cacheDir, `.partial-${artifact.sha256}-${process.pid}-${Date.now()}`)
  try {
    const outcome = await write(partial)
    if (outcome.status !== 'fetched') return { status: 'failed', reason: outcome.reason }
    const actual = await sha256OfFile(partial)
    if (actual !== artifact.sha256) return { status: 'rejected', reason: `el contenido escrito es sha256:${actual}, el catálogo declara sha256:${artifact.sha256}` }
    await rename(partial, path)
    return { status: written, path, sha256: actual }
  } finally {
    await rm(partial, { force: true })
  }
}""")

# --- primitiva: modo del montaje y staging antes de crear ---
mat = "model-scheduling/podmanModelUnitMaterializer.ts"
replace_once(mat, """/** El artefacto del grant expuesto a la unidad: de dónde se lee y dónde lo ve el runtime. */
export interface ArtifactMount {
  hostDirectory(artifact: ResolvedModelArtifact): string
  readonly containerDirectory: string
}""", """/** El artefacto del grant expuesto a la unidad: de dónde se lee, dónde lo ve el runtime y con qué modo. */
export interface ArtifactMount {
  hostDirectory(artifact: ResolvedModelArtifact): string
  readonly containerDirectory: string
  /** `ro` si el runtime sólo lee el artefacto; `rw` si escribe junto a él (el manifiesto de Ollama). */
  readonly mode: WorkerMountMode
  /** Deja listo `hostDirectory` antes de crear la unidad (TASK-THYROX-0782); si falla, la unidad no se crea. */
  stage?(artifact: ResolvedModelArtifact): Promise<void>
}""")
replace_once(mat, """  return [{ source: mount.hostDirectory(spec.grant.artifact), destination: mount.containerDirectory, mode: 'ro' }]""",
             """  return [{ source: mount.hostDirectory(spec.grant.artifact), destination: mount.containerDirectory, mode: mount.mode }]""")
replace_once(mat, """    if (!profile) return { status: 'failed', reason: `sin perfil de contenedor para el runtime ${grant.runtime}`, partial: false }
    return this.createUnit(grant, profile)""", """    if (!profile) return { status: 'failed', reason: `sin perfil de contenedor para el runtime ${grant.runtime}`, partial: false }
    const unstaged = await stagingFailure(profile, grant)
    if (unstaged) return unstaged
    return this.createUnit(grant, profile)""")
replace_once(mat, """function artifactMounts(spec: ModelUnitContainerSpec): WorkerResourceMount[] {""", """/** Prepara el montaje del artefacto; su fallo es el de la materialización, sin contenedor creado. */
async function stagingFailure(profile: RuntimeContainerProfile, grant: ExecutionGrant): Promise<MaterializationOutcome | undefined> {
  try {
    await profile.artifactMount?.stage?.(grant.artifact)
    return undefined
  } catch (error) {
    return { status: 'failed', reason: `no se preparó el artefacto de la unidad: ${(error as Error).message}`, partial: false }
  }
}

function artifactMounts(spec: ModelUnitContainerSpec): WorkerResourceMount[] {""")
replace_once(mat, "import type { WorkerResourceMount } from '@thyrox/podman-execution/workerResourceProfile.ts'",
             "import type { WorkerMountMode, WorkerResourceMount } from '@thyrox/podman-execution/workerResourceProfile.ts'")
replace_once("model-scheduling/__tests__/podmanModelUnitMaterializer.test.ts",
             "artifactMount: { hostDirectory: artifact => `/srv/artifacts/${artifact.artifactId}`, containerDirectory: '/model' },",
             "artifactMount: { hostDirectory: artifact => `/srv/artifacts/${artifact.artifactId}`, containerDirectory: '/model', mode: 'ro' },")

# --- composición: Transformers explícito ro; Ollama con su directorio de modelos enlazado ---
comp = "local-models/hostCoordinatorComposition.ts"
replace_once(comp, "        artifactMount: { hostDirectory: artifact => snapshotDirectory(artifactCache, artifact.artifactId), containerDirectory: TRANSFORMERS_MODEL_DIRECTORY },",
             "        artifactMount: { hostDirectory: artifact => snapshotDirectory(artifactCache, artifact.artifactId), containerDirectory: TRANSFORMERS_MODEL_DIRECTORY, mode: 'ro' },")
replace_once(comp, "      ollama: { image: OLLAMA_RUNTIME_IMAGE, containerPort: OLLAMA_CONTAINER_PORT, environment: { OLLAMA_HOST: `0.0.0.0:${OLLAMA_CONTAINER_PORT}` } },",
             "      // El GGUF concedido entra enlazado desde la caché, no subido: el adapter no copia lo que la unidad ya tiene.\n"
             "      ollama: { image: OLLAMA_RUNTIME_IMAGE, containerPort: OLLAMA_CONTAINER_PORT, environment: { OLLAMA_HOST: `0.0.0.0:${OLLAMA_CONTAINER_PORT}` }, artifactMount: ollamaModelsMount(artifactCache) },")
replace_once(comp, "import { OllamaRuntimeAdapter } from './ollamaRuntimeAdapter.ts'\n",
             "import { ollamaModelsMount } from './ollamaModelsDirectory.ts'\nimport { OllamaRuntimeAdapter } from './ollamaRuntimeAdapter.ts'\n")

# --- catálogo: adopt <nombre-contractual> ---
cat = "local-models/catalogCommand.ts"
replace_once(cat, "  '     local-models-catalog locate --publication <publication.json>',\n",
             "  '     local-models-catalog locate --publication <publication.json>',\n"
             "  '     local-models-catalog adopt <nombre-contractual>',\n")
replace_once(cat, "import { volumeMountpoint } from './volumeBlobs.js'\n",
             "import { adoptLocalArtifact } from './modelArtifactCache.js'\n"
             "import { CONTAINER_MODELS_DIR, hostBlobPath, volumeMountpoint } from './volumeBlobs.js'\n")
replace_once(cat, """    if (publicationPath !== undefined) return await locate(publicationPath, context)
""", """    if (publicationPath !== undefined) return await locate(publicationPath, context)
    const adoptedName = subcommand === 'adopt' && rest.length === 1 ? rest[0] : undefined
    if (adoptedName !== undefined) return await adopt(adoptedName, context)
""")
replace_once(cat, """async function list(asJson: boolean, context: CommandContext): Promise<number> {""", """/**
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

async function list(asJson: boolean, context: CommandContext): Promise<number> {""")
replace_once(cat, "import { EXIT_OK, EXIT_REFUSED, type CommandOutput } from './commandOutput.js'",
             "import { EXIT_NOT_APPROVED, EXIT_OK, EXIT_REFUSED, type CommandOutput } from './commandOutput.js'")
