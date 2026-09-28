// El ciclo completo de startMitm/stopMitm con un proceso hijo de verdad: un servidor falso
// que registra el entorno que recibe y se queda vivo, u otro que falla como falla
// server/main.ts. La confianza del certificado y el DNS se inyectan: una prueba nunca toca
// el almacén de confianza ni /etc/hosts. Porte de startMitmInternal y
// killMitmServerProcessOnStop de omniroute: src/mitm/manager.ts (MIT).
import { afterEach, test } from 'bun:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { generateCert } from '../../src/cert/generate.ts'
import * as manager from '../../src/manager.ts'
import { useTempMitmDataDir } from './dataDirFixture.ts'

const cleanups: Array<() => void> = []
afterEach(async () => {
  await manager.stopMitm('', { runPrivilegedStep: async () => {}, stopGraceMs: 0 })
  manager.__resetMitmManagerForTest()
  while (cleanups.length > 0) cleanups.pop()!()
})

const ALIVE_SERVER = `
const fs = require('node:fs')
fs.writeFileSync(process.env.FAKE_ENV_OUT, JSON.stringify({
  port: process.env.THYROX_MITM_LOCAL_PORT,
  certMode: process.env.THYROX_MITM_CERT_MODE,
  apiKeys: process.env.THYROX_PROXY_API_KEYS ?? null,
  ingestUrl: process.env.THYROX_MITM_API_URL ?? null,
  ingestToken: process.env.THYROX_INSPECTOR_INTERNAL_INGEST_TOKEN ?? null,
}))
process.on('SIGTERM', () => process.exit(0))
setInterval(() => {}, 1000)
`
const FAILING_SERVER = `
process.stderr.write('[MITM] Port 8443 already in use\\n')
process.exit(1)
`

function script(dir: string, name: string, body: string): string {
  const file = path.join(dir, name)
  fs.writeFileSync(file, body)
  return file
}

function recordingSteps(calls: string[]) {
  return {
    installCert: async (_password: string, certPath: string, mode: 'legacy' | 'root-ca') => {
      calls.push(`installCert:${mode}:${path.basename(certPath)}`)
      return { installed: true }
    },
    provisionDns: async () => void calls.push('provisionDns'),
    runPrivilegedStep: (_p: string, _s: string, step: () => Promise<void>) => step(),
    startupGraceMs: 300,
  }
}

test('arranca el servidor con el puerto, el modelo de certificado y la clave, y deja el PID', async () => {
  const dir = useTempMitmDataDir(cleanups)
  // Una instalación con la hoja anterior y sin CA sigue en el modelo legacy.
  await generateCert()
  const calls: string[] = []
  const envOut = path.join(dir, 'env.json')
  process.env.FAKE_ENV_OUT = envOut
  cleanups.push(() => delete process.env.FAKE_ENV_OUT)

  const result = await manager.startMitm('local-key', 'secret', { port: 8443 }, {
    ...recordingSteps(calls),
    serverEntry: script(dir, 'alive.js', ALIVE_SERVER),
  })

  assert.equal(result.running, true)
  assert.equal(result.certTrusted, true)
  assert.equal(fs.readFileSync(path.join(dir, '.mitm.pid'), 'utf-8'), String(result.pid))
  assert.deepEqual(JSON.parse(fs.readFileSync(envOut, 'utf-8')), {
    port: '8443',
    certMode: 'legacy',
    apiKeys: 'local-key',
    ingestUrl: null,
    ingestToken: null,
  })
  assert.deepEqual(calls, ['installCert:legacy:server.crt', 'provisionDns'])
  assert.ok(fs.existsSync(path.join(dir, 'targets.json')))
  assert.ok(fs.existsSync(path.join(dir, 'bypass.json')))

  await manager.stopMitm('', { runPrivilegedStep: async () => {}, stopGraceMs: 0 })
  assert.equal(fs.existsSync(path.join(dir, '.mitm.pid')), false)
  assert.equal((await manager.getMitmStatus(undefined, { hostsFile: path.join(dir, 'none') })).running, false)
})

test('con THYROX_MITM_ROOT_CA_ENABLED instala ca.crt y el hijo recibe el modo root-ca', async () => {
  const dir = useTempMitmDataDir(cleanups)
  const calls: string[] = []
  const envOut = path.join(dir, 'env.json')
  process.env.FAKE_ENV_OUT = envOut
  process.env.THYROX_MITM_ROOT_CA_ENABLED = 'true'
  cleanups.push(() => {
    delete process.env.FAKE_ENV_OUT
    delete process.env.THYROX_MITM_ROOT_CA_ENABLED
  })
  // Con la hoja anterior presente, es la variable la que manda a la CA.
  await generateCert()

  await manager.startMitm('', 'secret', { port: 8443 }, {
    ...recordingSteps(calls),
    serverEntry: script(dir, 'alive.js', ALIVE_SERVER),
  })

  assert.equal(JSON.parse(fs.readFileSync(envOut, 'utf-8')).certMode, 'root-ca')
  assert.deepEqual(calls, ['installCert:root-ca:ca.crt', 'provisionDns'])
})

test('con la API local en marcha, el hijo recibe su URL y el token de ingesta', async () => {
  const dir = useTempMitmDataDir(cleanups)
  await generateCert()
  const envOut = path.join(dir, 'env.json')
  process.env.FAKE_ENV_OUT = envOut
  cleanups.push(() => delete process.env.FAKE_ENV_OUT)
  manager.setInspectorIngest({ baseUrl: 'http://127.0.0.1:4455', token: 'ingest-token-0123456789' })

  await manager.startMitm('', 'secret', { port: 8443 }, {
    ...recordingSteps([]),
    serverEntry: script(dir, 'alive.js', ALIVE_SERVER),
  })

  const env = JSON.parse(fs.readFileSync(envOut, 'utf-8'))
  assert.equal(env.ingestUrl, 'http://127.0.0.1:4455')
  assert.equal(env.ingestToken, 'ingest-token-0123456789')
})

test('sin permiso para los pasos privilegiados arranca igual, sin confianza ni DNS', async () => {
  const dir = useTempMitmDataDir(cleanups)
  const calls: string[] = []
  process.env.FAKE_ENV_OUT = path.join(dir, 'env.json')
  cleanups.push(() => delete process.env.FAKE_ENV_OUT)

  const result = await manager.startMitm('', '', { port: 8443 }, {
    ...recordingSteps(calls),
    runPrivilegedStep: async () => {},
    serverEntry: script(dir, 'alive.js', ALIVE_SERVER),
  })

  assert.equal(result.running, true)
  assert.equal(result.certTrusted, false)
  assert.deepEqual(calls, [])
})

test('un servidor que muere al arrancar se informa con su causa y no deja PID', async () => {
  const dir = useTempMitmDataDir(cleanups)
  await assert.rejects(
    manager.startMitm('', 'secret', { port: 8443 }, {
      ...recordingSteps([]),
      serverEntry: script(dir, 'failing.js', FAILING_SERVER),
    }),
    /port 8443 is already in use/,
  )
  assert.equal(fs.existsSync(path.join(dir, '.mitm.pid')), false)
  assert.equal(manager.tryAcquireMitmStartLock(), true, 'el candado se soltó')
})
