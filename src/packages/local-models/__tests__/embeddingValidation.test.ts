/**
 * La validación de un GGUF de embeddings: un codificador no genera texto ni
 * tiene perplejidad, así que se le pide un vector con `llama-embedding` y se
 * comprueba que su dimensión es la que el propio GGUF declara. Un modelo de
 * generación sigue el camino de siempre.
 */
import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { syntheticGgufBytes, type SyntheticHeader } from '@thyrox/model-artifacts/testing/syntheticGguf.ts'
import { GGUF_FILE_TYPE, GgufValidationError, validateGgufArtifact } from '../ggufValidation.ts'
import type { LabStep } from '../quantizationLab.ts'
import { toolOf, writeCapturedOutput } from '../testing/fakeQuantizationLab.ts'

const scratchDir = mkdtempSync(join(tmpdir(), 'embedding-validation-'))
afterAll(() => rmSync(scratchDir, { recursive: true, force: true }))
writeFileSync(join(scratchDir, 'eval.txt'), 'corpus')

function gguf(name: string, entries: SyntheticHeader['entries']): string {
  const path = join(scratchDir, `${name}.gguf`)
  writeFileSync(path, syntheticGgufBytes({ tensorCount: 1n, entries }))
  return path
}

const embeddingHeader = (declared: number): SyntheticHeader['entries'] => [
  ['general.architecture', { type: 'string', value: 'nomic-bert' }],
  ['general.file_type', { type: 'uint32', value: GGUF_FILE_TYPE.F16 }],
  ['nomic-bert.pooling_type', { type: 'uint32', value: 1 }],
  ['nomic-bert.embedding_length', { type: 'uint32', value: declared }],
]

function lab(produced: number, calls: string[]) {
  return async (step: LabStep) => {
    const tool = toolOf(step)
    calls.push(tool)
    if (tool === 'llama-embedding') {
      const vector = Array.from({ length: produced }, (_, i) => i / produced)
      writeCapturedOutput(scratchDir, step, { stdout: JSON.stringify({ object: 'list', data: [{ object: 'embedding', index: 0, embedding: vector }] }), stderr: '' })
    }
    if (tool === 'llama-simple') writeCapturedOutput(scratchDir, step, { stdout: 'return n', stderr: 'speed: 12.5 t/s' })
    if (tool === 'llama-perplexity') writeCapturedOutput(scratchDir, step, { stdout: '', stderr: 'Final estimate: PPL = 9.87 +/- 0.10' })
    return { exitCode: 0, stdout: '', stderr: '' }
  }
}

const input = (path: string, expectedFileType: number, runInLab: ReturnType<typeof lab>) =>
  ({ path, scratchDir, corpusPath: join(scratchDir, 'eval.txt'), workerId: 'test', expectedFileType, runInLab })

describe('validateGgufArtifact for an embedding model', () => {
  test('measures the vector width instead of generating text', async () => {
    const calls: string[] = []
    const result = await validateGgufArtifact(input(gguf('nomic', embeddingHeader(768)), GGUF_FILE_TYPE.F16, lab(768, calls)))
    expect(result.validation).toEqual({ loaded: true, embeddingDimensions: 768 })
    expect(calls).toEqual(['llama-embedding'])
  })

  test('refuses a vector whose width is not the declared one', async () => {
    const path = gguf('nomic-mismatch', embeddingHeader(768))
    await expect(validateGgufArtifact(input(path, GGUF_FILE_TYPE.F16, lab(384, [])))).rejects.toBeInstanceOf(GgufValidationError)
  })

  test('a generation model keeps the generation and perplexity checks', async () => {
    const calls: string[] = []
    const path = gguf('qwen', [['general.architecture', { type: 'string', value: 'qwen2' }],
      ['general.file_type', { type: 'uint32', value: GGUF_FILE_TYPE.Q4_K_M }]])
    const result = await validateGgufArtifact(input(path, GGUF_FILE_TYPE.Q4_K_M, lab(0, calls)))
    expect(calls).toEqual(['llama-simple', 'llama-perplexity'])
    expect(result.validation).toEqual({ loaded: true, tokensPerSecond: 12.5, perplexity: 9.87 })
  })
})
