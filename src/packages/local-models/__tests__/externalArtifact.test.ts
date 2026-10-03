import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { SCRATCH_METADATA_MARGIN_BYTES } from '@thyrox/model-artifacts/quantizationPlan.ts'
import { syntheticGgufBytes } from '@thyrox/model-artifacts/testing/syntheticGguf.ts'

import { importExternalArtifact, type ExternalArtifactDeps, type ExternalArtifactRequest } from '../externalArtifact.js'
import type { LabStep, LabStepResult } from '../quantizationLab.js'
import { toolOf, writeCapturedOutput } from '../testing/fakeQuantizationLab.js'
import type { AdmissionOutcome } from '../resourceAdmission.js'

const REPOSITORY = 'Qwen/Tiny-Coder-GGUF'
const REVISION = 'c'.repeat(40)
const FILE = 'tiny-q4_k_m.gguf'
const README = 'tiny readme'
const LICENSE = 'tiny license'
const GGUF = syntheticGgufBytes({ tensorCount: 1n, entries: [
  ['general.architecture', { type: 'string', value: 'qwen2' }],
  ['general.file_type', { type: 'uint32', value: 15 }],
  ['qwen2.block_count', { type: 'uint32', value: 24 }],
  ['qwen2.context_length', { type: 'uint32', value: 32_768 }],
  ['qwen2.embedding_length', { type: 'uint32', value: 896 }],
  ['qwen2.attention.head_count', { type: 'uint32', value: 14 }],
  ['qwen2.attention.head_count_kv', { type: 'uint32', value: 2 }],
] })
const GGUF_SHA256 = createHash('sha256').update(GGUF).digest('hex')

function gitBlobSha1(content: string): string {
  return createHash('sha1').update(`blob ${Buffer.byteLength(content)}\0`).update(content).digest('hex')
}

const CORPUS_SIBLINGS = {
  'README.md': { rfilename: 'README.md', size: README.length, blobId: gitBlobSha1(README) },
  LICENSE: { rfilename: 'LICENSE', size: LICENSE.length, blobId: gitBlobSha1(LICENSE) },
}

/** `corpusFiles` declara qué archivos del corpus publica la fuente; por defecto, los dos. */
function fakeHub(publishedSha256 = GGUF_SHA256, corpusFiles: readonly (keyof typeof CORPUS_SIBLINGS)[] = ['README.md', 'LICENSE'],
  gguf: Uint8Array = GGUF) {
  const downloads: string[] = []
  const files: Record<string, Uint8Array | string> = { [FILE]: gguf, 'README.md': README, LICENSE }
  const fetcher = async (url: string): Promise<Response> => {
    if (url.includes('/api/models/')) {
      return Response.json({ sha: REVISION, cardData: { license: 'apache-2.0' }, siblings: [
        { rfilename: FILE, size: gguf.length, lfs: { sha256: publishedSha256 } },
        ...corpusFiles.map(name => CORPUS_SIBLINGS[name]),
        { rfilename: 'other-q8_0.gguf', size: 999, lfs: { sha256: 'd'.repeat(64) } },
      ] })
    }
    const name = url.split('/').pop()!
    downloads.push(name)
    return new Response(files[name]! as BodyInit)
  }
  return { fetcher, downloads }
}

function fakeLab(scratchDir: () => string) {
  const commands: string[] = []
  const runInLab = async (step: LabStep): Promise<LabStepResult> => {
    commands.push(toolOf(step))
    const output = toolOf(step) === 'llama-simple'
      ? { stdout: 'return n', stderr: 'speed: 4.5 t/s' }
      : { stdout: '', stderr: 'Final estimate: PPL = 2.75 +/- 0.05' }
    writeCapturedOutput(scratchDir(), step, output)
    return { exitCode: 0, stdout: '', stderr: '', containerName: 'thyrox-worker-lab', containerId: 'lab-id' }
  }
  return { runInLab, commands }
}

let root: string
let request: ExternalArtifactRequest

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'external-artifact-'))
  request = { repository: REPOSITORY, revision: REVISION, parts: [{ file: FILE, sha256: GGUF_SHA256 }], quantization: 'Q4_K_M',
    scratchDir: join(root, 'scratch'), runDir: join(root, 'run'), memoryLimitBytes: 1024 ** 3 }
})

afterEach(() => rmSync(root, { recursive: true, force: true }))

