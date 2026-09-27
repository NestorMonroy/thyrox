/**
 * El roster de raíces en `reach.ts` se DERIVA, como en `reach_roots()` de
 * Python (H-THYROX-177). Estaba fijado —`['api','db','docs','server','ui']`—
 * y ese literal ataba la mitad TypeScript al multi-repo kaupamex: un árbol
 * `acme-*` no tenía raíces nombrables.
 *
 * Qué haría fallar a estos casos: volver a fijar la lista (caen el derivado y
 * el declarado), ignorar la declaración (cae el declarado) o aceptar un nombre
 * fuera del roster (cae el rechazo).
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cloneName, reachRoots, root } from '../../src/packages/paths/reach.ts'

const KEYS = ['THYROX_REACH_ROOT', 'THYROX_CLONE_PREFIX', 'THYROX_REACH_ROOTS', 'THYROX_ENV_FILE']
let base: string
let saved: Record<string, string | undefined>

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'roster-'))
  for (const name of ['acme-api', 'acme-web', 'thyrox']) mkdirSync(join(base, name))
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]))
  process.env.THYROX_REACH_ROOT = base
  process.env.THYROX_CLONE_PREFIX = 'acme-'
  process.env.THYROX_ENV_FILE = '/dev/null'
  delete process.env.THYROX_REACH_ROOTS
})
afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  rmSync(base, { recursive: true, force: true })
})

describe('the roster is derived, not fixed', () => {
  test('derived from the siblings that carry the prefix', () => {
    expect(reachRoots()).toEqual(['api', 'web'])
  })
  test('a declared roster wins over the derived one', () => {
    process.env.THYROX_REACH_ROOTS = 'web, api'
    expect(reachRoots()).toEqual(['web', 'api'])
  })
  test('names and paths compose with the derived roster', () => {
    expect(cloneName('web')).toBe('acme-web')
    expect(root('web')).toBe(join(base, 'acme-web'))
  })
  test('a name outside the roster is rejected', () => {
    expect(() => cloneName('docs')).toThrow()
  })
})
