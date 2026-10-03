import { describe, expect, test } from 'bun:test'

import { InvalidOllamaNameError, repositoryOfOllamaName } from '../ollamaName.js'

describe('repositoryOfOllamaName — `<namespace>/<modelo>-<etiqueta>` del registro', () => {
  test('sin namespace es library, y la etiqueta se pega al modelo', () => {
    expect(repositoryOfOllamaName('qwen2.5:0.5b')).toBe('library/qwen2.5-0.5b')
  })

  test('sin etiqueta es latest', () => {
    expect(repositoryOfOllamaName('qwen3')).toBe('library/qwen3-latest')
  })

  test('con namespace se conserva', () => {
    expect(repositoryOfOllamaName('someone/tiny-model:q4')).toBe('someone/tiny-model-q4')
  })

  test('con host del registro se descarta el host', () => {
    expect(repositoryOfOllamaName('registry.ollama.ai/library/llama3.2:1b')).toBe('library/llama3.2-1b')
  })

  test('un nombre vacío o con más de tres segmentos se rehúsa', () => {
    expect(() => repositoryOfOllamaName('')).toThrow(InvalidOllamaNameError)
    expect(() => repositoryOfOllamaName('a/b/c/d:e')).toThrow(InvalidOllamaNameError)
  })
})
