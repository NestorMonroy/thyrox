/**
 * El directorio de modelos de Ollama de una unidad (TASK-THYROX-0782): el GGUF
 * concedido entra por enlace duro desde la caché, así que el adapter lo
 * encuentra con `hasBlob` y no lo sube; Ollama sólo escribe su manifiesto.
 *
 * Qué haría fallar a esta suite: un blob copiado en vez de enlazado, un
 * directorio que no sea el de ese artefacto, un segundo staging que rompa el
 * primero, o una caché sin el artefacto que no se rehúse.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { resolvedArtifact } from '@thyrox/model-artifacts/testing/resolvedArtifactFixture.ts'

import { cachedArtifactPath } from '../modelArtifactCache.js'
import { OLLAMA_MODELS_CONTAINER_DIRECTORY, ollamaModelsMount } from '../ollamaModelsDirectory.js'

const SHA = 'a'.repeat(64)
const ARTIFACT = resolvedArtifact({ artifactId: SHA })

let cacheDir: string
beforeEach(() => { cacheDir = mkdtempSync(join(tmpdir(), 'ollama-models-')) })
afterEach(() => rmSync(cacheDir, { recursive: true, force: true }))

describe('ollamaModelsMount', () => {
  test('monta un directorio propio del artefacto, de lectura y escritura, en el de modelos de Ollama', () => {
    const mount = ollamaModelsMount(cacheDir)
    expect(mount.containerDirectory).toBe(OLLAMA_MODELS_CONTAINER_DIRECTORY)
    expect(mount.mode).toBe('rw')
    expect(mount.hostDirectory(ARTIFACT)).toBe(join(cacheDir, `ollama-models-${SHA}`))
  })

  test('stage enlaza el GGUF de la caché como blob: mismo inodo, sin copia', async () => {
    writeFileSync(cachedArtifactPath(cacheDir, SHA), 'GGUF')
    const mount = ollamaModelsMount(cacheDir)
    await mount.stage!(ARTIFACT)
    const blob = join(mount.hostDirectory(ARTIFACT), 'blobs', `sha256-${SHA}`)
    expect(statSync(blob).ino).toBe(statSync(cachedArtifactPath(cacheDir, SHA)).ino)
  })

  test('stage dos veces deja el mismo enlace', async () => {
    writeFileSync(cachedArtifactPath(cacheDir, SHA), 'GGUF')
    const mount = ollamaModelsMount(cacheDir)
    await mount.stage!(ARTIFACT)
    await mount.stage!(ARTIFACT)
    expect(statSync(join(mount.hostDirectory(ARTIFACT), 'blobs', `sha256-${SHA}`)).nlink).toBe(2)
  })

  test('sin el artefacto en la caché, stage rehúsa nombrándolo', async () => {
    await expect(ollamaModelsMount(cacheDir).stage!(ARTIFACT)).rejects.toThrow('no está en la caché')
  })
})
