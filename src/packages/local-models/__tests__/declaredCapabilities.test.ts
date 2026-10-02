/**
 * La capacidad que un GGUF declara de sí mismo al importarlo: un modelo de
 * embeddings trae `<arquitectura>.pooling_type` ≥ 1 (lo escribe
 * `convert_hf_to_gguf` sólo para modelos de embeddings); uno de generación no
 * lo trae, o lo trae en 0 (ninguno). Antes la importación escribía
 * `completion` fijo y catalogaba un modelo de embeddings como de generación.
 */
import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { syntheticGgufBytes, type SyntheticHeader } from '@thyrox/model-artifacts/testing/syntheticGguf.ts'
import { declaredCapabilitiesOf, GgufValidationError } from '../ggufValidation.ts'

const directory = mkdtempSync(join(tmpdir(), 'declared-capabilities-'))
afterAll(() => rmSync(directory, { recursive: true, force: true }))

function gguf(name: string, entries: SyntheticHeader['entries']): string {
  const path = join(directory, `${name}.gguf`)
  writeFileSync(path, syntheticGgufBytes({ tensorCount: 1n, entries }))
  return path
}

const architecture = (value: string) => ['general.architecture', { type: 'string', value }] as const

describe('declaredCapabilitiesOf', () => {
  test('an embedding model declares embeddings', async () => {
    const path = gguf('embedding', [architecture('nomic-bert'), ['nomic-bert.pooling_type', { type: 'uint32', value: 1 }]])
    expect(await declaredCapabilitiesOf(path)).toEqual(['embeddings'])
  })

  test('a generation model without pooling declares completion', async () => {
    const path = gguf('generation', [architecture('qwen2'), ['qwen2.context_length', { type: 'uint32', value: 32768 }]])
    expect(await declaredCapabilitiesOf(path)).toEqual(['completion'])
  })

  test('pooling type none is not an embedding model', async () => {
    const path = gguf('pooling-none', [architecture('qwen2'), ['qwen2.pooling_type', { type: 'uint32', value: 0 }]])
    expect(await declaredCapabilitiesOf(path)).toEqual(['completion'])
  })

  test('a header without architecture is refused, not guessed', async () => {
    const path = gguf('no-architecture', [['nomic-bert.pooling_type', { type: 'uint32', value: 1 }]])
    await expect(declaredCapabilitiesOf(path)).rejects.toBeInstanceOf(GgufValidationError)
  })
})
