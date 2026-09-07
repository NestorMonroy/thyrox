/**
 * Porte fiel de
 * `ccnmt: packages/shell/src/legacy/__tests__/outputLimits.test.ts`.
 *
 * Divergencia medida: la fuente instala un `mock.module` sobre
 * `src/utils/debug.ts` para cortar la cadena de dependencia hacia
 * `bootstrap/state` que trae `getMaxOutputLength` en ese árbol. Aquí
 * `../outputLimits.js` (reexport de `../providers/outputLimits.js`)
 * depende de `@thyrox/config/host` en vez de `debug.ts` — no hay
 * cadena que cortar, así que el mock se omite.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import {
  BASH_MAX_OUTPUT_DEFAULT,
  BASH_MAX_OUTPUT_UPPER_LIMIT,
  getMaxOutputLength,
} from '../outputLimits.js'

describe('outputLimits constants', () => {
  test('BASH_MAX_OUTPUT_UPPER_LIMIT is 150000', () => {
    expect(BASH_MAX_OUTPUT_UPPER_LIMIT).toBe(150_000)
  })

  test('BASH_MAX_OUTPUT_DEFAULT is 30000', () => {
    expect(BASH_MAX_OUTPUT_DEFAULT).toBe(30_000)
  })
})

describe('getMaxOutputLength', () => {
  const saved = process.env.BASH_MAX_OUTPUT_LENGTH

  afterEach(() => {
    if (saved === undefined) delete process.env.BASH_MAX_OUTPUT_LENGTH
    else process.env.BASH_MAX_OUTPUT_LENGTH = saved
  })

  test('returns default when env not set', () => {
    delete process.env.BASH_MAX_OUTPUT_LENGTH
    expect(getMaxOutputLength()).toBe(30_000)
  })

  test('returns parsed value when valid', () => {
    process.env.BASH_MAX_OUTPUT_LENGTH = '50000'
    expect(getMaxOutputLength()).toBe(50_000)
  })

  test('caps at upper limit', () => {
    process.env.BASH_MAX_OUTPUT_LENGTH = '999999'
    expect(getMaxOutputLength()).toBe(150_000)
  })

  test('returns default for invalid value', () => {
    process.env.BASH_MAX_OUTPUT_LENGTH = 'not-a-number'
    expect(getMaxOutputLength()).toBe(30_000)
  })

  test('returns default for negative value', () => {
    process.env.BASH_MAX_OUTPUT_LENGTH = '-1'
    expect(getMaxOutputLength()).toBe(30_000)
  })
})