function deps(overrides: Partial<ExternalArtifactDeps> & Pick<ExternalArtifactDeps, 'fetcher' | 'runInLab'>): ExternalArtifactDeps {
  return {
    admission: { admitDisk: async () => ({ admitted: true }), admitMemory: async () => ({ admitted: true }), releaseAll: async () => {} },
    freeBytes: async () => 10 ** 12,
    catalogPath: join(root, 'catalog.json'),
    labImageDigest: `sha256:${'b'.repeat(64)}`,
    now: () => new Date('2026-10-01T03:00:00Z'),
    ...overrides,
  }
}

describe('external artifact import', () => {
  test('validates and registers with external provenance', async () => {
    const hub = fakeHub()
    const outcome = await importExternalArtifact(request, deps({ fetcher: hub.fetcher, runInLab: fakeLab(() => request.scratchDir).runInLab }))
    expect(outcome.kind).toBe('completed')
    const provenance = JSON.parse(readFileSync(join(request.runDir, 'provenance.json'), 'utf8'))
    expect(provenance).toMatchObject({
      provenance: 'external', repository: REPOSITORY, revision: REVISION, file: FILE, sha256: GGUF_SHA256,
      bytes: GGUF.length, quantization: 'Q4_K_M', license: 'apache-2.0', acquiredAt: '2026-10-01T03:00:00.000Z',
      validation: { loaded: true, tokensPerSecond: 4.5, perplexity: 2.75 },
    })
    expect(hub.downloads.sort()).toEqual([FILE, 'LICENSE', 'README.md'].sort())
    expect(provenance.missingCorpusFiles).toBeUndefined()
    expect(JSON.parse(readFileSync(request.runDir.replace(/run$/, 'catalog.json'), 'utf8')).entries).toHaveLength(1)
  })

  test('validates the declared quantization against the file type the GGUF declares', async () => {
    const f16 = syntheticGgufBytes({ tensorCount: 1n, entries: [
      ['general.architecture', { type: 'string', value: 'qwen2' }],
      ['general.file_type', { type: 'uint32', value: 1 }],
      ['qwen2.block_count', { type: 'uint32', value: 24 }],
      ['qwen2.context_length', { type: 'uint32', value: 32_768 }],
      ['qwen2.embedding_length', { type: 'uint32', value: 896 }],
      ['qwen2.attention.head_count', { type: 'uint32', value: 14 }],
      ['qwen2.attention.head_count_kv', { type: 'uint32', value: 2 }],
    ] })
    const f16Sha256 = createHash('sha256').update(f16).digest('hex')
    const hub = fakeHub(f16Sha256, ['README.md', 'LICENSE'], f16)
    const f16Request: ExternalArtifactRequest = { ...request, parts: [{ file: FILE, sha256: f16Sha256 }], quantization: 'F16' }
    const outcome = await importExternalArtifact(f16Request, deps({ fetcher: hub.fetcher, runInLab: fakeLab(() => request.scratchDir).runInLab }))
    expect(outcome.kind).toBe('completed')
    expect(JSON.parse(readFileSync(join(request.runDir, 'provenance.json'), 'utf8')).quantization).toBe('F16')
  })

  test('builds the validation corpus from the corpus files the source publishes', async () => {
    const hub = fakeHub(GGUF_SHA256, ['README.md'])
    const outcome = await importExternalArtifact(request, deps({ fetcher: hub.fetcher, runInLab: fakeLab(() => request.scratchDir).runInLab }))
    expect(outcome.kind).toBe('completed')
    expect(hub.downloads.sort()).toEqual([FILE, 'README.md'].sort())
    const provenance = JSON.parse(readFileSync(join(request.runDir, 'provenance.json'), 'utf8'))
    expect(provenance.missingCorpusFiles).toEqual(['LICENSE'])
  })

  test('refuses before downloading when the source publishes no corpus file', async () => {
    const hub = fakeHub(GGUF_SHA256, [])
    const outcome = await importExternalArtifact(request, deps({ fetcher: hub.fetcher, runInLab: fakeLab(() => request.scratchDir).runInLab }))
    expect(outcome).toMatchObject({ kind: 'refused', reason: expect.stringContaining('README.md') })
    expect(hub.downloads).toHaveLength(0)
  })

  test('refuses before downloading when the published sha256 differs from the pinned one', async () => {
    const hub = fakeHub('e'.repeat(64))
    const outcome = await importExternalArtifact(request, deps({ fetcher: hub.fetcher, runInLab: fakeLab(() => request.scratchDir).runInLab }))
    expect(outcome.kind).toBe('refused')
    expect(hub.downloads).toHaveLength(0)
  })

  test('a rerun neither downloads nor validates again', async () => {
    const hub = fakeHub()
    const lab = fakeLab(() => request.scratchDir)
    await importExternalArtifact(request, deps({ fetcher: hub.fetcher, runInLab: lab.runInLab }))
    const [downloads, commands] = [hub.downloads.length, lab.commands.length]
    const second = await importExternalArtifact(request, deps({ fetcher: hub.fetcher, runInLab: lab.runInLab }))
    expect(second.kind).toBe('completed')
    expect(hub.downloads.length).toBe(downloads)
    expect(lab.commands.length).toBe(commands)
  })

  test('a rerun asks only for the bytes still missing from the scratch', async () => {
    const hub = fakeHub()
    const lab = fakeLab(() => request.scratchDir)
    await importExternalArtifact(request, deps({ fetcher: hub.fetcher, runInLab: lab.runInLab }))
    const almostFull = async () => SCRATCH_METADATA_MARGIN_BYTES + 1
    const second = await importExternalArtifact(request, deps({ fetcher: hub.fetcher, runInLab: lab.runInLab, freeBytes: almostFull }))
    expect(second.kind).toBe('completed')
  })

  test('another lab image revalidates without downloading again', async () => {
    const hub = fakeHub()
    const lab = fakeLab(() => request.scratchDir)
    await importExternalArtifact(request, deps({ fetcher: hub.fetcher, runInLab: lab.runInLab }))
    const [downloads, commands] = [hub.downloads.length, lab.commands.length]
    await importExternalArtifact(request, deps({ fetcher: hub.fetcher, runInLab: lab.runInLab, labImageDigest: `sha256:${'f'.repeat(64)}` }))
    expect(hub.downloads.length).toBe(downloads)
    expect(lab.commands.length).toBeGreaterThan(commands)
  })

  test('an admission refusal stops before downloading', async () => {
    const hub = fakeHub()
    const refused: AdmissionOutcome = { admitted: false, unmeasured: false, detail: 'no cabe' }
    const admission = { admitDisk: async () => refused, admitMemory: async () => ({ admitted: true }) as AdmissionOutcome, releaseAll: async () => {} }
    const outcome = await importExternalArtifact(request, deps({ fetcher: hub.fetcher, runInLab: fakeLab(() => request.scratchDir).runInLab, admission }))
    expect(outcome.kind).toBe('refused')
    expect(hub.downloads).toHaveLength(0)
    expect(existsSync(join(request.scratchDir, FILE))).toBe(false)
  })
})

