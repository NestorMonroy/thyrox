/**
 * The TypeScript half: a consumer clone without the provider's prefix.
 *
 * H-THYROX-176 y H-THYROX-177 en la mitad TypeScript. `reach.ts` fijaba
 * `CLONE_PREFIX = 'kaupamex-'`, un literal que la mitad Python ya había
 * retirado derivándolo, y `cloneSuffixOf` tomaba lo que sigue al ÚLTIMO guion
 * (`ai-course-notes` -> `NOTES`). El prefijo se declara
 * (`THYROX_CLONE_PREFIX`) o se deriva de los hermanos, y es opcional: un clon
 * que no lo lleva se nombra entero.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { cloneName, clonePrefix, cloneShortName, cloneSuffixOf } from '../../src/packages/paths/reach.ts'

let base: string
const saved: Record<string, string | undefined> = {}
const VARS = ['THYROX_ENV_FILE', 'THYROX_REACH_ROOT', 'THYROX_CLONE_PREFIX', 'THYROX_REACH_ROOTS', 'KAUPAMEX_ROOT']

beforeEach(() => {
  base = resolve(mkdtempSync(join(tmpdir(), 'unprefixed-clone-')))
  for (const name of ['kaupamex-docs', 'kaupamex-api', 'ai-course-notes']) {
    mkdirSync(join(base, name, '.git'), { recursive: true })
    mkdirSync(join(base, name, 'sub'))
  }
  writeFileSync(join(base, 'empty.env'), '')
  for (const v of VARS) saved[v] = process.env[v]
  process.env.THYROX_ENV_FILE = join(base, 'empty.env')
  process.env.THYROX_REACH_ROOT = base
  delete process.env.THYROX_CLONE_PREFIX
  delete process.env.KAUPAMEX_ROOT
})

afterEach(() => {
  for (const v of VARS) {
    if (saved[v] === undefined) delete process.env[v]
    else process.env[v] = saved[v]
  }
  rmSync(base, { recursive: true, force: true })
})

describe('the clone prefix is declared or derived, never fixed', () => {
  test('derived from the siblings when two share it', () => {
    expect(clonePrefix()).toBe('kaupamex-')
  })
  test('the declared one wins', () => {
    process.env.THYROX_CLONE_PREFIX = 'otro-'
    // Ningún hermano lleva el prefijo declarado: el roster se declara.
    process.env.THYROX_REACH_ROOTS = 'docs'
    expect(clonePrefix()).toBe('otro-')
    expect(cloneName('docs')).toBe('otro-docs')
  })
})

describe('a clone without the prefix keeps its whole name', () => {
  test('short name with and without prefix', () => {
    expect(cloneShortName(join(base, 'kaupamex-docs', 'sub'))).toBe('docs')
    expect(cloneShortName(join(base, 'ai-course-notes', 'sub'))).toBe('ai-course-notes')
    expect(cloneShortName(base)).toBeNull()
  })
  test('the per-clone suffix is the whole short name', () => {
    expect(cloneSuffixOf(join(base, 'ai-course-notes'))).toBe('AI_COURSE_NOTES')
    expect(cloneSuffixOf(join(base, 'kaupamex-docs'))).toBe('DOCS')
  })
})
