/**
 * El proxy de credenciales del store como proceso
 * (`bin/provider-store-credential-proxy`, C3 de credenciales).
 *
 * Lo lanza un pool que no tiene credencial en su entorno: el proxy abre el
 * store de conexiones (`openExistingConnectionStore`), levanta
 * `startProxyServer` con ellas y reparte a los ítems sólo su URL y una clave
 * de acceso local. Contrato del proceso:
 * - anuncia `url=http://127.0.0.1:<puerto>` en su primera línea cuando ya
 *   escucha;
 * - exige la clave de acceso en THYROX_STORE_PROXY_ACCESS_KEY: una petición
 *   con otra clave no llega al upstream;
 * - sirve sólo los modelos declarados con `--model`; uno no declarado se
 *   rehúsa sin tocar el upstream;
 * - sin store, sin conexión legible, sin clave de acceso o sin modelo rehúsa
 *   con exit 2 nombrando la causa, sin escuchar;
 * - con SIGTERM cierra y sale 0.
 *
 * Qué haría fallar a este control: anunciar antes de instalar los manejadores
 * de señal, arrancar sin store o sin clave de acceso, o dejar pasar una
 * petición cuya clave no es la del pool.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ANTHROPIC_PROVIDER_ID } from '../src/accounts/imports/anthropicAuthFile.ts'
import { openConnectionStore } from '../src/accounts/connectionStoreHome.ts'
import { STORAGE_KEY_VARIABLE } from '../src/accounts/fieldCipher.ts'
import { startAnthropicMockServer, type AnthropicMockServer } from '../src/anthropicMockServer.ts'
import { ALLOW_LOOPBACK_ENV } from '../src/proxy/netGuards.ts'

const ENTRY = join(import.meta.dir, '../bin/storeCredentialProxy.ts')
const STORAGE_KEY = 'clave-de-prueba'
const ACCESS_KEY = 'pool-key'
let upstream: AnthropicMockServer | undefined
let dir: string | undefined
let child: ReturnType<typeof Bun.spawn> | undefined

afterEach(async () => {
  child?.kill('SIGKILL')
  await upstream?.close()
  if (dir) rmSync(dir, { recursive: true, force: true })
  upstream = dir = child = undefined
})

async function firstLine(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  let text = ''
  while (!text.includes('\n')) {
    const { value, done } = await reader.read()
    if (done) break
    text += new TextDecoder().decode(value)
  }
  reader.releaseLock()
  return text.split('\n')[0]!
}

/** Un store en `dir`, cifrado con `key`, con una conexión Anthropic de clave de API. */
function seedStore(storeDir: string, key: string): void {
  const opened = openConnectionStore({ env: { THYROX_PROVIDERS_DATA_DIR: storeDir, [STORAGE_KEY_VARIABLE]: key } })
  opened.store.create({ provider: ANTHROPIC_PROVIDER_ID, authType: 'apikey', name: 'pool', apiKey: 'sk-store' })
  opened.close()
}

function processEnv(storeDir: string, overrides: Record<string, string | undefined> = {}): Record<string, string> {
  const env: Record<string, string | undefined> = {
    PATH: process.env.PATH ?? '',
    HOME: storeDir,
    THYROX_PROVIDERS_DATA_DIR: storeDir,
    [STORAGE_KEY_VARIABLE]: STORAGE_KEY,
    [ALLOW_LOOPBACK_ENV]: '1',
    THYROX_STORE_PROXY_ACCESS_KEY: ACCESS_KEY,
    ...overrides,
  }
  return Object.fromEntries(Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined))
}

/** El proxy con un modelo declarado; `--model` se omite sólo en el caso que mide su falta. */
function spawnProxy(args: string[], env: Record<string, string>): ReturnType<typeof Bun.spawn> {
  child = Bun.spawn(['bun', ENTRY, '--model', 'pool-model', ...args], { env, stdout: 'pipe', stderr: 'pipe' })
  return child
}

function spawnProxyWithoutModel(env: Record<string, string>): ReturnType<typeof Bun.spawn> {
  child = Bun.spawn(['bun', ENTRY, '--upstream', 'http://127.0.0.1:9'], { env, stdout: 'pipe', stderr: 'pipe' })
  return child
}

