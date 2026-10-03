/**
 * La identidad de un snapshot de safetensors (TASK-THYROX-0761): el sha256 de su
 * manifiesto, una línea `ruta<TAB>sha256<TAB>bytes` por archivo, ordenadas por
 * ruta. Es el `artifactId` con que el catálogo y el grant citan el snapshot, y la
 * misma definición que aplica el runtime de Transformers dentro de la unidad
 * (`transformers_runtime_server.py`); las dos pruebas fijan el mismo vector.
 */
import { createHash } from 'node:crypto'
import { readdir, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

import { hashFile } from './sha256File.ts'

export async function snapshotManifestDigest(directory: string): Promise<string> {
  const files = (await listFiles(directory)).map(path => ({ path, relativePath: relative(directory, path).split(sep).join('/') }))
  files.sort((a, b) => (a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0))
  const manifest = createHash('sha256')
  for (const file of files) {
    const sha256 = await hashFile(file.path, createHash('sha256'))
    manifest.update(`${file.relativePath}\t${sha256}\t${(await stat(file.path)).size}\n`)
  }
  return manifest.digest('hex')
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return listFiles(path)
    return entry.isFile() ? [path] : []
  }))
  return nested.flat()
}
