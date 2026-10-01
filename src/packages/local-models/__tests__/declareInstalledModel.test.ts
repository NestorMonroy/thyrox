import { afterAll, afterEach, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { loadModelCatalog } from '@thyrox/model-artifacts/modelCatalog.ts'
import { thyroxModelName } from '@thyrox/model-artifacts/modelName.ts'
import { syntheticGgufBytes } from '@thyrox/model-artifacts/testing/syntheticGguf.ts'

import { declareInstalledModel, ModelDeclarationError } from '../declareInstalledModel.js'
import { OllamaApi } from '../ollamaApi.js'
import { startFakeOllama, type FakeOllama, type FakeOllamaScript } from '../testing/fakeOllama.js'

const WORKDIR = mkdtempSync(join(tmpdir(), 'declare-installed-'))
afterAll(() => rmSync(WORKDIR, { recursive: true, force: true }))

const MANIFEST_DIGEST = 'c'.repeat(64)
const NOW = new Date('2026-10-01T03:04:05.678Z')
const GGUF = syntheticGgufBytes({
  entries: [
    ['general.architecture', { type: 'string', value: 'qwen2' }],
    ['qwen2.block_count', { type: 'uint32', value: 24 }],
    ['qwen2.context_length', { type: 'uint32', value: 32_768 }],
    ['qwen2.embedding_length', { type: 'uint32', value: 896 }],
    ['qwen2.attention.head_count', { type: 'uint32', value: 14 }],
    ['qwen2.attention.head_count_kv', { type: 'uint32', value: 2 }],
  ],
})
const GGUF_SHA256 = createHash('sha256').update(GGUF).digest('hex')
const CONTRACT_NAME = thyroxModelName({ repository: 'library/qwen2.5-0.5b', quantization: 'q4_k_m', source: 'ollama', revision: MANIFEST_DIGEST })

let counter = 0
let server: FakeOllama | undefined
afterEach(async () => {
  await server?.stop()
  server = undefined
})

interface Fixture {
  readonly mountpoint: string
  readonly catalogPath: string
}

function fixture(blobBytes: Uint8Array = GGUF): Fixture {
  counter += 1
  const mountpoint = join(WORKDIR, `volume-${counter}`)
  mkdirSync(join(mountpoint, 'models', 'blobs'), { recursive: true })
  writeFileSync(join(mountpoint, 'models', 'blobs', `sha256-${GGUF_SHA256}`), blobBytes)
  return { mountpoint, catalogPath: join(WORKDIR, `catalog-${counter}.json`) }
}

function installedScript(overrides: Partial<FakeOllamaScript> = {}): FakeOllamaScript {
  return {
    tags: [{ name: 'qwen2.5:0.5b', digest: MANIFEST_DIGEST }],
    show: {
      modelfile: `FROM /root/.ollama/models/blobs/sha256-${GGUF_SHA256}\nTEMPLATE x\n`,
      details: { quantization_level: 'Q4_K_M' },
      capabilities: ['completion', 'tools', 'thinking'],
    },
    ...overrides,
  }
}

async function declare(script: FakeOllamaScript, files: Fixture, name = 'qwen2.5:0.5b') {
  server = startFakeOllama(script)
  return declareInstalledModel(name, { api: new OllamaApi(server.baseUrl), mountpoint: files.mountpoint, catalogPath: files.catalogPath, now: () => NOW })
}

function paths(): string[] {
  return server?.requests.map(request => request.path) ?? []
}

describe('declareInstalledModel — del Ollama gestionado al catálogo', () => {
  test('construye la entrada con revisión, cuantización, digest y bytes medidos, la copia al nombre contractual y la guarda', async () => {
    const files = fixture()
    const entry = await declare(installedScript(), files)
    expect(entry.name).toBe(CONTRACT_NAME)
    expect(entry.source).toBe('ollama')
    expect(entry.revision).toBe(MANIFEST_DIGEST)
    expect(entry.quantization).toBe('q4_k_m')
    expect(entry.artifact).toEqual({ format: 'gguf', sha256: GGUF_SHA256, bytes: GGUF.length })
    expect(entry.maxContextLength).toBe(32_768)
    expect(entry.capabilities).toEqual(['completion', 'tools'])
    expect(entry.declaredAt).toBe('2026-10-01T03:04:05Z')
    const copy = server?.requests.find(request => request.path === '/api/copy')
    expect(copy?.body).toEqual({ source: 'qwen2.5:0.5b', destination: CONTRACT_NAME })
    expect((await loadModelCatalog(files.catalogPath)).byName(CONTRACT_NAME)).toEqual(entry)
  })

  test('sin etiqueta se busca como :latest', async () => {
    const files = fixture()
    const entry = await declare(installedScript({ tags: [{ name: 'qwen3:latest', digest: MANIFEST_DIGEST }] }), files, 'qwen3')
    expect(entry.repository).toBe('library/qwen3-latest')
  })

  test('un modelo que /api/tags no lista se rehúsa sin copiar ni escribir', async () => {
    const files = fixture()
    await expect(declare(installedScript({ tags: [] }), files)).rejects.toThrow(/qwen2.5:0.5b.*no está instalado/)
    expect(paths()).not.toContain('/api/copy')
    expect(existsSync(files.catalogPath)).toBe(false)
  })

  test('un blob cuyo sha256 no coincide con su nombre se rehúsa sin copiar', async () => {
    const files = fixture(new Uint8Array([...GGUF, 0]))
    await expect(declare(installedScript(), files)).rejects.toThrow(/sha256/)
    expect(paths()).not.toContain('/api/copy')
  })

  test('un modelo sin ninguna capacidad del catálogo se rehúsa', async () => {
    const script = installedScript()
    const files = fixture()
    await expect(declare({ ...script, show: { ...script.show, capabilities: ['vision'] } }, files)).rejects.toThrow(ModelDeclarationError)
  })

  test('un nombre que el catálogo ya declara con otro contenido se rehúsa antes de copiar', async () => {
    const files = fixture()
    await declare(installedScript(), files)
    await server?.stop()
    const before = readFileSync(files.catalogPath, 'utf8')
    const script = installedScript()
    await expect(declare({ ...script, show: { ...script.show, capabilities: ['completion'] } }, files)).rejects.toThrow(/ya declara/)
    expect(paths()).not.toContain('/api/copy')
    expect(readFileSync(files.catalogPath, 'utf8')).toBe(before)
  })

  test('declarar dos veces lo mismo deja el catálogo igual', async () => {
    const files = fixture()
    await declare(installedScript(), files)
    await server?.stop()
    const before = readFileSync(files.catalogPath, 'utf8')
    await declare(installedScript(), files)
    expect(readFileSync(files.catalogPath, 'utf8')).toBe(before)
  })

  test('redeclarar más tarde conserva el instante de la primera declaración', async () => {
    const files = fixture()
    const first = await declare(installedScript(), files)
    await server?.stop()
    server = startFakeOllama(installedScript())
    const later = await declareInstalledModel('qwen2.5:0.5b', { api: new OllamaApi(server.baseUrl), mountpoint: files.mountpoint, catalogPath: files.catalogPath, now: () => new Date('2026-10-02T00:00:00Z') })
    expect(later.declaredAt).toBe(first.declaredAt)
  })

  test('si /api/copy falla, el catálogo no se escribe', async () => {
    const files = fixture()
    await expect(declare(installedScript({ copyStatus: 500 }), files)).rejects.toThrow(/\/api\/copy/)
    expect(existsSync(files.catalogPath)).toBe(false)
  })
})

const HF_COMMIT = '7ae557604adf67be50417f59c2c2f167def9a775'
const HF_REPOSITORY = 'qwen/qwen2.5-0.5b-instruct'
const HF_CONTRACT_NAME = thyroxModelName({ repository: HF_REPOSITORY, quantization: 'q4_k_m', source: 'hf', revision: HF_COMMIT })

function installedUnder(name: string, digest = MANIFEST_DIGEST): FakeOllamaScript {
  return installedScript({ tags: [{ name, digest }] })
}

describe('declareInstalledModel — un nombre que ya es contractual conserva su identidad', () => {
  test('hf con --revision correcta: repositorio, fuente, cuantización y commit del nombre, sin copia', async () => {
    const files = fixture()
    server = startFakeOllama(installedUnder(HF_CONTRACT_NAME))
    const entry = await declareInstalledModel(HF_CONTRACT_NAME, { api: new OllamaApi(server.baseUrl), mountpoint: files.mountpoint, catalogPath: files.catalogPath, now: () => NOW }, { revision: HF_COMMIT.toUpperCase() })
    expect(entry).toMatchObject({ name: HF_CONTRACT_NAME, repository: HF_REPOSITORY, source: 'hf', revision: HF_COMMIT, quantization: 'q4_k_m' })
    expect(paths()).not.toContain('/api/copy')
    expect((await loadModelCatalog(files.catalogPath)).byName(HF_CONTRACT_NAME)).toEqual(entry)
  })

  test('hf sin --revision se rehúsa diciendo que hace falta, sin copiar ni escribir', async () => {
    const files = fixture()
    await expect(declare(installedUnder(HF_CONTRACT_NAME), files, HF_CONTRACT_NAME)).rejects.toThrow(/--revision/)
    expect(paths()).not.toContain('/api/copy')
    expect(existsSync(files.catalogPath)).toBe(false)
  })

  test('hf con un commit de otro prefijo se rehúsa nombrando los dos', async () => {
    const files = fixture()
    server = startFakeOllama(installedUnder(HF_CONTRACT_NAME))
    const other = 'f'.repeat(40)
    const declaring = declareInstalledModel(HF_CONTRACT_NAME, { api: new OllamaApi(server.baseUrl), mountpoint: files.mountpoint, catalogPath: files.catalogPath, now: () => NOW }, { revision: other })
    await expect(declaring).rejects.toThrow(new RegExp(`${other}.*${HF_COMMIT.slice(0, 12)}`))
    expect(paths()).not.toContain('/api/copy')
    expect(existsSync(files.catalogPath)).toBe(false)
  })

  test('hf con una --revision que no son 40 hex se rehúsa', async () => {
    const files = fixture()
    server = startFakeOllama(installedUnder(HF_CONTRACT_NAME))
    const declaring = declareInstalledModel(HF_CONTRACT_NAME, { api: new OllamaApi(server.baseUrl), mountpoint: files.mountpoint, catalogPath: files.catalogPath, now: () => NOW }, { revision: HF_COMMIT.slice(0, 12) })
    await expect(declaring).rejects.toThrow(/--revision 7ae557604adf no es un commit de Hugging Face de 40 hex/)
    expect(existsSync(files.catalogPath)).toBe(false)
  })

  test('ollama contractual: la revisión es el digest completo del manifiesto, sin copia', async () => {
    const files = fixture()
    const entry = await declare(installedUnder(CONTRACT_NAME, `sha256:${MANIFEST_DIGEST}`), files, CONTRACT_NAME)
    expect(entry).toMatchObject({ name: CONTRACT_NAME, repository: 'library/qwen2.5-0.5b', source: 'ollama', revision: MANIFEST_DIGEST })
    expect(paths()).not.toContain('/api/copy')
    expect((await loadModelCatalog(files.catalogPath)).byName(CONTRACT_NAME)).toEqual(entry)
  })

  test('ollama contractual con un manifiesto de otro digest se rehúsa nombrando los dos', async () => {
    const files = fixture()
    const other = 'e'.repeat(64)
    await expect(declare(installedUnder(CONTRACT_NAME, other), files, CONTRACT_NAME)).rejects.toThrow(new RegExp(`${other}.*${MANIFEST_DIGEST.slice(0, 12)}`))
    expect(paths()).not.toContain('/api/copy')
    expect(existsSync(files.catalogPath)).toBe(false)
  })

  test('--revision fuera de un nombre contractual hf se rehúsa en vez de ignorarse', async () => {
    const files = fixture()
    server = startFakeOllama(installedScript())
    const declaring = declareInstalledModel('qwen2.5:0.5b', { api: new OllamaApi(server.baseUrl), mountpoint: files.mountpoint, catalogPath: files.catalogPath, now: () => NOW }, { revision: HF_COMMIT })
    await expect(declaring).rejects.toThrow(/--revision/)
    expect(existsSync(files.catalogPath)).toBe(false)
  })

  test('un nombre que parece del contrato pero no lo reconstruye sigue el camino de biblioteca, con copia', async () => {
    const files = fixture()
    const lookalike = 'thyrox-qwen:q4_k_m-hf-7ae557604adf'
    const entry = await declare(installedUnder(lookalike), files, lookalike)
    expect(entry).toMatchObject({ source: 'ollama', repository: 'library/thyrox-qwen-q4_k_m-hf-7ae557604adf', revision: MANIFEST_DIGEST })
    expect(paths()).toContain('/api/copy')
  })
})
