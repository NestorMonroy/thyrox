/**
 * El proxy local con el upstream `claude-cli` como proceso
 * (`bin/provider-local-proxy`). Lo lanza `thyrox -p` cuando no tiene
 * credencial propia, o un pool que lo declara a sus ítems. Contrato:
 * - anuncia `socket=<ruta>` en su primera línea cuando ya escucha, y no
 *   escribe nada más por stdout: la clave de acceso interna no se publica;
 * - quien habla por el socket lleva el marcador `ssh-placeholder`; el
 *   proxy lanza `claude -p` (el del PATH o `--cli`), que autentica solo;
 * - un modelo pasa tal cual sólo si se declaró con `--model`;
 * - sin `claude` rehúsa con exit 2 nombrando `--cli`, sin escuchar;
 * - con SIGTERM cierra, borra el socket y sale 0.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ENTRY = join(import.meta.dir, '../bin/localProxy.ts')
const FAKE_CLI = join(import.meta.dir, '../src/proxy/__tests__/fakeCliUpstream.ts')
const MARKER = 'ssh-placeholder'

let dir: string | undefined
let child: ReturnType<typeof Bun.spawn> | undefined

afterEach(async () => {
  if (child && child.exitCode === null) {
    child.kill('SIGKILL')
    await child.exited
  }
  if (dir) rmSync(dir, { recursive: true, force: true })
  child = dir = undefined
})

/** Un `claude` en un directorio propio que corre el doble de `claude -p`. */
function fakeCliDirectory(base: string): string {
  const binDir = join(base, 'path-claude')
  mkdirSync(binDir)
  writeFileSync(join(binDir, 'claude'), `#!/usr/bin/env bash\nexec "${process.execPath}" "${FAKE_CLI}" "$@"\n`)
  chmodSync(join(binDir, 'claude'), 0o755)
  return binDir
}

/** El texto del flujo hasta que se cierra; el lector se toma por llamada, para leerlo en dos veces. */
async function drain(stream: ReadableStream<Uint8Array>, until: (text: string) => boolean): Promise<string> {
  const reader = stream.getReader()
  let text = ''
  try {
    while (!until(text)) {
      const { value, done } = await reader.read()
      if (done) break
      text += new TextDecoder().decode(value)
    }
  } finally {
    reader.releaseLock()
  }
  return text
}

const firstLine = async (stream: ReadableStream<Uint8Array>): Promise<string> => (await drain(stream, text => text.includes('\n'))).split('\n')[0]!
const restOf = (stream: ReadableStream<Uint8Array>): Promise<string> => drain(stream, () => false)

function launch(args: string[], env: Record<string, string>): ReturnType<typeof Bun.spawn> {
  child = Bun.spawn([process.execPath, ENTRY, ...args], { env, stdout: 'pipe', stderr: 'pipe' })
  return child
}

function messagesVia(socket: string, body: unknown): Promise<Response> {
  return fetch('http://localhost/v1/messages', {
    method: 'POST', unix: socket, headers: { 'content-type': 'application/json', 'x-api-key': MARKER },
    body: JSON.stringify(body),
  } as RequestInit)
}

describe('provider-local-proxy', () => {
  test('1. anuncia el socket, sirve /v1/messages con el claude del PATH y al SIGTERM sale 0 sin dejar el socket', async () => {
    dir = mkdtempSync(join(tmpdir(), 'local-proxy-process-'))
    const socket = join(dir, 'proxy.sock')
    const proxy = launch(['--socket', socket, '--model', 'real-model'], {
      PATH: `${fakeCliDirectory(dir)}:${process.env.PATH ?? ''}`, HOME: dir, FAKE_CLAUDE_LOG: dir,
    })
    expect(await firstLine(proxy.stdout as ReadableStream<Uint8Array>)).toBe(`socket=${socket}`)

    const response = await messagesVia(socket, { model: 'real-model', max_tokens: 8, messages: [{ role: 'user', content: 'hola' }] })
    expect(response.status).toBe(200)
    expect(((await response.json()) as { content: unknown }).content).toEqual([{ type: 'text', text: 'eco: hola' }])
    const invocation = JSON.parse(readFileSync(join(dir, 'invocations.jsonl'), 'utf8').split('\n')[0]!) as { argv: string[] }
    expect(invocation.argv).toEqual(expect.arrayContaining(['-p', '--input-format', 'stream-json']))

    const undeclared = await messagesVia(socket, { model: 'otro-modelo', max_tokens: 8, messages: [{ role: 'user', content: 'hola' }] })
    expect(undeclared.status).toBeGreaterThanOrEqual(400)

    proxy.kill('SIGTERM')
    expect(await proxy.exited).toBe(0)
    expect(existsSync(socket)).toBe(false)
    expect(await restOf(proxy.stdout as ReadableStream<Uint8Array>)).toBe('')
  })

  test('2. sin claude en el PATH y sin --cli rehúsa con exit 2 y no escucha', async () => {
    dir = mkdtempSync(join(tmpdir(), 'local-proxy-process-'))
    const socket = join(dir, 'proxy.sock')
    const empty = join(dir, 'vacio')
    mkdirSync(empty)
    const proxy = launch(['--socket', socket], { PATH: empty, HOME: dir })
    expect(await proxy.exited).toBe(2)
    const stderr = await new Response(proxy.stderr as ReadableStream<Uint8Array>).text()
    expect(stderr).toContain('claude')
    expect(stderr).toContain('--cli')
    expect(existsSync(socket)).toBe(false)
  })

  test('3. --cli nombra el ejecutable sin depender del PATH', async () => {
    dir = mkdtempSync(join(tmpdir(), 'local-proxy-process-'))
    const socket = join(dir, 'proxy.sock')
    const cli = join(fakeCliDirectory(dir), 'claude')
    const empty = join(dir, 'vacio')
    mkdirSync(empty)
    const proxy = launch(['--socket', socket, '--cli', cli], { PATH: empty, HOME: dir })
    expect(await firstLine(proxy.stdout as ReadableStream<Uint8Array>)).toBe(`socket=${socket}`)
    proxy.kill('SIGTERM')
    expect(await proxy.exited).toBe(0)
  })

  test('4. sin --socket rehúsa con exit 2', async () => {
    dir = mkdtempSync(join(tmpdir(), 'local-proxy-process-'))
    const proxy = launch([], { PATH: process.env.PATH ?? '', HOME: dir })
    expect(await proxy.exited).toBe(2)
    expect(await new Response(proxy.stderr as ReadableStream<Uint8Array>).text()).toContain('--socket')
  })
})
