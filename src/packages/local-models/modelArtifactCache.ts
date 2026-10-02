/**
 * Materialización verificada de un artefacto de modelo en la caché local
 * (TASK-THYROX-0729).
 *
 * La caché es reconstruible y no es autoridad: la autoridad es el artefacto
 * permanente, y el contenido válido es el que tiene el sha256 que el catálogo
 * declara. Por eso una entrada en caché se vuelve a verificar antes de usarla,
 * y una que no coincide se descarta y se reconstruye.
 *
 * La descarga escribe en un temporal hermano y sólo un `rename` atómico tras
 * verificar el sha256 la publica en la ruta por digest que leen los
 * consumidores: una descarga cortada o con otro contenido nunca parece un
 * GGUF materializado. Quién descarga es un `ArtifactFetcher`: en producción,
 * un trabajo de la primitiva de Podman sin credencial.
 *
 * Un blob que ya está en este anfitrión, verificado —el del volumen del Ollama
 * gestionado—, entra por `adoptLocalArtifact` con un enlace duro en vez de una
 * descarga (TASK-THYROX-0782): misma verificación y mismo `rename`, cero bytes
 * copiados. Si el enlace no se puede hacer, falla; nunca copia.
 */
import { link, mkdir, rename, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'

import type { CatalogArtifact } from '@thyrox/model-artifacts/catalogEntry.ts'
import type { PinnedModelArtifact } from '@thyrox/model-artifacts/modelArtifactResolver.ts'

import { sha256OfFile } from './sha256File.js'

export type FetchOutcome =
  | { readonly status: 'fetched' }
  | { readonly status: 'failed'; readonly reason: string }

/** Escribe el blob GGUF de `pinned` en `destination`; no verifica ni publica nada. */
export interface ArtifactFetcher {
  fetch(pinned: PinnedModelArtifact, destination: string): Promise<FetchOutcome>
}

export type MaterializationOutcome =
  | { readonly status: 'cached' | 'fetched'; readonly path: string; readonly sha256: string }
  | { readonly status: 'rejected' | 'failed'; readonly reason: string }

export type AdoptionOutcome =
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

export interface MaterializationRequest {
  readonly artifact: CatalogArtifact
  readonly pinned: PinnedModelArtifact
  readonly cacheDir: string
  readonly fetcher: ArtifactFetcher
}

/** La única ruta que un consumidor lee: el GGUF verificado, nombrado por su contenido. */
export function cachedArtifactPath(cacheDir: string, sha256: string): string {
  return join(cacheDir, `sha256-${sha256}.gguf`)
}

/** El sha256 medido del archivo, o `undefined` si no existe. */
async function measuredSha256(path: string): Promise<string | undefined> {
  try {
    await stat(path)
  } catch {
    return undefined
  }
  return sha256OfFile(path)
}

export async function materializeArtifact(request: MaterializationRequest): Promise<MaterializationOutcome> {
  const { artifact, pinned, cacheDir } = request
  if (pinned.blobDigest !== `sha256:${artifact.sha256}`) {
    return { status: 'rejected', reason: `el artefacto fijado apunta a ${pinned.blobDigest}, no al contenido sha256:${artifact.sha256} del catálogo` }
  }
  return publishVerified(cacheDir, artifact, 'fetched', partial => request.fetcher.fetch(pinned, partial))
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
}
