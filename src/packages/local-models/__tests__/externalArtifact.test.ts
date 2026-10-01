import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
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

function fakeHub(publishedSha256 = GGUF_SHA256) {
  const downloads: string[] = []
  const files: Record<string, Uint8Array | string> = { [FILE]: GGUF, 'README.md': README, LICENSE }
  const fetcher = async (url: string): Promise<Response> => {
    if (url.includes('/api/models/')) {
      return Response.json({ sha: REVISION, cardData: { license: 'apache-2.0' }, siblings: [
        { rfilename: FILE, size: GGUF.length, lfs: { sha256: publishedSha256 } },
        { rfilename: 'README.md', size: README.length, blobId: gitBlobSha1(README) },
        { rfilename: 'LICENSE', size: LICENSE.length, blobId: gitBlobSha1(LICENSE) },
        { rfilename: 'other-q8_0.gguf', size: 999, lfs: { sha256: 'd'.repeat(64) } },
      ] })
    }
    const name = url.split('/').pop()!
    downloads.push(name)
    return new Response(files[name]!)
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
  request = { repository: REPOSITORY, revision: REVISION, file: FILE, sha256: GGUF_SHA256, quantization: 'Q4_K_M',
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
    expect(JSON.parse(readFileSync(request.runDir.replace(/run$/, 'catalog.json'), 'utf8')).entries).toHaveLength(1)
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
