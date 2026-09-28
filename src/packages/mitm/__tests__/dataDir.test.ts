/**
 * El hogar de datos del MITM (certificados, estado) cuelga del hogar de
 * configuración de thyrox, no de uno propio: `<THYROX_CONFIG_DIR>/mitm`, o lo
 * que declare `THYROX_MITM_DATA_DIR`.
 */
import { afterEach, expect, test } from 'bun:test'
import { join, resolve } from 'node:path'
import { resolveMitmDataDir } from '../src/dataDir.ts'

const saved = { mitm: process.env.THYROX_MITM_DATA_DIR, config: process.env.THYROX_CONFIG_DIR }
afterEach(() => {
  for (const [key, value] of [['THYROX_MITM_DATA_DIR', saved.mitm], ['THYROX_CONFIG_DIR', saved.config]] as const) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

test('sin declaración propia, cuelga del hogar de configuración', () => {
  delete process.env.THYROX_MITM_DATA_DIR
  process.env.THYROX_CONFIG_DIR = '/srv/hogar-thyrox'
  expect(resolveMitmDataDir()).toBe(join('/srv/hogar-thyrox', 'mitm'))
})

test('THYROX_MITM_DATA_DIR gana y se resuelve a ruta absoluta', () => {
  process.env.THYROX_MITM_DATA_DIR = 'relativo/mitm'
  expect(resolveMitmDataDir()).toBe(resolve('relativo/mitm'))
})

test('THYROX_MITM_DATA_DIR vacía no cuenta como declarada', () => {
  process.env.THYROX_MITM_DATA_DIR = '   '
  process.env.THYROX_CONFIG_DIR = '/srv/otro'
  expect(resolveMitmDataDir()).toBe(join('/srv/otro', 'mitm'))
})
