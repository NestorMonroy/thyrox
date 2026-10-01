/**
 * De dónde sale la CA del upstream al arrancar: la variable de entorno gana a
 * la ruta guardada, sin ninguna de las dos no hay CA, y una ruta inválida no
 * impide arrancar.
 *
 * Porte de `omniroute: tests/unit/mitm-upstream-ca-wiring.test.ts` (MIT), en
 * sus casos del gestor. Los de la ruta `POST upstream-ca` son de la fase de
 * rutas de API.
 */
import { expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { applyUpstreamCa, resolveUpstreamCaPath, writeStoredUpstreamCaPath } from '../../src/manager.ts'

test('THYROX_MITM_UPSTREAM_CA_CERT wins over the stored path', () => {
  expect(resolveUpstreamCaPath({ THYROX_MITM_UPSTREAM_CA_CERT: '/env/ca.pem' }, () => '/stored/ca.pem')).toBe('/env/ca.pem')
})

test('without the variable the stored path is used', () => {
  expect(resolveUpstreamCaPath({}, () => '/stored/ca.pem')).toBe('/stored/ca.pem')
})

test('with neither there is no upstream CA', () => {
  expect(resolveUpstreamCaPath({}, () => null)).toBeNull()
  expect(resolveUpstreamCaPath({ THYROX_MITM_UPSTREAM_CA_CERT: '' }, () => null)).toBeNull()
})

test('an invalid path is logged and does not stop the start', () => {
  const errors: string[] = []
  expect(() =>
    applyUpstreamCa('/does/not/exist.pem', (message, level) => {
      if (level === 'error') errors.push(message)
    }),
  ).not.toThrow()
  expect(errors.join('\n')).toContain('upstream CA path invalid')
})

test('no path configures nothing and logs nothing', () => {
  const lines: string[] = []
  applyUpstreamCa(null, message => lines.push(message))
  expect(lines).toEqual([])
})

test('the path the API stores is the one the next start reads', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-upstream-ca-'))
  const previous = process.env.THYROX_MITM_DATA_DIR
  process.env.THYROX_MITM_DATA_DIR = path.join(dir, 'nested')
  try {
    writeStoredUpstreamCaPath('/etc/ssl/corp-ca.pem')
    expect(resolveUpstreamCaPath({})).toBe('/etc/ssl/corp-ca.pem')
  } finally {
    if (previous === undefined) delete process.env.THYROX_MITM_DATA_DIR
    else process.env.THYROX_MITM_DATA_DIR = previous
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
