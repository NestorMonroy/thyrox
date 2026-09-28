/**
 * `thyrox mitm serve`: arranca la API local del MITM en el puerto pedido, la
 * sirve hasta que llega la señal de parar, y al parar retira el destino de
 * ingesta y cierra el store. Un puerto inválido rehúsa antes de arrancar nada.
 */
import { afterEach, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import { Command } from '@commander-js/extra-typings'
import { TrafficBuffer } from '@thyrox/mitm/inspector/buffer'
import { __resetMitmManagerForTest, getInspectorIngest } from '@thyrox/mitm/manager'
import { ensureAgentBridgeSchema } from '@thyrox/mitm/state/schema'

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'

import { mitmCommand, mitmServe, registerMitmCommands, type MitmCommandDeps } from '../src/commands/mitm-commands.ts'
import { readApiUrl } from '../src/commands/mitm/apiEndpoint.ts'
import { remoteApi } from '../src/commands/mitm/remoteApi.ts'
import { readFirstLine } from '../src/commands/mitm/stdinSecret.ts'
import { detectMode } from '../src/entry/detect-mode.ts'

const THYROX_ROOT = path.resolve(import.meta.dir, '..', '..', '..', '..')

const dataDirs: string[] = []
afterEach(() => {
  __resetMitmManagerForTest()
  for (const dir of dataDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
})

function deps(overrides: Partial<MitmCommandDeps> = {}) {
  let stop!: () => void
  const stopped = new Promise<void>(resolve => (stop = resolve))
  const out: string[] = []
  const db = new Database(':memory:')
  ensureAgentBridgeSchema(db)
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-mitm-cli-'))
  dataDirs.push(dataDir)
  const value: MitmCommandDeps = {
    openDb: () => db,
    traffic: new TrafficBuffer(10),
    write: text => out.push(text),
    readFile: () => '{}',
    waitForStop: () => stopped,
    dataDir,
    connect: remoteApi,
    readSecret: async () => 's3cret',
    ...overrides,
  }
  return { value, stop, out, db }
}

test('serve answers on the announced URL until stopped, then withdraws the ingest target', async () => {
  const d = deps()
  const exit = mitmServe('0', d.value)
  // El anuncio llega antes de que termine: sirve mientras espera la señal.
  while (d.out.length === 0) await Bun.sleep(5)
  const url = d.out[0]!.match(/http:\/\/127\.0\.0\.1:\d+/)![0]
  expect(getInspectorIngest()?.baseUrl).toBe(url)
  const res = await fetch(`${url}/api/tools/traffic-inspector/requests`, { headers: { host: '127.0.0.1' } })
  expect(res.status).toBe(200)

  d.stop()
  expect(await exit).toBe(0)
  expect(getInspectorIngest()).toBeNull()
  await expect(fetch(`${url}/api/tools/traffic-inspector/requests`)).rejects.toThrow()
})

test('serve closes the store it opened when it stops', async () => {
  const d = deps()
  const exit = mitmServe('0', d.value)
  while (d.out.length === 0) await Bun.sleep(5)
  d.stop()
  await exit
  expect(() => d.db.query('SELECT 1').get()).toThrow()
})

test('an invalid port refuses with a usage exit and starts nothing', async () => {
  let opened = false
  const d = deps({ openDb: () => ((opened = true), new Database(':memory:')) })
  for (const port of ['-1', '70000', 'abc', '']) {
    d.out.length = 0
    expect(await mitmServe(port, d.value)).toBe(2)
    expect(d.out.join('')).toContain('port')
  }
  expect(opened).toBe(false)
  expect(getInspectorIngest()).toBeNull()
})

test('the mitm command exposes serve with a port option', () => {
  const program = new Command()
  registerMitmCommands(program)
  const mitm = program.commands.find(c => c.name() === 'mitm')
  const serve = mitm?.commands.find(c => c.name() === 'serve')
  expect(serve).toBeDefined()
  expect(serve!.options.map(o => o.long)).toContain('--port')
})

test('mitm as the first word selects the mitm mode, ahead of any flag', () => {
  expect(detectMode(['mitm', 'serve', '--port', '0']).kind).toBe('mitm')
  expect(detectMode(['mitm', 'serve', '--sessions']).kind).toBe('mitm')
  expect(detectMode(['--prompt', 'mitm']).kind).toBe('loop')
})

test('an unknown mitm verb refuses with a usage exit, naming the verbs', async () => {
  const d = deps()
  expect(await mitmCommand(['mitm', 'launch'], d.value)).toBe(2)
  expect(d.out.join('')).toContain('serve')
  expect(d.out.join('')).toContain('mappings')
})

test('thyrox mitm serve runs through the real launcher and stops on SIGTERM', async () => {
  // El directorio de datos propio evita publicar la URL en el del usuario.
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-mitm-launcher-'))
  dataDirs.push(dataDir)
  const child = spawn('bash', [path.join(THYROX_ROOT, 'bin', 'cli'), 'mitm', 'serve', '--port', '0'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, THYROX_MITM_DATA_DIR: dataDir },
  })
  let out = ''
  child.stdout.on('data', chunk => (out += chunk))
  const exited = new Promise<number | null>(resolve => child.once('exit', code => resolve(code)))
  const deadline = Date.now() + 20_000
  while (!/listening on http/.test(out) && Date.now() < deadline) await Bun.sleep(50)
  expect(out).toContain('MITM API listening on http://127.0.0.1:')
  expect(readApiUrl(dataDir)).toStartWith('http://127.0.0.1:')

  child.kill('SIGTERM')
  expect(await exited).toBe(0)
  expect(readApiUrl(dataDir)).toBeNull()
}, 30_000)

test('a state verb runs against the store and closes it afterwards', async () => {
  const d = deps()
  expect(await mitmCommand(['mitm', 'agents'], d.value)).toBe(0)
  expect(JSON.parse(d.out.join('')).agents.map((a: { id: string }) => a.id)).toContain('codex')
  expect(() => d.db.query('SELECT 1').get()).toThrow()
})

test('the full program exposes every state verb under mitm', () => {
  const program = new Command()
  registerMitmCommands(program)
  const names = program.commands.find(c => c.name() === 'mitm')!.commands.map(c => c.name())
  for (const verb of ['status', 'agents', 'agent', 'detect', 'mappings', 'bypass', 'config']) expect(names).toContain(verb)
})

test('serve publishes its URL in the data dir while it serves, and withdraws it on stop', async () => {
  const d = deps()
  const exit = mitmServe('0', d.value)
  while (d.out.length === 0) await Bun.sleep(5)
  const url = d.out[0]!.match(/http:\/\/127\.0\.0\.1:\d+/)![0]
  expect(readApiUrl(d.value.dataDir)).toBe(url)
  d.stop()
  await exit
  expect(readApiUrl(d.value.dataDir)).toBeNull()
})

test('a privileged verb reaches the API that serve published', async () => {
  const d = deps()
  const exit = mitmServe('0', d.value)
  while (d.out.length === 0) await Bun.sleep(5)
  d.out.length = 0
  expect(await mitmCommand(['mitm', 'cert'], d.value)).toBe(0)
  expect(JSON.parse(d.out.join(''))).toHaveProperty('exists')
  d.stop()
  await exit
})

test('a privileged verb without a running API refuses, naming serve', async () => {
  const d = deps()
  expect(await mitmCommand(['mitm', 'repair'], d.value)).toBe(2)
  expect(d.out.join('')).toContain('thyrox mitm serve')
})

test('the full program exposes every privileged verb under mitm', () => {
  const program = new Command()
  registerMitmCommands(program)
  const names = program.commands.find(c => c.name() === 'mitm')!.commands.map(c => c.name())
  for (const verb of ['start', 'stop', 'restart', 'trust-cert', 'cert', 'dns', 'reset', 'repair', 'diagnose', 'upstream-ca', 'tproxy']) {
    expect(names).toContain(verb)
  }
})

test('the sudo password is the first stdin line, without its line break', async () => {
  expect(await readFirstLine(Readable.from(['s3c', 'ret\nnext line\n']))).toBe('s3cret')
  expect(await readFirstLine(Readable.from(['no-newline']))).toBe('no-newline')
})
