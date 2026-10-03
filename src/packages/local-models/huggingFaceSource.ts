/**
 * La fuente de una cuantización en Hugging Face, fijada por revisión
 * completa (TASK-THYROX-0718): qué archivos tiene, con qué tamaño y digest, y
 * su descarga verificada.
 *
 * Un archivo LFS se verifica contra su sha256; los demás, contra el sha1 de
 * objeto git (`blob <bytes>\0<contenido>`), que es lo que la API publica para
 * ellos. Un archivo ya presente y verificado no se descarga otra vez: la
 * descarga es idempotente y una reejecución sólo baja lo que falta.
 */
import { createHash } from 'node:crypto'
import { mkdir, rename, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { SourceDigest, SourceFile, SourceSpec } from '@thyrox/model-artifacts/quantizationPlan.ts'

import { hashFile } from './sha256File.js'

export const HUGGING_FACE_BASE_URL = 'https://huggingface.co'

export type Fetcher = (url: string) => Promise<Response>

export class SourceDownloadError extends Error {
  constructor(readonly path: string, reason: string) {
    super(`${path}: ${reason}`)
    this.name = 'SourceDownloadError'
  }
}

interface HubSibling {
  readonly rfilename: string
  readonly size?: number
  readonly blobId?: string
  readonly lfs?: { readonly sha256?: string }
}

/** Los archivos de `repository` en `revision`, con tamaño y digest, según la API del hub. */
export async function fetchSourceSpec(fetcher: Fetcher, repository: string, revision: string): Promise<SourceSpec> {
  const response = await fetcher(`${HUGGING_FACE_BASE_URL}/api/models/${repository}/revision/${revision}?blobs=true`)
  if (!response.ok) throw new SourceDownloadError(repository, `la API respondió ${response.status}`)
  const body = await response.json() as { sha?: string; siblings?: readonly HubSibling[]; cardData?: { license?: string } }
  if (body.sha !== revision) throw new SourceDownloadError(repository, `la API resolvió ${body.sha}, no ${revision}`)
  const files = (body.siblings ?? []).map(sourceFileOf)
  const license = body.cardData?.license
  return license === undefined ? { repository, revision, files } : { repository, revision, files, license }
}

function sourceFileOf(sibling: HubSibling): SourceFile {
  if (sibling.size === undefined) throw new SourceDownloadError(sibling.rfilename, 'la API no publica su tamaño')
  return { path: sibling.rfilename, sizeBytes: sibling.size, digest: digestOf(sibling) }
}

function digestOf(sibling: HubSibling): SourceDigest {
  if (sibling.lfs?.sha256) return `sha256:${sibling.lfs.sha256}`
  if (sibling.blobId) return `gitblob:${sibling.blobId}`
  throw new SourceDownloadError(sibling.rfilename, 'la API no publica su digest')
}

/** ¿El archivo ya está en `path` con el tamaño y el digest declarados? */
export async function isVerifiedOnDisk(path: string, file: SourceFile): Promise<boolean> {
  const size = await stat(path).then(info => info.size, () => undefined)
  if (size !== file.sizeBytes) return false
  return (await digestOfFile(path, file)) === file.digest
}

export async function digestOfFile(path: string, file: SourceFile): Promise<SourceDigest> {
  if (file.digest.startsWith('sha256:')) return `sha256:${await hashFile(path, createHash('sha256'))}`
  const hash = createHash('sha1').update(`blob ${file.sizeBytes}\0`)
  return `gitblob:${await hashFile(path, hash)}`
}

/**
 * Descarga los archivos que faltan a `directory` y verifica cada uno antes de
 * darlo por bueno. Devuelve los bytes descargados en esta llamada (0 si todo
 * estaba). Escribe a un temporal y lo renombra: un corte no deja un archivo
 * con el nombre final y contenido parcial.
 */
export async function downloadSource(fetcher: Fetcher, source: SourceSpec, directory: string): Promise<number> {
  let downloadedBytes = 0
  for (const file of source.files) {
    const target = join(directory, file.path)
    if (await isVerifiedOnDisk(target, file)) continue
    await downloadFile(fetcher, source, file, target)
    downloadedBytes += file.sizeBytes
  }
  return downloadedBytes
}

async function downloadFile(fetcher: Fetcher, source: SourceSpec, file: SourceFile, target: string): Promise<void> {
  const response = await fetcher(`${HUGGING_FACE_BASE_URL}/${source.repository}/resolve/${source.revision}/${file.path}`)
  if (!response.ok) throw new SourceDownloadError(file.path, `la descarga respondió ${response.status}`)
  await mkdir(dirname(target), { recursive: true })
  const partial = `${target}.partial`
  await Bun.write(partial, response)
  if (!(await isVerifiedOnDisk(partial, file))) throw new SourceDownloadError(file.path, `no coincide con ${file.digest}`)
  await rename(partial, target)
}
