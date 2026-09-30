// Portado de omniroute: tests/unit/agent-bridge-cert-trust-mismatch.test.ts (MIT), sobre
// bun:test: la comprobación de confianza apunta al mismo archivo que el modelo activo
// instala, y por tanto a la misma huella. Los certificados viven en THYROX_MITM_DATA_DIR.
import { afterEach, test } from 'bun:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { resolveActiveCertPath } from '../../src/cert/activeCert.ts'
import { generateCert } from '../../src/cert/generate.ts'
import { certutilThumbprint } from '../../src/cert/install.ts'
import { decideCertMigration } from '../../src/cert/migration.ts'
import { loadOrCreateMitmCa } from '../../src/cert/rootCa.ts'

const cleanups: Array<() => void> = []
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
})

function dataDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-cert-trust-'))
  const previous = process.env.THYROX_MITM_DATA_DIR
  process.env.THYROX_MITM_DATA_DIR = dir
  cleanups.push(() => {
    if (previous === undefined) delete process.env.THYROX_MITM_DATA_DIR
    else process.env.THYROX_MITM_DATA_DIR = previous
    fs.rmSync(dir, { recursive: true, force: true })
  })
  return dir
}

test('with a leaf and a CA pair, the trust check targets the CA that gets installed', async () => {
  const dir = dataDir()
  await generateCert()
  const ca = await loadOrCreateMitmCa(dir)
  assert.equal(decideCertMigration(dir, false), 'use-root-ca')
  const { certPath, mode } = resolveActiveCertPath(dir, false)
  assert.equal(mode, 'use-root-ca')
  assert.equal(certPath, ca.certPath)
  assert.equal(certutilThumbprint(certPath), certutilThumbprint(ca.certPath))
  assert.notEqual(certutilThumbprint(certPath), certutilThumbprint(path.join(dir, 'server.crt')))
})

test('a legacy-only install keeps targeting server.crt', async () => {
  const dir = dataDir()
  await generateCert()
  assert.equal(fs.existsSync(path.join(dir, 'ca.crt')), false)
  assert.deepEqual(resolveActiveCertPath(dir, false), {
    certPath: path.join(dir, 'server.crt'),
    mode: 'use-legacy-leaf',
  })
})