const SHARDS = ['tiny-q4_k_m-00001-of-00002.gguf', 'tiny-q4_k_m-00002-of-00002.gguf'] as const
const MERGED = 'tiny-q4_k_m.gguf'
const SHARD_BYTES = [new Uint8Array([1, 2, 3, 4]), new Uint8Array([5, 6, 7])] as const
const SHARD_SHA256 = SHARD_BYTES.map(bytes => createHash('sha256').update(bytes).digest('hex'))
const STILL_SPLIT = syntheticGgufBytes({ tensorCount: 1n, entries: [
  ['general.architecture', { type: 'string', value: 'qwen2' }],
  ['general.file_type', { type: 'uint32', value: 15 }],
  ['split.count', { type: 'uint16', value: 2 }],
] })

function fakeShardedHub(publishedSha256: readonly string[] = SHARD_SHA256) {
  const downloads: string[] = []
  const files: Record<string, Uint8Array | string> = { [SHARDS[0]]: SHARD_BYTES[0], [SHARDS[1]]: SHARD_BYTES[1], 'README.md': README, LICENSE }
  const fetcher = async (url: string): Promise<Response> => {
    if (url.includes('/api/models/')) {
      return Response.json({ sha: REVISION, cardData: { license: 'apache-2.0' }, siblings: [
        ...SHARDS.map((file, index) => ({ rfilename: file, size: SHARD_BYTES[index]!.length, lfs: { sha256: publishedSha256[index] } })),
        { rfilename: 'README.md', size: README.length, blobId: gitBlobSha1(README) },
        { rfilename: 'LICENSE', size: LICENSE.length, blobId: gitBlobSha1(LICENSE) },
      ] })
    }
    const name = url.split('/').pop()!
    downloads.push(name)
    return new Response(files[name]! as BodyInit)
  }
  return { fetcher, downloads }
}

