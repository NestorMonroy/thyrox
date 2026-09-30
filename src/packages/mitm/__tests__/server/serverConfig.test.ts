// La configuración del servidor MITM, leída del entorno (omniroute: src/mitm/server.cjs, MIT).
// Cada variable THYROX_* tiene aquí su caso; el destino y la clave del proxy local son los
// de @thyrox/provider (THYROX_PROXY_*), los mismos que usan los handlers.
import { test } from 'bun:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { loadTargetHosts, readMitmServerConfig } from '../../src/server/serverConfig.ts'

test('the defaults: port 443, legacy certs, verbose 1, TLS verified, no ingest', () => {
  const previous = process.env.THYROX_MITM_DATA_DIR
  process.env.THYROX_MITM_DATA_DIR = '/data/mitm'
  const config = readMitmServerConfig({})
  if (previous === undefined) delete process.env.THYROX_MITM_DATA_DIR
  else process.env.THYROX_MITM_DATA_DIR = previous
  assert.equal(config.localPort, 443)
  assert.equal(config.certMode, 'legacy')
  assert.equal(config.verbose, 1)
  assert.equal(config.disableTlsVerify, false)
  assert.equal(config.ingestToken, '')
  assert.equal(config.ingestBaseUrl, '')
  assert.equal(config.dataDir, '/data/mitm')
  assert.equal(config.routerBaseUrl, 'http://127.0.0.1:20128')
  assert.equal(config.apiKey, '')
})

test('THYROX_MITM_LOCAL_PORT is used only when it is a valid port', () => {
  assert.equal(readMitmServerConfig({ THYROX_MITM_LOCAL_PORT: '8443' }).localPort, 8443)
  for (const bad of ['0', '70000', 'x', '-1']) {
    assert.equal(readMitmServerConfig({ THYROX_MITM_LOCAL_PORT: bad }).localPort, 443, bad)
  }
})

test('THYROX_MITM_CERT_MODE selects the root CA only for root-ca', () => {
  assert.equal(readMitmServerConfig({ THYROX_MITM_CERT_MODE: 'root-ca' }).certMode, 'root-ca')
  assert.equal(readMitmServerConfig({ THYROX_MITM_CERT_MODE: 'other' }).certMode, 'legacy')
})

test('THYROX_MITM_VERBOSE, THYROX_MITM_DISABLE_TLS_VERIFY and the ingest token', () => {
  const config = readMitmServerConfig({
    THYROX_MITM_VERBOSE: '0',
    THYROX_MITM_DISABLE_TLS_VERIFY: '1',
    THYROX_INSPECTOR_INTERNAL_INGEST_TOKEN: 'tok',
  })
  assert.equal(config.verbose, 0)
  assert.equal(config.disableTlsVerify, true)
  assert.equal(config.ingestToken, 'tok')
  assert.equal(readMitmServerConfig({ THYROX_MITM_DISABLE_TLS_VERIFY: 'true' }).disableTlsVerify, false)
})

test('the router comes from the local proxy declaration', () => {
  const config = readMitmServerConfig({ THYROX_PROXY_PORT: '3030', THYROX_PROXY_API_KEYS: 'k1,k2' })
  assert.equal(config.routerBaseUrl, 'http://127.0.0.1:3030')
  assert.equal(config.apiKey, 'k1')
})

function tempFile(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-targets-'))
  const file = path.join(dir, 'targets.json')
  fs.writeFileSync(file, content)
  return file
}

test('the antigravity hosts are the baseline, and targets.json adds more by agent', () => {
  const file = tempFile(
    JSON.stringify({
      targets: [
        { id: 'cursor', hosts: ['API2.cursor.sh'] },
        { id: 'codex', hosts: ['cloudcode-pa.googleapis.com', '', 7] },
        { hosts: ['nameless.example.com'] },
        null,
      ],
    }),
  )
  const hosts = loadTargetHosts(file)
  assert.equal(hosts.get('daily-cloudcode-pa.googleapis.com'), 'antigravity')
  assert.equal(hosts.get('cloudcode-pa.googleapis.com'), 'antigravity')
  assert.equal(hosts.get('api2.cursor.sh'), 'cursor')
  assert.equal(hosts.get('nameless.example.com'), 'unknown')
  assert.equal(hosts.size, 6)
})

test('a missing or malformed targets.json keeps only the baseline', () => {
  assert.equal(loadTargetHosts('/nonexistent/targets.json').size, 4)
  assert.equal(loadTargetHosts(tempFile('{not json')).size, 4)
  assert.equal(loadTargetHosts(tempFile('{"targets":"x"}')).size, 4)
})

test('THYROX_MITM_API_URL is where the capture goes, apart from the router', () => {
  const config = readMitmServerConfig({ THYROX_MITM_API_URL: 'http://127.0.0.1:4455/', THYROX_PROXY_PORT: '3030' })
  assert.equal(config.ingestBaseUrl, 'http://127.0.0.1:4455')
  assert.equal(config.routerBaseUrl, 'http://127.0.0.1:3030')
})
