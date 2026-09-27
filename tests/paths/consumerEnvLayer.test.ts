/**
 * El `.env` del CONSUMIDOR gana cuando se invoca desde su clon — gemelo de
 * `tests/paths/test_consumer_env_layer.py` (H-THYROX-178). La capa es
 * ADITIVA: va antes del `.env` del proveedor, no en su lugar.
 *
 * Qué haría fallar a estos casos: no leer el `.env` del consumidor (cae el 1),
 * sustituir en vez de apilar (cae el 2), tratar como consumidor un directorio
 * fuera de un clon (cae el 3) o ignorar un `THYROX_ENV_FILE` declarado (cae el 4).
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ENV_FILE_VAR, envValue } from '../../src/packages/paths/reach.ts'

const KEY = 'THYROX_H178_PROBE'
const PROVIDER_KEY = 'THYROX_CLONE_PREFIX'
let base: string
let clone: string
let outside: string
let cwd: string
let saved: Record<string, string | undefined>

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'capa-consumidor-'))
  clone = join(base, 'ai-course-notes')
  mkdirSync(join(clone, 'tools'), { recursive: true })
  execFileSync('git', ['init', '-q', clone])
  writeFileSync(join(clone, '.env'), `${KEY}=del-consumidor\n`)
  outside = join(base, 'fuera')
  mkdirSync(outside)
  cwd = process.cwd()
  saved = Object.fromEntries([KEY, PROVIDER_KEY, ENV_FILE_VAR].map((k) => [k, process.env[k]]))
  for (const k of [KEY, PROVIDER_KEY, ENV_FILE_VAR]) delete process.env[k]
})
afterEach(() => {
  process.chdir(cwd)
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  rmSync(base, { recursive: true, force: true })
})

describe('the consumer .env is layered over the provider one', () => {
  test('from inside the consumer its .env is read', () => {
    process.chdir(join(clone, 'tools'))
    expect(envValue(KEY)).toBe('del-consumidor')
  })
  test('the provider .env still answers what the consumer omits', () => {
    const expected = envValue(PROVIDER_KEY)
    expect(expected).toBeTruthy()
    process.chdir(clone)
    expect(envValue(PROVIDER_KEY)).toBe(expected)
  })
  test('outside a clone nothing changes', () => {
    process.chdir(outside)
    expect(envValue(KEY)).toBeNull()
  })
  test('a clone with the provider marker is not a consumer', () => {
    mkdirSync(join(clone, 'src', 'paths'), { recursive: true })
    writeFileSync(join(clone, 'src', 'paths', 'reach.py'), '')
    process.chdir(clone)
    expect(envValue(KEY)).toBeNull()
  })
  test('a declared env file still governs', () => {
    process.chdir(clone)
    process.env[ENV_FILE_VAR] = '/dev/null'
    expect(envValue(KEY)).toBeNull()
  })
})
