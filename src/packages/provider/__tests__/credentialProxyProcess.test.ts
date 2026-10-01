/**
 * El proxy de credencial como proceso: `bin/provider-credential-proxy`.
 *
 * Lo lanza quien tiene la credencial (un pool, una sesión) y reparte a sus
 * hijos sólo la ruta del socket. Contrato del proceso:
 * - anuncia `socket=<ruta>` en su primera línea cuando ya escucha;
 * - resuelve SU credencial con la cadena de `credentials.ts`;
 * - sin credencial rehúsa con exit 2 nombrando las fuentes, sin escuchar;
 * - con SIGTERM cierra, borra el socket y sale 0.
 *
 * Qué haría fallar a este control: anunciar antes de instalar los manejadores
 * de señal (el SIGTERM temprano mataría con 143, lección de
 * `anthropicMockServer`), no retirar el socket al salir, o arrancar sin
 * credencial.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startAnthropicMockServer, type AnthropicMockServer } from '../src/anthropicMockServer.ts'

const ENTRY = join(import.meta.dir, '../bin/credentialProxy.ts')
let upstream: AnthropicMockServer | undefined
let dir: string | undefined

afterEach(async () => {
  await upstream?.close()
  if (dir) rmSync(dir, { recursive: true, force: true })
  upstream = dir = undefined
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

describe('provider-credential-proxy', () => {
  test('1. anuncia el socket, inyecta su credencial y al SIGTERM sale 0 sin dejar el socket', async () => {
    const seen: string[] = []
    upstream = await startAnthropicMockServer({
      host: '127.0.0.1',
      respond: (_body, request) => { seen.push(String(request.headers['x-api-key'])); return {} },
    })
    dir = mkdtempSync(join(tmpdir(), 'credential-proxy-process-'))
    const socket = join(dir, 'api.sock')
    const child = Bun.spawn(['bun', ENTRY, '--socket', socket, '--upstream', upstream.url], {
      env: { PATH: process.env.PATH ?? '', HOME: dir, ANTHROPIC_API_KEY: 'sk-proxy-only' },
      stdout: 'pipe', stderr: 'pipe',
    })
    expect(await firstLine(child.stdout)).toBe(`socket=${socket}`)
    const response = await fetch('http://localhost/v1/messages', {
      method: 'POST', unix: socket, headers: { 'content-type': 'application/json', 'x-api-key': 'ssh-placeholder' },
      body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 8, messages: [{ role: 'user', content: 'hi' }] }),
    } as RequestInit)
    expect(response.status).toBe(200)
    expect(seen).toEqual(['sk-proxy-only'])
    child.kill('SIGTERM')
    expect(await child.exited).toBe(0)
    expect(existsSync(socket)).toBe(false)
  })

  test('2. sin credencial rehúsa con exit 2 y no escucha', async () => {
    dir = mkdtempSync(join(tmpdir(), 'credential-proxy-process-'))
    const socket = join(dir, 'api.sock')
    const child = Bun.spawn(['bun', ENTRY, '--socket', socket, '--upstream', 'http://127.0.0.1:9'], {
      env: { PATH: process.env.PATH ?? '', HOME: dir }, stdout: 'pipe', stderr: 'pipe',
    })
    expect(await child.exited).toBe(2)
    expect(await new Response(child.stderr).text()).toContain('ANTHROPIC_API_KEY')
    expect(existsSync(socket)).toBe(false)
  })

  test('3. el rechazo nombra la vía del store de conexiones, con variable y con prompt oculto', async () => {
    dir = mkdtempSync(join(tmpdir(), 'credential-proxy-process-'))
    const child = Bun.spawn(['bun', ENTRY, '--socket', join(dir, 'api.sock'), '--upstream', 'http://127.0.0.1:9'], {
      env: { PATH: process.env.PATH ?? '', HOME: dir }, stdout: 'pipe', stderr: 'pipe',
    })
    expect(await child.exited).toBe(2)
    const refusal = await new Response(child.stderr).text()
    expect(refusal).toContain('bash bin/cli providers add anthropic --credential-env <VAR>')
    expect(refusal).toContain('sin --credential-env')
    expect(refusal).toContain('prompt oculto')
  })

  test('4. el rechazo declara que un pool no necesita --credential-proxy', async () => {
    dir = mkdtempSync(join(tmpdir(), 'credential-proxy-process-'))
    const child = Bun.spawn(['bun', ENTRY, '--socket', join(dir, 'api.sock'), '--upstream', 'http://127.0.0.1:9'], {
      env: { PATH: process.env.PATH ?? '', HOME: dir }, stdout: 'pipe', stderr: 'pipe',
    })
    expect(await child.exited).toBe(2)
    const refusal = await new Response(child.stderr).text()
    expect(refusal).toContain('--credential-proxy es opcional')
    expect(refusal).toContain('inherit')
  })
})
