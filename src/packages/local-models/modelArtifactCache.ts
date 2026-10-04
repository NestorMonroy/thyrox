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
  const path = cachedArtifactPath(cacheDir, artifact.sha256)
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
}

export type PublicationOutcome =
  | { readonly status: 'published' | 'cached'; readonly path: string }

/**
 * Publica en la caché un GGUF que su productor ya verificó (el import externo
 * midió su sha256 y lo validó en el laboratorio): un enlace duro en la ruta
 * por digest, cero bytes más (H-THYROX-471). Sin publicarlo, el catálogo
 * nombraba un artefacto que la unidad de Ollama no podía montar. Un archivo
 * que ya ocupa la ruta se MIDE: con ese contenido no se toca, con otro se
 * reemplaza. Un enlace que el sistema de archivos no permite lanza: copiarlo
 * en silencio sería la segunda copia que esta función evita.
 */
export async function publishVerifiedArtifact(cacheDir: string, sha256: string, source: string): Promise<PublicationOutcome> {
  const path = cachedArtifactPath(cacheDir, sha256)
  if (await measuredSha256(path) === sha256) return { status: 'cached', path }
  await mkdir(cacheDir, { recursive: true })
  const partial = join(cacheDir, `.partial-${sha256}-${process.pid}-${Date.now()}`)
  try {
    await link(source, partial)
    await rename(partial, path)
  } finally {
    await rm(partial, { force: true })
  }
  return { status: 'published', path }
}
