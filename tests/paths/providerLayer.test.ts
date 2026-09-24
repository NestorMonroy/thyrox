/**
 * La capa del `.env` del PROVEEDOR en `reach.ts` — paridad con
 * `tests/paths/test_declaration_port.py::ProviderLayer`.
 *
 * `reach.py` la ganó en `thyrox@400fc454` y `reach.ts` no: medido desde el
 * consumidor, `env_value('THYROX_WORKBENCH_DOCS', kaupamex-docs)` daba la ruta
 * en Python y `null` en TypeScript. Lanzado desde thyrox coincidían, pero
 * sólo porque Bun carga por su cuenta el `.env` del cwd — el del proveedor.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { productionDeclarations } from '../../src/paths/reach.ts'

const KEYS = ['THYROX_CAPA_DOCS', 'THYROX_COMPARTIDA_DOCS', 'THYROX_CAPA_API', 'THYROX_CAPA_DIR', 'THYROX_ENV_FILE']
let base: string
let provider: string
let consumer: string
let saved: Record<string, string | undefined>

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'capa-proveedor-'))
  provider = join(base, 'thyrox')
  mkdirSync(join(provider, 'src', 'paths'), { recursive: true })
  writeFileSync(join(provider, 'src', 'paths', 'reach.py'), '')
  writeFileSync(join(provider, '.env'),
    'THYROX_CAPA_DOCS=del-proveedor-para-docs\n' +
    'THYROX_COMPARTIDA_DOCS=del-proveedor\n' +
    'THYROX_CAPA_API=del-proveedor-para-api\n' +
    'THYROX_CAPA_DIR=hogar-propio-del-proveedor\n')
  consumer = join(base, 'acme-docs')
  mkdirSync(consumer)
  writeFileSync(join(consumer, '.env'), 'THYROX_COMPARTIDA_DOCS=del-consumidor\n')
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]))
  for (const k of KEYS) delete process.env[k]
})
afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  rmSync(base, { recursive: true, force: true })
})

describe('productionDeclarations — capa del .env del proveedor', () => {
  test('la familia por clon cae al proveedor hermano', () => {
    expect(productionDeclarations(consumer).declared('THYROX_CAPA_DOCS')).toBe('del-proveedor-para-docs')
  })
  test('el consumidor gana sobre el proveedor', () => {
    expect(productionDeclarations(consumer).declared('THYROX_COMPARTIDA_DOCS')).toBe('del-consumidor')
  })
  test('el proceso gana sobre los dos', () => {
    process.env.THYROX_COMPARTIDA_DOCS = 'del-proceso'
    expect(productionDeclarations(consumer).declared('THYROX_COMPARTIDA_DOCS')).toBe('del-proceso')
  })
  test('el hogar propio del proveedor no se filtra', () => {
    expect(productionDeclarations(consumer).declared('THYROX_CAPA_DIR')).toBeNull()
  })
  test('la familia de otro clon no se filtra', () => {
    expect(productionDeclarations(consumer).declared('THYROX_CAPA_API')).toBeNull()
  })
  test('sin proveedor hermano no hay capa', () => {
    rmSync(provider, { recursive: true, force: true })
    expect(productionDeclarations(consumer).declared('THYROX_CAPA_DOCS')).toBeNull()
  })
  test('sin .env del proveedor no hay capa ni error', () => {
    unlinkSync(join(provider, '.env'))
    expect(productionDeclarations(consumer).declared('THYROX_CAPA_DOCS')).toBeNull()
  })
  test('THYROX_ENV_FILE declarado apaga la capa', () => {
    process.env.THYROX_ENV_FILE = '/dev/null'
    expect(productionDeclarations(consumer).declared('THYROX_CAPA_DOCS')).toBeNull()
  })
})
