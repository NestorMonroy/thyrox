/**
 * Un archivo de un artefacto permanente, descrito por lo que el registry
 * necesita para guardarlo por contenido: tamaño, sha256 y media type. Se lee
 * en flujo para no cargar en memoria un GGUF de gigabytes.
 */
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'

export interface ArtifactFile {
  /** Ruta local de donde se lee el contenido al publicar. */
  readonly path: string
  /** Nombre con que el consumidor lo materializa (`org.opencontainers.image.title`). */
  readonly title: string
  readonly mediaType: string
  readonly size: number
  /** sha256 en hexadecimal, sin prefijo. */
  readonly sha256: string
}

export async function sha256OfPath(path: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer)
  return hash.digest('hex')
}

export async function describeArtifactFile(path: string, title: string, mediaType: string): Promise<ArtifactFile> {
  const [{ size }, sha256] = await Promise.all([stat(path), sha256OfPath(path)])
  return { path, title, mediaType, size, sha256 }
}
