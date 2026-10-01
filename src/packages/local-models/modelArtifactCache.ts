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
import { mkdir, rename, rm, stat } from 'node:fs/promises'
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
  | { readonly status: 'cached' | 'fetched'; readonly path: string }
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

async function hasContent(path: string, sha256: string): Promise<boolean> {
  try {
    await stat(path)
  } catch {
    return false
  }
  return (await sha256OfFile(path)) === sha256
}

export async function materializeArtifact(request: MaterializationRequest): Promise<MaterializationOutcome> {
  const { artifact, pinned, cacheDir } = request
  if (pinned.blobDigest !== `sha256:${artifact.sha256}`) {
    return { status: 'rejected', reason: `el artefacto fijado apunta a ${pinned.blobDigest}, no al contenido sha256:${artifact.sha256} del catálogo` }
  }
  const path = cachedArtifactPath(cacheDir, artifact.sha256)
  if (await hasContent(path, artifact.sha256)) return { status: 'cached', path }

  await mkdir(cacheDir, { recursive: true })
  await rm(path, { force: true })
  const partial = join(cacheDir, `.partial-${artifact.sha256}-${process.pid}-${Date.now()}`)
  try {
    const fetched = await request.fetcher.fetch(pinned, partial)
    if (fetched.status !== 'fetched') return { status: 'failed', reason: fetched.reason }
    const actual = await sha256OfFile(partial)
    if (actual !== artifact.sha256) return { status: 'rejected', reason: `se descargó sha256:${actual}, el catálogo declara sha256:${artifact.sha256}` }
    await rename(partial, path)
    return { status: 'fetched', path }
  } finally {
    await rm(partial, { force: true })
  }
}
