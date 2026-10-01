/**
 * Materialización verificada de un artefacto de modelo en la caché local
 * (TASK-THYROX-0729). La caché es reconstruible y no es autoridad: sólo vale
 * un archivo cuyo sha256 es el del catálogo, y una descarga incompleta o con
 * otro contenido nunca ocupa la ruta que los consumidores leen.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { CatalogArtifact } from '@thyrox/model-artifacts/catalogEntry.ts'
import type { PinnedModelArtifact } from '@thyrox/model-artifacts/modelArtifactResolver.ts'

import { cachedArtifactPath, materializeArtifact, type ArtifactFetcher } from '../modelArtifactCache.js'

const CONTENT = 'GGUF-bytes-of-a-q4-model'
const SHA = createHash('sha256').update(CONTENT).digest('hex')
const ARTIFACT: CatalogArtifact = { format: 'gguf', sha256: SHA, bytes: CONTENT.length }
const PINNED: PinnedModelArtifact = { registry: 'docker.io', repository: 'th3rox/lab', manifestDigest: `sha256:${'5'.repeat(64)}`, blobDigest: `sha256:${SHA}`, bytes: CONTENT.length }

let cacheDir: string
beforeEach(() => { cacheDir = mkdtempSync(join(tmpdir(), 'model-artifact-cache-')) })
afterEach(() => rmSync(cacheDir, { recursive: true, force: true }))

function fetcherWriting(content: string | undefined, calls: string[] = []): ArtifactFetcher & { calls: string[] } {
  return {
    calls,
    async fetch(pinned, destination) {
      calls.push(pinned.blobDigest)
      if (content === undefined) {
        writeFileSync(destination, CONTENT.slice(0, 5))
        return { status: 'failed', reason: 'conexión cortada' }
      }
      writeFileSync(destination, content)
      return { status: 'fetched' }
    },
  }
}

describe('materializeArtifact', () => {
  test('una caché vacía descarga una vez, verifica y publica en la ruta por digest', async () => {
    const fetcher = fetcherWriting(CONTENT)
    const outcome = await materializeArtifact({ artifact: ARTIFACT, pinned: PINNED, cacheDir, fetcher })
    expect(outcome).toEqual({ status: 'fetched', path: cachedArtifactPath(cacheDir, SHA) })
    expect(fetcher.calls).toHaveLength(1)
  })

  test('una caché correcta no descarga', async () => {
    writeFileSync(cachedArtifactPath(cacheDir, SHA), CONTENT)
    const fetcher = fetcherWriting(CONTENT)
    expect((await materializeArtifact({ artifact: ARTIFACT, pinned: PINNED, cacheDir, fetcher })).status).toBe('cached')
    expect(fetcher.calls).toHaveLength(0)
  })

  test('una caché con otro contenido no se usa: se reconstruye desde el artefacto', async () => {
    writeFileSync(cachedArtifactPath(cacheDir, SHA), 'otro contenido')
    const fetcher = fetcherWriting(CONTENT)
    expect((await materializeArtifact({ artifact: ARTIFACT, pinned: PINNED, cacheDir, fetcher })).status).toBe('fetched')
    expect(fetcher.calls).toHaveLength(1)
  })

  test('una descarga con otro contenido se rechaza y no deja caché válida', async () => {
    const outcome = await materializeArtifact({ artifact: ARTIFACT, pinned: PINNED, cacheDir, fetcher: fetcherWriting('contenido ajeno') })
    expect(outcome.status).toBe('rejected')
    expect(existsSync(cachedArtifactPath(cacheDir, SHA))).toBe(false)
    expect(readdirSync(cacheDir)).toEqual([])
  })

  test('una descarga que falla no deja ni caché válida ni parciales', async () => {
    const outcome = await materializeArtifact({ artifact: ARTIFACT, pinned: PINNED, cacheDir, fetcher: fetcherWriting(undefined) })
    expect(outcome.status).toBe('failed')
    expect(readdirSync(cacheDir)).toEqual([])
  })

  test('un artefacto fijado a otro blob que el del catálogo no se descarga', async () => {
    const fetcher = fetcherWriting(CONTENT)
    const outcome = await materializeArtifact({ artifact: ARTIFACT, pinned: { ...PINNED, blobDigest: `sha256:${'0'.repeat(64)}` }, cacheDir, fetcher })
    expect(outcome.status).toBe('rejected')
    expect(fetcher.calls).toHaveLength(0)
  })
})
