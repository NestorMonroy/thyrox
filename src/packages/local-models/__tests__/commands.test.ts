import { afterAll, afterEach, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { parseQualifications } from '@thyrox/model-artifacts/modelQualification.ts'
import { syntheticGgufBytes } from '@thyrox/model-artifacts/testing/syntheticGguf.ts'

import { runCatalogCommand, type CommandContext } from '../catalogCommand.js'
import { runQualifyCommand } from '../qualifyCommand.js'
import { CORRECT_TOOL_CALLING_REPLIES, startFakeOllama, type FakeOllama, type FakeOllamaScript } from '../testing/fakeOllama.js'

const WORKDIR = mkdtempSync(join(tmpdir(), 'local-models-commands-'))
afterAll(() => rmSync(WORKDIR, { recursive: true, force: true }))

const MANIFEST_DIGEST = 'd'.repeat(64)
const GGUF = syntheticGgufBytes({
  entries: [
    ['general.architecture', { type: 'string', value: 'qwen2' }],
    ['qwen2.block_count', { type: 'uint32', value: 24 }],
    ['qwen2.context_length', { type: 'uint32', value: 4096 }],
    ['qwen2.embedding_length', { type: 'uint32', value: 896 }],
    ['qwen2.attention.head_count', { type: 'uint32', value: 14 }],
    ['qwen2.attention.head_count_kv', { type: 'uint32', value: 2 }],
  ],
})
const GGUF_SHA256 = createHash('sha256').update(GGUF).digest('hex')
const CONTRACT_NAME = 'thyrox-library--qwen2.5-0.5b:q4_k_m-ollama-dddddddddddd'

let counter = 0
let server: FakeOllama | undefined
afterEach(async () => {
  await server?.stop()
  server = undefined
})

interface Run {
  readonly code: number
  readonly stdout: string[]
  readonly stderr: string[]
}

interface Installation {
  readonly root: string
  readonly env: Record<string, string>
}

function installation(chat: FakeOllamaScript['chat']): Installation {
  counter += 1
  const root = join(WORKDIR, `install-${counter}`)
  const mountpoint = join(root, 'volume')
  mkdirSync(join(mountpoint, 'models', 'blobs'), { recursive: true })
  writeFileSync(join(mountpoint, 'models', 'blobs', `sha256-${GGUF_SHA256}`), GGUF)
  const podman = join(root, 'podman')
  writeFileSync(podman, `#!/bin/sh\necho "$@" >> '${podman}.calls'\necho '${mountpoint}'\n`)
  chmodSync(podman, 0o755)
  server = startFakeOllama({
    tags: [{ name: 'qwen2.5:0.5b', digest: `sha256:${MANIFEST_DIGEST}` }],
    show: { modelfile: `FROM /root/.ollama/models/blobs/sha256-${GGUF_SHA256}\n`, details: { quantization_level: 'Q4_K_M' }, capabilities: ['completion', 'tools'] },
    chat,
  })
  return {
    root,
    env: { THYROX_INFRA_OLLAMA_PORT: String(server.port), THYROX_INFRA_OLLAMA_VOLUME: 'probe-volume', THYROX_TOOLCHAIN_PODMAN_BIN: podman },
  }
}

function context(install: Installation, stdout: string[], stderr: string[]): CommandContext {
  return {
    env: install.env,
    thyroxRoot: install.root,
    output: { stdout: line => stdout.push(line), stderr: line => stderr.push(line) },
    now: () => new Date('2026-10-01T07:00:00.000Z'),
  }
}

async function run(command: typeof runCatalogCommand, argv: string[], install: Installation): Promise<Run> {
  const stdout: string[] = []
  const stderr: string[] = []
  const code = await command(argv, context(install, stdout, stderr))
  return { code, stdout, stderr }
}

function correct(prompt: string) {
  return CORRECT_TOOL_CALLING_REPLIES[prompt] ?? { content: '' }
}

describe('local-models-catalog', () => {
  test('declare inspecciona el volumen declarado y guarda bajo .thyrox/models de la raíz', async () => {
    const install = installation(correct)
    const result = await run(runCatalogCommand, ['declare', 'qwen2.5:0.5b'], install)
    expect(result).toMatchObject({ code: 0, stderr: [] })
    expect(result.stdout[0]).toContain(CONTRACT_NAME)
    expect(readFileSync(`${install.env.THYROX_TOOLCHAIN_PODMAN_BIN}.calls`, 'utf8')).toContain('volume inspect probe-volume')
    expect(readFileSync(join(install.root, '.thyrox/models/catalog.json'), 'utf8')).toContain(CONTRACT_NAME)
    const listed = await run(runCatalogCommand, ['list', '--json'], install)
    expect(JSON.parse(listed.stdout[0] as string).entries.map((e: { name: string }) => e.name)).toEqual([CONTRACT_NAME])
  })

  test('THYROX_MODEL_CATALOG gana a la ruta por defecto', async () => {
    const install = installation(correct)
    const declared = join(install.root, 'elsewhere', 'catalog.json')
    const result = await run(runCatalogCommand, ['declare', 'qwen2.5:0.5b'], { ...install, env: { ...install.env, THYROX_MODEL_CATALOG: declared } })
    expect(result.code).toBe(0)
    expect(existsSync(declared)).toBe(true)
    expect(existsSync(join(install.root, '.thyrox/models/catalog.json'))).toBe(false)
  })

  test('un modelo no instalado sale 2 con la causa', async () => {
    const install = installation(correct)
    const result = await run(runCatalogCommand, ['declare', 'llama3.2:1b'], install)
    expect(result.code).toBe(2)
    expect(result.stderr.join('\n')).toContain('no está instalado')
  })

  test('list sobre un catálogo inválido sale 2 con la ruta, no una lista vacía', async () => {
    const install = installation(correct)
    mkdirSync(join(install.root, '.thyrox/models'), { recursive: true })
    writeFileSync(join(install.root, '.thyrox/models/catalog.json'), 'nope')
    const result = await run(runCatalogCommand, ['list'], install)
    expect(result.code).toBe(2)
    expect(result.stderr.join('\n')).toContain('catalog.json')
  })

  test('sin subcomando conocido sale 2 con el uso', async () => {
    const result = await run(runCatalogCommand, ['purge'], installation(correct))
    expect(result.code).toBe(2)
    expect(result.stderr.join('\n')).toContain('uso:')
  })
})

describe('local-models-qualify', () => {
  async function declaredInstallation(chat: FakeOllamaScript['chat']): Promise<Installation> {
    const install = installation(chat)
    expect((await run(runCatalogCommand, ['declare', 'qwen2.5:0.5b'], install)).code).toBe(0)
    return install
  }

  function storedQualifications(install: Installation) {
    return parseQualifications(readFileSync(join(install.root, '.thyrox/models/qualifications.json'), 'utf8'))
  }

  test('seis aciertos: sale 0 y escribe la cualificación con el contexto acotado al máximo del modelo', async () => {
    const install = await declaredInstallation(correct)
    const result = await run(runQualifyCommand, [CONTRACT_NAME, 'mecanica'], install)
    expect(result.code).toBe(0)
    expect(result.stdout.at(-1)).toContain('aprobada')
    const [stored] = storedQualifications(install)
    expect(stored).toMatchObject({ model: CONTRACT_NAME, taskClass: 'mecanica', passed: true, contextTokens: 4096 })
  })

  test('--context declarado viaja como num_ctx', async () => {
    const install = await declaredInstallation(correct)
    expect((await run(runQualifyCommand, [CONTRACT_NAME, 'analisis', '--context', '2048'], install)).code).toBe(0)
    const chat = server?.requests.find(r => r.path === '/api/chat')?.body as { options: { num_ctx: number } }
    expect(chat.options.num_ctx).toBe(2048)
    expect(storedQualifications(install)[0]?.contextTokens).toBe(2048)
  })

  test('suspendida: sale 1 y también se escribe', async () => {
    const install = await declaredInstallation(() => ({ content: 'no' }))
    const result = await run(runQualifyCommand, [CONTRACT_NAME, 'mecanica'], install)
    expect(result.code).toBe(1)
    expect(storedQualifications(install)[0]?.passed).toBe(false)
  })

  test('un modelo fuera del catálogo sale 2 sin medir', async () => {
    const install = installation(correct)
    const result = await run(runQualifyCommand, [CONTRACT_NAME, 'mecanica'], install)
    expect(result.code).toBe(2)
    expect(result.stderr.join('\n')).toContain('no está en el catálogo')
    expect(server?.requests.some(r => r.path === '/api/chat')).toBe(false)
  })

  test('--context por encima del máximo del modelo sale 2 sin medir', async () => {
    const install = await declaredInstallation(correct)
    const result = await run(runQualifyCommand, [CONTRACT_NAME, 'mecanica', '--context', '8192'], install)
    expect(result.code).toBe(2)
    expect(server?.requests.some(r => r.path === '/api/chat')).toBe(false)
  })

  test('una clase desconocida o un --context no entero salen 2 con el uso', async () => {
    const install = installation(correct)
    for (const argv of [[CONTRACT_NAME, 'rapida'], [CONTRACT_NAME, 'mecanica', '--context', 'x'], [CONTRACT_NAME]]) {
      const result = await run(runQualifyCommand, argv, install)
      expect(result.code).toBe(2)
      expect(result.stderr.join('\n')).toContain('uso:')
    }
  })
})

describe('entradas bin/*.ts', () => {
  test('bin/catalog.ts corre la orden con el entorno del proceso y propaga su código', () => {
    const install = installation(correct)
    const result = Bun.spawnSync([process.execPath, join(import.meta.dir, '..', 'bin', 'catalog.ts'), 'list'], {
      env: { ...process.env, ...install.env, THYROX_ROOT: install.root }, stdin: 'ignore',
    })
    expect(result.exitCode).toBe(0)
    expect(result.stdout.toString()).toBe('')
    const refused = Bun.spawnSync([process.execPath, join(import.meta.dir, '..', 'bin', 'qualify.ts')], { env: { ...process.env, THYROX_ROOT: install.root }, stdin: 'ignore' })
    expect(refused.exitCode).toBe(2)
    expect(refused.stderr.toString()).toContain('uso:')
  })
})
