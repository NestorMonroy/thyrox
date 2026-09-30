/**
 * `resolveActiveCertPath` y el directorio de los certificados. La prueba de
 * la referencia que los cubre (`agent-bridge-cert-trust-mismatch`) necesita
 * `install.ts`, que llega con los comandos del sistema.
 */
import { afterEach, expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { resolveActiveCertPath } from '../../src/cert/activeCert.ts'
import { resolveMitmCertDir } from '../../src/cert/rootCa.ts'

const dirs: string[] = []
afterEach(() => {
  while (dirs.length > 0) fs.rmSync(dirs.pop()!, { recursive: true, force: true })
})

function certDir(files: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-active-cert-'))
  dirs.push(dir)
  for (const file of files) fs.writeFileSync(path.join(dir, file), 'x')
  return dir
}

test('a trusted legacy leaf without a CA keeps serving server.crt', () => {
  const dir = certDir(['server.crt', 'server.key'])
  expect(resolveActiveCertPath(dir, false)).toEqual({ certPath: path.join(dir, 'server.crt'), mode: 'use-legacy-leaf' })
})

test('opting in, or a fresh directory, resolves to ca.crt', () => {
  const legacy = certDir(['server.crt', 'server.key'])
  expect(resolveActiveCertPath(legacy, true)).toEqual({ certPath: path.join(legacy, 'ca.crt'), mode: 'use-root-ca' })
  const fresh = certDir([])
  expect(resolveActiveCertPath(fresh, false).certPath).toBe(path.join(fresh, 'ca.crt'))
})

test('the certificate directory is the MITM data directory itself', () => {
  const previous = process.env.THYROX_MITM_DATA_DIR
  process.env.THYROX_MITM_DATA_DIR = '/nonexistent/mitm-home'
  try {
    expect(resolveMitmCertDir()).toBe('/nonexistent/mitm-home')
  } finally {
    if (previous === undefined) delete process.env.THYROX_MITM_DATA_DIR
    else process.env.THYROX_MITM_DATA_DIR = previous
  }
})
