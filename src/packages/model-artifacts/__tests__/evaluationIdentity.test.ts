import { describe, expect, test } from 'bun:test'

import { comparisonRefusal, type EvaluationIdentity } from '../evaluationIdentity.ts'

const BASE: EvaluationIdentity = {
  sourceRepository: 'Qwen/Qwen2.5-Coder-1.5B-Instruct',
  sourceRevision: '2e1fd397ee46e1388853d2af2c993145b0f1098a',
  corpusSha256: 'a'.repeat(64),
  imageDigest: `sha256:${'b'.repeat(64)}`,
  toolParameters: 'v1',
}

describe('evaluation identity', () => {
  test('two evaluations with the same identity are comparable', () => {
    expect(comparisonRefusal(BASE, { ...BASE })).toBeUndefined()
  })

  test('names every field that differs', () => {
    const refusal = comparisonRefusal(BASE, { ...BASE, corpusSha256: 'c'.repeat(64), imageDigest: `sha256:${'d'.repeat(64)}` })
    expect(refusal).toContain('corpusSha256')
    expect(refusal).toContain('imageDigest')
    expect(refusal).not.toContain('sourceRevision')
  })

  test('another source model is never comparable', () => {
    expect(comparisonRefusal(BASE, { ...BASE, sourceRepository: 'Qwen/Qwen2.5-Coder-7B-Instruct' })).toContain('sourceRepository')
  })
})
