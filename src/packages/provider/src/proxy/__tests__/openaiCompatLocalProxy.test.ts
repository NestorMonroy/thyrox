/**
 * `bin/localProxy.ts` con y sin la declaración `THYROX_OPENAI_COMPAT_*`:
 * declarada, el modelo abierto llega por el socket al servidor OpenAI falso;
 * sin declarar, ese modelo no se enruta a ningún sitio; a medias, rehúsa con
 * exit 2 nombrando la variable que falta.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BASE_URL_ENV, MODEL_ENV } from '../openaiCompat/declaration.ts'
import { startFakeOpenAIUpstream, type FakeOpenAIUpstream } from './fakeOpenAIUpstream.ts'

const LOCAL_PROXY = join(import.meta.dir, '..', '..', '..', 'bin', 'localProxy.ts')
const OPEN_MODEL = 'qwen-local'
const REFUSAL_EXIT_CODE = 2
const SOCKET_ANNOUNCEMENT = /^socket=(.+)$/m

const cleanups: (() => Promise<void> | void)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

function workDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'openai-compat-local-proxy-'))
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

function fake(): FakeOpenAIUpstream {
  const upstream = startFakeOpenAIUpstream()
  cleanups.push(upstream.stop)
  return upstream
}

/** Sin `--cli` y con un PATH vacío: el proxy no encuentra `claude`. */
function withoutCliExecutable(env: Record<string, string>): { args: string[]; env: Record<string, string> } {
  const emptyPath = join(workDir(), 'empty-path')
  mkdirSync(emptyPath)
  return { args: [], env: { ...env, PATH: emptyPath } }
}

const WITH_CLAUDE = (env: Record<string, string>) => ({ args: ['--cli', process.execPath], env: { PATH: process.env.PATH ?? '', ...env } })

function launch(env: Record<string, string>, setup = WITH_CLAUDE) {
  const socket = join(workDir(), 'proxy.sock')
  const { args, env: childEnv } = setup(env)
  const child = Bun.spawn([process.execPath, LOCAL_PROXY, '--socket', socket, ...args], {
    env: childEnv,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  })
  return child
}

/** Arranca el proxy y espera su anuncio; lo detiene al final de la prueba. */
async function listeningProxy(env: Record<string, string>, setup = WITH_CLAUDE): Promise<string> {
  const child = launch(env, setup)
  cleanups.push(async () => {
    child.kill('SIGTERM')
    await child.exited
  })
  const decoder = new TextDecoder()
  let seen = ''
  for await (const chunk of child.stdout) {
    seen += decoder.decode(chunk, { stream: true })
    const announced = SOCKET_ANNOUNCEMENT.exec(seen)
    if (announced) return announced[1] as string
  }
  throw new Error(`localProxy no anunció su socket: ${await new Response(child.stderr).text()}`)
}

function sendOverSocket(socket: string, body: unknown): Promise<Response> {
  return fetch('http://localhost/v1/messages', {
    unix: socket,
    method: 'POST',
    headers: { 'x-api-key': 'ssh-placeholder', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const HELLO = { model: OPEN_MODEL, max_tokens: 16, messages: [{ role: 'user', content: 'hola' }] }

describe('localProxy con upstream compatible con OpenAI', () => {
  test('declarado, el modelo abierto llega al fake por el socket y vuelve como Messages', async () => {
    const upstream = fake()
    const socket = await listeningProxy({ [BASE_URL_ENV]: upstream.baseUrl, [MODEL_ENV]: OPEN_MODEL })
    const response = await sendOverSocket(socket, HELLO)
    expect(response.status).toBe(200)
    expect(((await response.json()) as { content: unknown }).content).toEqual([{ type: 'text', text: 'eco: hola' }])
    expect(upstream.received[0]?.model).toBe(OPEN_MODEL)
  })

  test('sin declarar, el modelo abierto no se enruta y el fake no recibe nada', async () => {
    const upstream = fake()
    const socket = await listeningProxy({})
    const response = await sendOverSocket(socket, HELLO)
    expect(response.status).toBe(400)
    expect(upstream.received).toHaveLength(0)
  })

  test('declarado y sin claude, arranca y sirve el modelo abierto', async () => {
    const upstream = fake()
    const socket = await listeningProxy({ [BASE_URL_ENV]: upstream.baseUrl, [MODEL_ENV]: OPEN_MODEL }, withoutCliExecutable)
    const response = await sendOverSocket(socket, HELLO)
    expect(response.status).toBe(200)
    expect(upstream.received[0]?.model).toBe(OPEN_MODEL)
  })

  test('declarado y sin claude, otro modelo responde un error que lo nombra y nombra la falta de claude-cli', async () => {
    const upstream = fake()
    const socket = await listeningProxy({ [BASE_URL_ENV]: upstream.baseUrl, [MODEL_ENV]: OPEN_MODEL }, withoutCliExecutable)
    const response = await sendOverSocket(socket, { ...HELLO, model: 'claude-sonnet-5' })
    expect(response.status).toBe(400)
    const message = ((await response.json()) as { error: { message: string } }).error.message
    expect(message).toContain('claude-sonnet-5')
    expect(message).toContain('claude-cli')
    expect(upstream.received).toHaveLength(0)
  })

  test('sin declarar y sin claude rehúsa con exit 2 nombrando --cli', async () => {
    const child = launch({}, withoutCliExecutable)
    expect(await child.exited).toBe(REFUSAL_EXIT_CODE)
    expect(await new Response(child.stderr).text()).toContain('--cli')
  })

  test('a medias rehúsa con exit 2 nombrando la variable que falta, sin escuchar', async () => {
    const child = launch({ [BASE_URL_ENV]: 'http://127.0.0.1:9/v1' })
    expect(await child.exited).toBe(REFUSAL_EXIT_CODE)
    expect(await new Response(child.stderr).text()).toContain(MODEL_ENV)
  })
})
