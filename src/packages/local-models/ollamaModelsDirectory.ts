/**
 * El directorio de modelos de Ollama de una unidad (TASK-THYROX-0782).
 *
 * El adapter sube el GGUF concedido a la unidad con `/api/blobs` sólo si la
 * unidad no lo tiene (`hasBlob`). Subirlo copia el archivo entero dentro del
 * contenedor: 4.68 GB para Qwen 2.5 7B Q4_K_M, más de lo que quedaba libre.
 * Aquí la unidad recibe, montado en su directorio de modelos, un directorio
 * propio del artefacto cuyo `blobs/sha256-<hex>` es un ENLACE DURO al GGUF
 * verificado de la caché: `hasBlob` responde que sí y no se copia ni un byte.
 * Ollama escribe en ese directorio sólo su manifiesto y sus blobs de
 * configuración, que son pequeños; por eso se monta de lectura y escritura.
 *
 * Un enlace duro exige el mismo sistema de archivos que la caché: si no lo
 * es, el staging falla y lo dice; nunca cae a copiar.
 */

import { link, mkdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'

import type { ResolvedModelArtifact } from '@thyrox/model-artifacts/resolvedModelArtifact.ts'
import type { ArtifactMount } from '@thyrox/model-scheduling/podmanModelUnitMaterializer.ts'

import { cachedArtifactPath } from './modelArtifactCache.js'

/** El directorio de modelos de Ollama dentro de su imagen (`OLLAMA_MODELS` por defecto). */
export const OLLAMA_MODELS_CONTAINER_DIRECTORY = '/root/.ollama/models'
const BLOBS_DIRECTORY = 'blobs'

export function ollamaModelsMount(artifactCache: string): ArtifactMount {
  return {
    hostDirectory: artifact => modelsDirectory(artifactCache, artifact.artifactId),
    containerDirectory: OLLAMA_MODELS_CONTAINER_DIRECTORY,
    mode: 'rw',
    stage: artifact => stageGrantedBlob(artifactCache, artifact),
  }
}

function modelsDirectory(artifactCache: string, sha256: string): string {
  return join(artifactCache, `ollama-models-${sha256}`)
}

async function stageGrantedBlob(artifactCache: string, artifact: ResolvedModelArtifact): Promise<void> {
  const sha256 = artifact.artifactId
  const cached = cachedArtifactPath(artifactCache, sha256)
  const cachedInode = await inodeOf(cached)
  if (cachedInode === undefined) {
    throw new Error(`el artefacto ${sha256} no está en la caché (${cached}): se adopta o se materializa antes de concederlo`)
  }
  const blobs = join(modelsDirectory(artifactCache, sha256), BLOBS_DIRECTORY)
  const blob = join(blobs, `sha256-${sha256}`)
  if (await inodeOf(blob) === cachedInode) return
  await mkdir(blobs, { recursive: true })
  await rm(blob, { force: true })
  await link(cached, blob)
}

async function inodeOf(path: string): Promise<number | undefined> {
  try {
    return (await stat(path)).ino
  } catch {
    return undefined
  }
}
