import { describe, expect, test } from 'bun:test'

import {
  InvalidModelNameInputError,
  OLLAMA_NAME_PART_MAX_LENGTH,
  parseThyroxModelName,
  thyroxModelName,
} from '../modelName.js'
import { UnknownQuantizationLevelError } from '../quantizationLevel.js'

const HF_COMMIT = '7ae557604adf67be50417f59c2c2f167def9a775'
const OLLAMA_DIGEST = 'a8b0c5157701' + '0'.repeat(52)

describe('thyroxModelName — ejemplos fijados verbatim', () => {
  test('fuente de Hugging Face', () => {
    expect(thyroxModelName({
      repository: 'Qwen/Qwen2.5-0.5B-Instruct', quantization: 'q4_K_M', source: 'hf', revision: HF_COMMIT,
    })).toBe('thyrox-qwen--qwen2.5-0.5b-instruct:q4_k_m-hf-7ae557604adf')
  })

  test('registro de Ollama, con el digest del manifiesto con prefijo sha256:', () => {
    expect(thyroxModelName({
      repository: 'library/qwen2.5-0.5b', quantization: 'Q4_K_M', source: 'ollama', revision: `sha256:${OLLAMA_DIGEST}`,
    })).toBe('thyrox-library--qwen2.5-0.5b:q4_k_m-ollama-a8b0c5157701')
  })

  test('registro de Ollama, con el digest pelado como lo da /api/tags', () => {
    expect(thyroxModelName({
      repository: 'library/qwen2.5-0.5b', quantization: 'Q4_K_M', source: 'ollama', revision: OLLAMA_DIGEST,
    })).toBe('thyrox-library--qwen2.5-0.5b:q4_k_m-ollama-a8b0c5157701')
  })

  test('el alias de nivel da el mismo nombre que el canónico', () => {
    const base = { repository: 'Qwen/Qwen2.5-0.5B-Instruct', source: 'hf', revision: HF_COMMIT } as const
    expect(thyroxModelName({ ...base, quantization: 'Q4_K' })).toBe(thyroxModelName({ ...base, quantization: 'Q4_K_M' }))
  })
})

describe('thyroxModelName — rehúsa con nombre', () => {
  const valid = { repository: 'Qwen/Qwen2.5-0.5B-Instruct', quantization: 'q8_0', source: 'hf', revision: HF_COMMIT } as const

  test('un repositorio sin /', () => {
    expect(() => thyroxModelName({ ...valid, repository: 'qwen2.5' })).toThrow(InvalidModelNameInputError)
    expect(() => thyroxModelName({ ...valid, repository: 'qwen2.5' })).toThrow(/repository/)
  })

  test('un repositorio con más de una /', () => {
    expect(() => thyroxModelName({ ...valid, repository: 'a/b/c' })).toThrow(InvalidModelNameInputError)
  })

  test('una organización con -- no volvería por el inverso', () => {
    expect(() => thyroxModelName({ ...valid, repository: 'my--org/model' })).toThrow(InvalidModelNameInputError)
  })

  test('un carácter que Ollama no admite', () => {
    expect(() => thyroxModelName({ ...valid, repository: 'org/model+ft' })).toThrow(/model\+ft/)
  })

  test('una revisión que no es hex', () => {
    expect(() => thyroxModelName({ ...valid, revision: 'main' })).toThrow(InvalidModelNameInputError)
    expect(() => thyroxModelName({ ...valid, revision: 'main' })).toThrow(/revision/)
    expect(() => thyroxModelName({ ...valid, revision: 'z'.repeat(40) })).toThrow(InvalidModelNameInputError)
  })

  test('una revisión con la longitud de la otra fuente', () => {
    expect(() => thyroxModelName({ ...valid, revision: OLLAMA_DIGEST })).toThrow(InvalidModelNameInputError)
    expect(() => thyroxModelName({ ...valid, source: 'ollama', revision: HF_COMMIT })).toThrow(InvalidModelNameInputError)
  })

  test('una fuente desconocida', () => {
    expect(() => thyroxModelName({ ...valid, source: 'gitlab' as 'hf' })).toThrow(/source/)
  })

  test('un nivel desconocido', () => {
    expect(() => thyroxModelName({ ...valid, quantization: 'q9_z' })).toThrow(UnknownQuantizationLevelError)
  })

  test('un nombre de modelo más largo que lo que Ollama admite', () => {
    const fits = 'r'.repeat(OLLAMA_NAME_PART_MAX_LENGTH - 'thyrox-o--'.length)
    expect(() => thyroxModelName({ ...valid, repository: `o/${fits}` })).not.toThrow()
    expect(() => thyroxModelName({ ...valid, repository: `o/${fits}r` })).toThrow(/80/)
  })
})

describe('parseThyroxModelName', () => {
  test('devuelve las partes del nombre', () => {
    expect(parseThyroxModelName('thyrox-qwen--qwen2.5-0.5b-instruct:q4_k_m-hf-7ae557604adf')).toEqual({
      repository: 'qwen/qwen2.5-0.5b-instruct', quantization: 'q4_k_m', source: 'hf', revision: '7ae557604adf',
    })
  })

  test('ida y vuelta es la identidad', () => {
    for (const name of [
      'thyrox-qwen--qwen2.5-0.5b-instruct:q4_k_m-hf-7ae557604adf',
      'thyrox-library--qwen2.5-0.5b:q4_k_m-ollama-a8b0c5157701',
      'thyrox-org--repo--with--dashes:int4-hf-0123456789ab',
    ]) {
      const parts = parseThyroxModelName(name)
      expect(parts).toBeDefined()
      expect(thyroxModelName(parts!)).toBe(name)
    }
  })

  test('un nombre que no es de thyrox da undefined', () => {
    for (const name of [
      'qwen2.5:0.5b',
      'thyrox-qwen2.5-0.5b-instruct:q8_0',
      'thyrox-qwen--x:q4_k_m-hf-7ae557604ad',
      'thyrox-qwen--x:q4_k_m-gitlab-7ae557604adf',
      'thyrox-qwen--x:q9_z-hf-7ae557604adf',
      'thyrox-Qwen--x:q4_k_m-hf-7ae557604adf',
      'thyrox---x:q4_k_m-hf-7ae557604adf',
    ]) {
      expect(parseThyroxModelName(name)).toBeUndefined()
    }
  })
})
