// El proceso del servidor MITM (omniroute: src/mitm/server.cjs, startMitmServer y su final;
// MIT): se lanza de verdad con Bun.spawn, en un puerto libre, con el directorio de datos y
// el certificado en un temporal.
import { afterEach, test } from 'bun:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'

import { generateMitmCa, issueLeafCertForHosts } from '../../src/dynamicCert.ts'

const MAIN = new URL('../../src/server/main.ts', import.meta.url).pathname
const cleanups: Array<() => void | Promise<void>> = []
afterEach(async () => {
  while (cleanups.length > 0) await cleanups.pop()!()
})

async function freePort(): Promise<number> {
  const probe = net.createServer()
  await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', () => resolve()))
  const port = (probe.address() as net.AddressInfo).port
  await new Promise<void>(resolve => probe.close(() => resolve()))
  return port
}

async function dataDirWithCert(): Promise<string> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-mitm-main-'))
  cleanups.push(() => fs.rmSync(dir, { recursive: true, force: true }))
  const ca = await generateMitmCa('test CA')
  const leaf = await issueLeafCertForHosts(['daily-cloudcode-pa.googleapis.com'], ca)
  fs.writeFileSync(path.join(dir, 'server.key'), leaf.key)
  fs.writeFileSync(path.join(dir, 'server.crt'), leaf.cert)
  return dir
}

function spawnMain(env: Record<string, string>) {
  const child = Bun.spawn([process.execPath, MAIN], {
    env: { ...process.env, ...env },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  cleanups.push(() => {
    child.kill('SIGKILL')
  })
  return child
}

async function readUntil(stream: ReadableStream<Uint8Array>, needle: string, ms = 8000): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let text = ''
  const deadline = Date.now() + ms
  while (!text.includes(needle) && Date.now() < deadline) {
    const chunk = await Promise.race([reader.read(), Bun.sleep(deadline - Date.now()).then(() => null)])
    if (!chunk || chunk.done) break
    text += decoder.decode(chunk.value)
  }
  reader.releaseLock()
  return text
}

test('the process listens on THYROX_MITM_LOCAL_PORT and exits 0 on SIGTERM', async () => {
  const dir = await dataDirWithCert()
  const port = await freePort()
  const child = spawnMain({ THYROX_MITM_DATA_DIR: dir, THYROX_MITM_LOCAL_PORT: String(port) })
  const out = await readUntil(child.stdout, 'ready on')
  assert.match(out, new RegExp(`ready on :${port}`))
  const stats = JSON.parse(fs.readFileSync(path.join(dir, 'stats.json'), 'utf8'))
  assert.ok(stats.startedAt)
  child.kill('SIGTERM')
  assert.equal(await child.exited, 0)
})

test('SIGINT also closes the server cleanly', async () => {
  const dir = await dataDirWithCert()
  const port = await freePort()
  const child = spawnMain({ THYROX_MITM_DATA_DIR: dir, THYROX_MITM_LOCAL_PORT: String(port) })
  await readUntil(child.stdout, 'ready on')
  child.kill('SIGINT')
  assert.equal(await child.exited, 0)
})

// El puerto lo ocupa OTRO proceso, que es el caso real. Ocupado desde el propio proceso de
// prueba, Bun lanza el fallo como excepción sin `code` que el ejecutor de pruebas intercepta.
test('a port held by another process exits 1 and says it is in use', async () => {
  const dir = await dataDirWithCert()
  const holder = Bun.spawn(
    ['python3', '-c', 'import socket,time\ns=socket.socket();s.bind(("0.0.0.0",0));s.listen();print(s.getsockname()[1],flush=True);time.sleep(30)'],
    { stdout: 'pipe' },
  )
  cleanups.push(() => {
    holder.kill('SIGKILL')
  })
  const reader = holder.stdout.getReader()
  const port = Number(new TextDecoder().decode((await reader.read()).value).trim())
  reader.releaseLock()
  const child = spawnMain({ THYROX_MITM_DATA_DIR: dir, THYROX_MITM_LOCAL_PORT: String(port) })
  assert.equal(await child.exited, 1)
  assert.equal(await new Response(child.stderr).text(), `[MITM] Port ${port} already in use\n`)
})

test('a missing certificate exits 1 with a sanitized message', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-mitm-main-empty-'))
  cleanups.push(() => fs.rmSync(dir, { recursive: true, force: true }))
  const child = spawnMain({ THYROX_MITM_DATA_DIR: dir, THYROX_MITM_LOCAL_PORT: String(await freePort()) })
  assert.equal(await child.exited, 1)
  const err = await new Response(child.stderr).text()
  assert.ok(err.length > 0)
  assert.ok(!err.includes(path.join(dir, 'server.key')), err)
})
