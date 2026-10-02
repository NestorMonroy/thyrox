/**
 * La suite de cualificación de embeddings: se lee con su forma declarada y
 * cada caso se puntúa por recuperación — la consulta tiene que quedar más
 * cerca, por coseno, de su documento relevante que de cada distractor.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { InvalidEmbeddingSuiteError, InvalidEmbeddingVectorError, loadEmbeddingSuite, scoreEmbeddingCase } from '../embeddingSuite.js'

let root: string

beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'embedding-suite-')) })
afterEach(() => rmSync(root, { recursive: true, force: true }))

function suiteFile(document: unknown): string {
  const path = join(root, 'suite.json')
  writeFileSync(path, JSON.stringify(document))
  return path
}

const VALID_CASE = { id: 'retrieval', query: 'how to cancel a job', relevant: 'cancel a running job with stop', distractors: ['bake bread'] }

describe('loadEmbeddingSuite', () => {
  test('reads the id and its cases', async () => {
    const suite = await loadEmbeddingSuite(suiteFile({ id: 'embedding@1', cases: [VALID_CASE] }))
    expect(suite).toEqual({ id: 'embedding@1', cases: [VALID_CASE] })
  })

  test('a case without distractors is refused: it would pass any model', async () => {
    const path = suiteFile({ id: 'embedding@1', cases: [{ ...VALID_CASE, distractors: [] }] })
    await expect(loadEmbeddingSuite(path)).rejects.toThrow(InvalidEmbeddingSuiteError)
    await expect(loadEmbeddingSuite(path)).rejects.toThrow('cases[0].distractors')
  })

  test('an empty query is refused with its field', async () => {
    const path = suiteFile({ id: 'embedding@1', cases: [{ ...VALID_CASE, query: '' }] })
    await expect(loadEmbeddingSuite(path)).rejects.toThrow('cases[0].query')
  })

  test('a suite without cases is refused', async () => {
    await expect(loadEmbeddingSuite(suiteFile({ id: 'embedding@1', cases: [] }))).rejects.toThrow('cases')
  })
})

describe('scoreEmbeddingCase', () => {
  test('passes when the relevant document is the nearest by cosine', () => {
    const score = scoreEmbeddingCase({ query: [1, 0], relevant: [0.9, 0.1], distractors: [[0, 1], [0.5, 0.5]] })
    expect(score.passed).toBe(true)
    expect(score.margin).toBeGreaterThan(0)
  })

  test('fails when a distractor is at least as near as the relevant document', () => {
    const score = scoreEmbeddingCase({ query: [1, 0], relevant: [0, 1], distractors: [[1, 0]] })
    expect(score.passed).toBe(false)
    expect(score.margin).toBeLessThan(0)
  })

  test('cosine ignores the vector norm', () => {
    expect(scoreEmbeddingCase({ query: [2, 0], relevant: [10, 1], distractors: [[0, 3]] }).passed).toBe(true)
  })

  test('vectors of different dimensions are refused, not scored', () => {
    expect(() => scoreEmbeddingCase({ query: [1, 0], relevant: [1, 0, 0], distractors: [[0, 1]] })).toThrow(InvalidEmbeddingVectorError)
  })

  test('a zero vector is refused: its cosine is undefined', () => {
    expect(() => scoreEmbeddingCase({ query: [0, 0], relevant: [1, 0], distractors: [[0, 1]] })).toThrow(InvalidEmbeddingVectorError)
  })
})
