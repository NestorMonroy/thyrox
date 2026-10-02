/**
 * La identidad de un snapshot de safetensors (TASK-THYROX-0776): el sha256 de su
 * manifiesto. El vector es el mismo que fija la prueba del servidor de Python;
 * si una de las dos implementaciones cambia la definición, una de las dos cae.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { snapshotManifestDigest } from '../snapshotManifest.ts'

const FIXTURE_DIGEST = 'cc1e6e274ac2815eab8e6782a50160c38de6bb0657938423fd337900020979d9'

let directory: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'snapshot-manifest-'))
  mkdirSync(join(directory, 'nested'))
  writeFileSync(join(directory, 'config.json'), '{"torch_dtype": "float32"}')
  writeFileSync(join(directory, 'model.safetensors'), 'weights')
  writeFileSync(join(directory, 'nested', 'spiece.model'), 'vocab')
})

afterEach(() => rmSync(directory, { recursive: true, force: true }))

describe('snapshotManifestDigest', () => {
  test('coincide con el vector compartido con el servidor de Python', async () => {
    expect(await snapshotManifestDigest(directory)).toBe(FIXTURE_DIGEST)
  })

  test('un byte distinto en cualquier archivo cambia la identidad', async () => {
    writeFileSync(join(directory, 'nested', 'spiece.model'), 'vocaB')
    expect(await snapshotManifestDigest(directory)).not.toBe(FIXTURE_DIGEST)
  })

  test('un archivo de más también la cambia', async () => {
    writeFileSync(join(directory, 'README.md'), '')
    expect(await snapshotManifestDigest(directory)).not.toBe(FIXTURE_DIGEST)
  })
})
