/** Digests de archivos grandes por streaming, sin cargarlos enteros en memoria. */
import { createHash, type Hash } from 'node:crypto'
import { createReadStream } from 'node:fs'

/** Alimenta `hash` con el contenido de `path` y devuelve su digest en hex. */
export function hashFile(path: string, hash: Hash): Promise<string> {
  return new Promise((resolve, reject) => {
    createReadStream(path)
      .on('data', chunk => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')))
  })
}

export function sha256OfFile(path: string): Promise<string> {
  return hashFile(path, createHash('sha256'))
}