/** El laboratorio que además fusiona: `llama-gguf-split --merge` escribe `merged` en la ruta de salida. */
function fakeMergingLab(scratchDir: () => string, merged: Uint8Array = GGUF) {
  const validating = fakeLab(scratchDir)
  const steps: LabStep[] = []
  const runInLab = async (step: LabStep): Promise<LabStepResult> => {
    steps.push(step)
    if (toolOf(step) !== 'llama-gguf-split') return validating.runInLab(step)
    validating.commands.push('llama-gguf-split')
    const output = join(scratchDir(), step.command[3]!.replace(/^\/scratch\/?/, ''))
    writeFileSync(output, merged)
    return { exitCode: 0, stdout: '', stderr: '', containerName: 'thyrox-worker-lab', containerId: 'lab-id' }
  }
  return { runInLab, steps, commands: validating.commands }
}

describe('external artifact import from official shards', () => {
  beforeEach(() => {
    request = { ...request, parts: SHARDS.map((file, index) => ({ file, sha256: SHARD_SHA256[index]! })) }
  })

  test('merges the shards in the lab and registers the merged GGUF with each official shard in its provenance', async () => {
    const hub = fakeShardedHub()
    const lab = fakeMergingLab(() => request.scratchDir)
    const outcome = await importExternalArtifact(request, deps({ fetcher: hub.fetcher, runInLab: lab.runInLab }))
    expect(outcome.kind).toBe('completed')
    expect(lab.steps[0]!.command).toEqual(['llama-gguf-split', '--merge', `/scratch/${SHARDS[0]}`, `/scratch/${MERGED}`])
    const provenance = JSON.parse(readFileSync(join(request.runDir, 'provenance.json'), 'utf8'))
    expect(provenance).toMatchObject({
      provenance: 'external', repository: REPOSITORY, revision: REVISION, file: MERGED, sha256: GGUF_SHA256, bytes: GGUF.length,
      shards: SHARDS.map((file, index) => ({ file, sha256: SHARD_SHA256[index], bytes: SHARD_BYTES[index]!.length })),
      assembly: { tool: 'llama-gguf-split --merge', labImageDigest: `sha256:${'b'.repeat(64)}` },
    })
    const catalog = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'))
    expect(catalog.entries).toHaveLength(1)
    expect(catalog.entries[0].artifact.sha256).toBe(GGUF_SHA256)
  })

  test('refuses before downloading when any shard is published with another sha256', async () => {
    const hub = fakeShardedHub([SHARD_SHA256[0]!, 'e'.repeat(64)])
    const outcome = await importExternalArtifact(request, deps({ fetcher: hub.fetcher, runInLab: fakeMergingLab(() => request.scratchDir).runInLab }))
    expect(outcome.kind).toBe('refused')
    expect(hub.downloads).toHaveLength(0)
  })

  test('refuses before downloading a shard set that is not the complete split', async () => {
    const hub = fakeShardedHub()
    const incomplete = { ...request, parts: [request.parts[0]!] }
    const outcome = await importExternalArtifact(incomplete, deps({ fetcher: hub.fetcher, runInLab: fakeMergingLab(() => request.scratchDir).runInLab }))
    expect(outcome.kind).toBe('refused')
    expect(hub.downloads).toHaveLength(0)
  })

  test('a merge that still declares a split fails instead of registering', async () => {
    const hub = fakeShardedHub()
    const lab = fakeMergingLab(() => request.scratchDir, STILL_SPLIT)
    const outcome = await importExternalArtifact(request, deps({ fetcher: hub.fetcher, runInLab: lab.runInLab }))
    expect(outcome.kind).toBe('failed')
    expect(existsSync(join(root, 'catalog.json'))).toBe(false)
  })

  test('a rerun neither downloads, merges nor validates again', async () => {
    const hub = fakeShardedHub()
    const lab = fakeMergingLab(() => request.scratchDir)
    await importExternalArtifact(request, deps({ fetcher: hub.fetcher, runInLab: lab.runInLab }))
    const [downloads, steps] = [hub.downloads.length, lab.steps.length]
    const second = await importExternalArtifact(request, deps({ fetcher: hub.fetcher, runInLab: lab.runInLab }))
    expect(second.kind).toBe('completed')
    expect(hub.downloads.length).toBe(downloads)
    expect(lab.steps.length).toBe(steps)
  })
})
