/**
 * La suite de embeddings derivada de un corpus propio: cada registro aporta
 * su resumen como consulta y su contenido como documento relevante; los
 * distractores son contenidos de otros registros. La selección es
 * determinista por semilla, así que la suite se regenera idéntica.
 */
import { describe, expect, test } from 'bun:test'

import { InsufficientCorpusError, buildEmbeddingSuiteFromCorpus, type CorpusRecord } from '../embeddingSuiteFromCorpus.js'

const RECORDS: readonly CorpusRecord[] = Array.from({ length: 12 }, (_, index) => ({
  id: `H-${index}`,
  summary: `summary ${index}`,
  content: `content ${index}`,
}))

const OPTIONS = { id: 'embedding-findings@1', caseCount: 4, distractorsPerCase: 3, seed: 'thyrox' }

describe('buildEmbeddingSuiteFromCorpus', () => {
  test('each case pairs a summary with its own content and others as distractors', () => {
    const suite = buildEmbeddingSuiteFromCorpus(RECORDS, OPTIONS)
    expect(suite.id).toBe('embedding-findings@1')
    expect(suite.cases).toHaveLength(4)
    for (const embeddingCase of suite.cases) {
      const record = RECORDS.find(candidate => candidate.id === embeddingCase.id)!
      expect(embeddingCase.query).toBe(record.summary)
      expect(embeddingCase.relevant).toBe(record.content)
      expect(embeddingCase.distractors).toHaveLength(3)
      expect(embeddingCase.distractors).not.toContain(record.content)
      expect(new Set(embeddingCase.distractors).size).toBe(3)
    }
  })

  test('the same seed yields the same suite; another seed, another selection', () => {
    expect(buildEmbeddingSuiteFromCorpus(RECORDS, OPTIONS)).toEqual(buildEmbeddingSuiteFromCorpus([...RECORDS].reverse(), OPTIONS))
    const other = buildEmbeddingSuiteFromCorpus(RECORDS, { ...OPTIONS, seed: 'other' })
    expect(other.cases.map(item => item.id)).not.toEqual(buildEmbeddingSuiteFromCorpus(RECORDS, OPTIONS).cases.map(item => item.id))
  })

  test('a record whose summary is empty or equals its content is not a case', () => {
    const trivial = [{ id: 'same', summary: 'x', content: 'x' }, { id: 'empty', summary: '', content: 'y' }]
    const suite = buildEmbeddingSuiteFromCorpus([...RECORDS, ...trivial], { ...OPTIONS, caseCount: 9 })
    expect(suite.cases.map(item => item.id)).not.toContain('same')
    expect(suite.cases.map(item => item.id)).not.toContain('empty')
  })

  test('a corpus too small for the cases and their distractors is refused', () => {
    expect(() => buildEmbeddingSuiteFromCorpus(RECORDS.slice(0, 3), OPTIONS)).toThrow(InsufficientCorpusError)
  })
})
