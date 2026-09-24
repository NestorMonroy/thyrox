/**
 * `but` de 2.1.275 (`chunk-q2gh92k2.js`) y la frontera dinámica del prompt.
 * El texto que lee el modelo es propio; lo que se fija es la forma.
 */
import { describe, expect, test } from 'bun:test'
import { enhanceSystemPromptWithEnvDetails, SYSTEM_PROMPT_DYNAMIC_BOUNDARY } from '../prompts.ts'

describe('enhanceSystemPromptWithEnvDetails', () => {
  test('conserva el prompt y añade la nota de pares y las notas del subagente', async () => {
    const out = await enhanceSystemPromptWithEnvDetails(['BASE'], 'claude-sonnet-5')
    expect(out[0]).toBe('BASE')
    expect(out).toHaveLength(3)
    expect(out[1]).toMatch(/consent|approval/i)
    expect(out[2].startsWith('Notes:')).toBe(true)
    expect(out[2]).toMatch(/absolute/i)
    expect(out[2]).toMatch(/emoji/i)
  })
  test('no muta la lista recibida', async () => {
    const input = ['A', 'B']
    await enhanceSystemPromptWithEnvDetails(input, 'm')
    expect(input).toEqual(['A', 'B'])
  })
})

describe('SYSTEM_PROMPT_DYNAMIC_BOUNDARY', () => {
  test('es el marcador literal del binario', () => {
    expect(SYSTEM_PROMPT_DYNAMIC_BOUNDARY).toBe('__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__')
  })
})
