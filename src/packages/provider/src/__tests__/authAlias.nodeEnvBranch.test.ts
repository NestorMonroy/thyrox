/**
 * TASK-THYROX-0324 parte C: `getAnthropicApiKeyWithSource` no ramifica por
 * NODE_ENV. En el ejecutable 2.1.283 (`pb`, chunk-t6pwageh.js) el bloque de
 * modo no interactivo está tras `Le(!1)` (constante falsa): en producción
 * nunca corre. La rama `NODE_ENV === 'test'` lo activaba sólo bajo `bun test`.
 * Las pruebas que quieran ese bloque lo piden con `CI`.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { getAnthropicApiKeyWithSource } from '../authAlias.js'

const KEYS = [
  'CI',
  'ANTHROPIC_API_KEY',
  'THYROX_CODE_OAUTH_TOKEN',
  'THYROX_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR',
  'THYROX_CODE_API_KEY_FILE_DESCRIPTOR',
] as const
const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k]
    delete process.env[k]
  }
})
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})

describe('getAnthropicApiKeyWithSource y NODE_ENV', () => {
  test('bajo NODE_ENV=test sin CI no exige credencial (camino de producción)', () => {
    expect(process.env.NODE_ENV).toBe('test')
    expect(() => getAnthropicApiKeyWithSource()).not.toThrow()
  })

  test('la petición explícita del bloque no interactivo es CI, no el entorno', () => {
    process.env.CI = 'true'
    expect(() => getAnthropicApiKeyWithSource()).toThrow(/ANTHROPIC_API_KEY/)
  })
})
