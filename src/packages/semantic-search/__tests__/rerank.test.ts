/** El reranking matemático por coseno, sin servidor. */
import { describe, expect, test } from 'bun:test'

import { cosineSimilarity, rerankByCosine } from '../rerank.ts'

describe('cosineSimilarity', () => {
  test('vectores paralelos dan 1, opuestos -1, ortogonales 0', () => {
    expect(cosineSimilarity([1, 2], [2, 4])).toBeCloseTo(1, 10)
    expect(cosineSimilarity([1, 2], [-1, -2])).toBeCloseTo(-1, 10)
    expect(cosineSimilarity([1, 0], [0, 3])).toBe(0)
  })

  test('un vector de norma cero da 0, no NaN', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0)
  })
})

describe('rerankByCosine', () => {
  test('ordena de mayor a menor similitud y corta en k', () => {
    const candidates = [
      { embedding: [0, 1], item: 'ortogonal' },
      { embedding: [1, 0.1], item: 'cercano' },
      { embedding: [-1, 0], item: 'opuesto' },
    ]
    expect(rerankByCosine([1, 0], candidates, 2).map(result => result.item)).toEqual(['cercano', 'ortogonal'])
  })
})