function messages(url: string, accessKey: string, model: string): Promise<Response> {
  return fetch(`${url}/v1/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': accessKey },
    body: JSON.stringify({ model, max_tokens: 8, messages: [{ role: 'user', content: 'hi' }] }),
  })
}

describe('provider-store-credential-proxy', () => {
  test('1. anuncia su URL, sirve el modelo declarado con la credencial del store y al SIGTERM sale 0', async () => {
    const seen: string[] = []
    upstream = await startAnthropicMockServer({
      host: '127.0.0.1',
      respond: (_body, request) => { seen.push(String(request.headers['x-api-key'])); return {} },
    })
    dir = mkdtempSync(join(tmpdir(), 'store-credential-proxy-'))
    seedStore(dir, STORAGE_KEY)
    const proxy = spawnProxy(['--upstream', upstream.url], processEnv(dir))
    const announced = await firstLine(proxy.stdout as ReadableStream<Uint8Array>)
    expect(announced).toMatch(/^url=http:\/\/127\.0\.0\.1:\d+$/)
    const url = announced.slice('url='.length)

    const served = await messages(url, ACCESS_KEY, 'pool-model')
    expect(served.status).toBe(200)
    expect(seen).toEqual(['sk-store'])
    expect((upstream.requests[0]!.body as { model: string }).model).toBe('pool-model')

    const wrongKey = await messages(url, 'otra-clave', 'pool-model')
    expect(wrongKey.status).toBe(401)
    const undeclaredModel = await messages(url, ACCESS_KEY, 'modelo-no-declarado')
    expect(undeclaredModel.status).not.toBe(200)
    expect(seen).toEqual(['sk-store'])

    proxy.kill('SIGTERM')
    expect(await proxy.exited).toBe(0)
  })

  test('2. sin store rehúsa con exit 2 nombrándolo, sin escuchar', async () => {
    dir = mkdtempSync(join(tmpdir(), 'store-credential-proxy-'))
    const proxy = spawnProxy(['--upstream', 'http://127.0.0.1:9'], processEnv(dir))
    expect(await proxy.exited).toBe(2)
    expect(await new Response(proxy.stderr as ReadableStream<Uint8Array>).text()).toContain('provider_connections')
    expect(await new Response(proxy.stdout as ReadableStream<Uint8Array>).text()).toBe('')
  })

  test('3. con una conexión que la clave declarada no descifra rehúsa con exit 2 nombrando la clave', async () => {
    dir = mkdtempSync(join(tmpdir(), 'store-credential-proxy-'))
    seedStore(dir, 'otra-clave-de-cifrado')
    const proxy = spawnProxy(['--upstream', 'http://127.0.0.1:9'], processEnv(dir))
    expect(await proxy.exited).toBe(2)
    expect(await new Response(proxy.stderr as ReadableStream<Uint8Array>).text()).toContain(STORAGE_KEY_VARIABLE)
    expect(await new Response(proxy.stdout as ReadableStream<Uint8Array>).text()).toBe('')
  })

  test('4. sin clave de acceso rehúsa con exit 2 nombrando la variable, sin escuchar', async () => {
    dir = mkdtempSync(join(tmpdir(), 'store-credential-proxy-'))
    seedStore(dir, STORAGE_KEY)
    const proxy = spawnProxy(['--upstream', 'http://127.0.0.1:9'], processEnv(dir, { THYROX_STORE_PROXY_ACCESS_KEY: undefined }))
    expect(await proxy.exited).toBe(2)
    expect(await new Response(proxy.stderr as ReadableStream<Uint8Array>).text()).toContain('THYROX_STORE_PROXY_ACCESS_KEY')
    expect(await new Response(proxy.stdout as ReadableStream<Uint8Array>).text()).toBe('')
  })

  test('5. sin --model rehúsa con exit 2 nombrando la opción, sin escuchar', async () => {
    dir = mkdtempSync(join(tmpdir(), 'store-credential-proxy-'))
    seedStore(dir, STORAGE_KEY)
    const proxy = spawnProxyWithoutModel(processEnv(dir))
    expect(await proxy.exited).toBe(2)
    expect(await new Response(proxy.stderr as ReadableStream<Uint8Array>).text()).toContain('--model')
    expect(await new Response(proxy.stdout as ReadableStream<Uint8Array>).text()).toBe('')
  })
})
