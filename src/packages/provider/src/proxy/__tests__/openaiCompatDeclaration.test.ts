/**
 * La declaración por entorno del upstream compatible con OpenAI que
 * `bin/localProxy.ts` lee: ausente, completa o a medias.
 */
import { describe, expect, test } from 'bun:test'
import { BASE_URL_ENV, API_KEY_ENV, MODEL_ENV, openAICompatDeclarationOf } from '../openaiCompat/declaration.ts'

describe('openAICompatDeclarationOf', () => {
  test('sin base ni modelo no hay declaración', () => {
    expect(openAICompatDeclarationOf({})).toBeUndefined()
    expect(openAICompatDeclarationOf({ [BASE_URL_ENV]: '', [MODEL_ENV]: '' })).toBeUndefined()
  })

  test('base y modelo declaran el upstream; la clave es opcional', () => {
    expect(openAICompatDeclarationOf({ [BASE_URL_ENV]: 'http://h:1/v1', [MODEL_ENV]: 'qwen' })).toEqual({ baseUrl: 'http://h:1/v1', model: 'qwen', apiKey: undefined })
    expect(openAICompatDeclarationOf({ [BASE_URL_ENV]: 'http://h:1/v1', [MODEL_ENV]: 'qwen', [API_KEY_ENV]: 'k' })?.apiKey).toBe('k')
  })

  test('a medias rehúsa nombrando la variable que falta', () => {
    expect(() => openAICompatDeclarationOf({ [BASE_URL_ENV]: 'http://h:1/v1' })).toThrow(MODEL_ENV)
    expect(() => openAICompatDeclarationOf({ [MODEL_ENV]: 'qwen' })).toThrow(BASE_URL_ENV)
  })
})
