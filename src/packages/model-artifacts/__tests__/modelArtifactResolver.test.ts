/**
 * La frontera entre la identidad de contenido del catálogo y la identidad de
 * distribución (TASK-THYROX-0729): el catálogo declara qué contenido necesita
 * (`CatalogArtifact`); el resolver dice de qué artefacto permanente, fijado
 * por digest, se obtiene. El catálogo nunca nombra un registry.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { CatalogArtifact } from '../catalogEntry.js'
import {
  ArtifactLocationConflictError,
  ArtifactLocationIndex,
  createIndexedArtifactResolver,
  loadArtifactLocationIndex,
  saveArtifactLocationIndex,
  type ArtifactLocation,
} from '../modelArtifactResolver.js'

const Q4 = 'b8d6f5cbac92ca386bee2a3911140bc5cbfd1aa9879888fb6e395a134ce05e88'
const Q8 = 'a'.repeat(64)
const MANIFEST = `sha256:${'5'.repeat(64)}`

function artifact(sha256: string, bytes: number): CatalogArtifact {
  return { format: 'gguf', sha256, bytes }
}

function location(contentSha256: string, bytes: number, overrides: Partial<ArtifactLocation> = {}): ArtifactLocation {
  return { contentSha256, bytes, registry: 'docker.io', repository: 'th3rox/lab', manifestDigest: MANIFEST, ...overrides }
}

describe('createIndexedArtifactResolver', () => {
  test('un digest conocido resuelve al artefacto permanente fijado por su manifest', async () => {
    const resolver = createIndexedArtifactResolver(ArtifactLocationIndex.of([location(Q4, 397807712)]))
    expect(await resolver.resolve(artifact(Q4, 397807712))).toEqual({
      status: 'resolved',
      pinned: { registry: 'docker.io', repository: 'th3rox/lab', manifestDigest: MANIFEST, blobDigest: `sha256:${Q4}`, bytes: 397807712 },
    })
  })

  test('un digest sin distribución es not_materializable, nunca un artefacto parecido', async () => {
    const resolver = createIndexedArtifactResolver(ArtifactLocationIndex.of([location(Q4, 397807712)]))
    const resolution = await resolver.resolve(artifact(Q8, 531068000))
    expect(resolution.status).toBe('not_materializable')
  })

  test('dos artefactos del mismo repositorio y tag se distinguen por digest, nunca por nombre', async () => {
    const resolver = createIndexedArtifactResolver(ArtifactLocationIndex.of([
      location(Q4, 397807712, { manifestDigest: `sha256:${'1'.repeat(64)}` }),
      location(Q8, 531068000, { manifestDigest: `sha256:${'2'.repeat(64)}` }),
    ]))
    const q4 = await resolver.resolve(artifact(Q4, 397807712))
    const q8 = await resolver.resolve(artifact(Q8, 531068000))
    expect(q4.status === 'resolved' && q4.pinned.manifestDigest).toBe(`sha256:${'1'.repeat(64)}`)
    expect(q8.status === 'resolved' && q8.pinned.manifestDigest).toBe(`sha256:${'2'.repeat(64)}`)
  })

  test('un tamaño que no coincide con el catálogo no se resuelve: el contenido no es el declarado', async () => {
    const resolver = createIndexedArtifactResolver(ArtifactLocationIndex.of([location(Q4, 1)]))
    expect((await resolver.resolve(artifact(Q4, 397807712))).status).toBe('not_materializable')
  })
})

describe('ArtifactLocationIndex', () => {
  let dir: string
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'artifact-locations-')) })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  test('se persiste y se relee igual; un archivo ausente es un índice vacío', async () => {
    const path = join(dir, 'artifact-locations.json')
    expect((await loadArtifactLocationIndex(path)).locations()).toEqual([])
    await saveArtifactLocationIndex(path, ArtifactLocationIndex.of([location(Q4, 397807712)]))
    expect((await loadArtifactLocationIndex(path)).locations()).toEqual([location(Q4, 397807712)])
  })

  test('registrar la misma ubicación es idempotente; otra para el mismo digest y manifest con otro tamaño rehúsa', () => {
    const index = ArtifactLocationIndex.of([location(Q4, 397807712)])
    expect(index.with(location(Q4, 397807712)).locations()).toHaveLength(1)
    expect(() => index.with(location(Q4, 2))).toThrow(ArtifactLocationConflictError)
  })

  test('una entrada con digest de forma inválida se rehúsa al leer', () => {
    expect(() => ArtifactLocationIndex.of([location('nope', 1)])).toThrow()
  })
})
