import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { QUANTIZATION_STEPS } from '@thyrox/model-artifacts/quantizationPlan.ts'
import { syntheticGgufBytes } from '@thyrox/model-artifacts/testing/syntheticGguf.ts'
import { createMemorySharedStateStore } from '@thyrox/shared-state/memory.ts'

import type { AdmissionOutcome, ResourceAdmission } from '../resourceAdmission.js'
import { parseContainerMeasure, type LabStep, type LabStepResult } from '../quantizationLab.js'
import { RunStateConflictError, runQuantization, type QuantizationRequest, type QuantizationRunDeps } from '../quantizationRun.js'
import { RunLeaseBusyError, acquireRunLease } from '../runLease.js'

const REPOSITORY = 'Qwen/Tiny-Coder'
const REVISION = 'a'.repeat(40)
const WEIGHTS = new Uint8Array(1600).fill(7)
const README = 'tiny readme'
const LICENSE = 'tiny license'

function gitBlobSha1(content: string): string {
  return createHash('sha1').update(`blob ${Buffer.byteLength(content)}\0`).update(content).digest('hex')
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/** Hub falso: la API de la revisión y la descarga de cada archivo, contando las descargas. */
function fakeHub(options: { corruptWeights?: boolean } = {}) {
  const downloads: string[] = []
  const files: Record<string, Uint8Array | string> = { 'model.safetensors': WEIGHTS, 'README.md': README, LICENSE }
  const fetcher = async (url: string): Promise<Response> => {
    if (url.includes('/api/models/')) {
      return Response.json({ sha: REVISION, siblings: [
        { rfilename: 'model.safetensors', size: WEIGHTS.length, lfs: { sha256: sha256(WEIGHTS) } },
        { rfilename: 'README.md', size: README.length, blobId: gitBlobSha1(README) },
        { rfilename: 'LICENSE', size: LICENSE.length, blobId: gitBlobSha1(LICENSE) },
      ] })
    }
    const name = url.split('/').pop()!
    downloads.push(name)
    const body = name === 'model.safetensors' && options.corruptWeights ? new Uint8Array(1600).fill(9) : files[name]!
    return new Response(body)
  }
  return { fetcher, downloads }
}

function gguf(fileType: number, padToBytes: number): Uint8Array {
  const header = syntheticGgufBytes({ tensorCount: 1n, entries: [
    ['general.architecture', { type: 'string', value: 'qwen2' }],
    ['general.file_type', { type: 'uint32', value: fileType }],
  ] })
  const padded = new Uint8Array(Math.max(padToBytes, header.length))
  padded.set(header)
  return padded
}

/** Laboratorio falso: escribe en el scratch lo que cada herramienta escribiría. */
function fakeLab(scratchDir: string, options: { failQuantizeOnce?: boolean } = {}) {
  const commands: string[] = []
  let quantizeFailures = options.failQuantizeOnce ? 1 : 0
  const hostPath = (labPath: string) => join(scratchDir, labPath.replace(/^\/scratch\/?/, ''))
  const runInLab = async (step: LabStep): Promise<LabStepResult> => {
    const [tool, ...args] = step.command
    commands.push(tool === 'python' ? 'convert' : tool!)
    if (tool === 'python') writeFileSync(hostPath(args[args.indexOf('--outfile') + 1]!), gguf(1, 3200))
    if (tool === 'llama-quantize') {
      if (quantizeFailures-- > 0) return { exitCode: 1, stdout: '', stderr: 'quantize failed' }
      writeFileSync(hostPath(args[1]!), gguf(15, 500))
    }
    if (tool === 'llama-simple') return { exitCode: 0, stdout: 'return n', stderr: 'decoded 16 tokens in 1.0 s, speed: 12.5 t/s', peakMemoryBytes: 2048 }
    if (tool === 'llama-perplexity') return { exitCode: 0, stdout: '', stderr: 'Final estimate: PPL = 9.87 +/- 0.10' }
    return { exitCode: 0, stdout: '', stderr: '', peakMemoryBytes: 4096 }
  }
  return { runInLab, commands }
}

function fakeAdmission(disk: AdmissionOutcome = { admitted: true }) {
  const released: string[] = []
  const admission: ResourceAdmission = {
    admitDisk: async () => disk,
    admitMemory: async () => ({ admitted: true }),
    releaseAll: async () => { released.push('all') },
  }
  return { admission, released }
}

let root: string
let request: QuantizationRequest

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'quantization-run-'))
  request = { repository: REPOSITORY, revision: REVISION, level: 'Q4_K_M', method: 'direct',
    scratchDir: join(root, 'scratch'), runDir: join(root, 'run'), minimumFreeBytes: 0, memoryLimitBytes: 1024 ** 3 }
})

afterEach(() => rmSync(root, { recursive: true, force: true }))

function deps(overrides: Partial<QuantizationRunDeps> & Pick<QuantizationRunDeps, 'fetcher' | 'runInLab'>): QuantizationRunDeps {
  return {
    labImage: { reference: 'localhost/lab:dev', id: 'abc', digest: `sha256:${'b'.repeat(64)}` },
    admission: fakeAdmission().admission,
    freeBytes: async () => 10 ** 12,
    register: async (_state, current) => {
      const path = join(current.runDir, 'manifest.json')
      writeFileSync(path, '{}')
      return { path, sha256: sha256(new TextEncoder().encode('{}')), bytes: 2 }
    },
    now: () => new Date('2026-10-01T00:00:00Z'),
    ...overrides,
  }
}

describe('quantization run', () => {
  test('a full run records every step and releases source and intermediate', async () => {
    const hub = fakeHub()
    const outcome = await runQuantization(request, deps({ fetcher: hub.fetcher, runInLab: fakeLab(request.scratchDir).runInLab }))
    expect(outcome.kind).toBe('completed')
    const state = JSON.parse(readFileSync(join(request.runDir, 'run.json'), 'utf8'))
    expect(state.records.map((record: { step: string }) => record.step)).toEqual([...QUANTIZATION_STEPS])
    expect(existsSync(join(request.scratchDir, 'source'))).toBe(false)
    expect(existsSync(join(request.scratchDir, 'model-F16.gguf'))).toBe(false)
    expect(state.observations.validation).toEqual({ loaded: true, tokensPerSecond: 12.5, perplexity: 9.87 })
    expect(state.observations.downloadedBytes).toBe(WEIGHTS.length + README.length + LICENSE.length)
    expect(state.metrics.steps.convert.peakMemoryBytes).toBe(4096)
  })

  test('a rerun after a failed quantize does not download or convert again', async () => {
    const hub = fakeHub()
    const lab = fakeLab(request.scratchDir, { failQuantizeOnce: true })
    const first = await runQuantization(request, deps({ fetcher: hub.fetcher, runInLab: lab.runInLab }))
    expect(first.kind).toBe('failed')
    const downloadsAfterFirst = hub.downloads.length
    const second = await runQuantization(request, deps({ fetcher: hub.fetcher, runInLab: lab.runInLab }))
    expect(second.kind).toBe('completed')
    expect(hub.downloads.length).toBe(downloadsAfterFirst)
    expect(lab.commands.filter(command => command === 'convert')).toHaveLength(1)
  })

  test('an admission refusal stops before downloading and writes the figures', async () => {
    const hub = fakeHub()
    const refused = fakeAdmission({ admitted: false, unmeasured: false, detail: 'no cabe la necesidad 7 bytes' })
    const outcome = await runQuantization(request, deps({ fetcher: hub.fetcher, runInLab: fakeLab(request.scratchDir).runInLab, admission: refused.admission }))
    expect(outcome.kind).toBe('refused')
    expect(hub.downloads).toHaveLength(0)
    expect(readFileSync(join(request.runDir, 'refusal.json'), 'utf8')).toContain('no cabe la necesidad 7 bytes')
    expect(existsSync(join(request.runDir, 'run.json'))).toBe(false)
    expect(refused.released).toEqual(['all'])
  })

  test('a declared minimum above the free scratch refuses without downloading', async () => {
    const hub = fakeHub()
    const outcome = await runQuantization({ ...request, minimumFreeBytes: 42_949_672_960 },
      deps({ fetcher: hub.fetcher, runInLab: fakeLab(request.scratchDir).runInLab, freeBytes: async () => 9_000_000_000 }))
    expect(outcome.kind).toBe('refused')
    expect(hub.downloads).toHaveLength(0)
  })

  test('a corrupted download fails the download step', async () => {
    const hub = fakeHub({ corruptWeights: true })
    const outcome = await runQuantization(request, deps({ fetcher: hub.fetcher, runInLab: fakeLab(request.scratchDir).runInLab }))
    expect(outcome.kind === 'failed' && outcome.step).toBe('download')
  })

  test('a different request on a used run directory is refused', async () => {
    const hub = fakeHub()
    await runQuantization(request, deps({ fetcher: hub.fetcher, runInLab: fakeLab(request.scratchDir).runInLab }))
    await expect(runQuantization({ ...request, method: 'requantized_q8_to_q4' }, deps({ fetcher: hub.fetcher, runInLab: fakeLab(request.scratchDir).runInLab })))
      .rejects.toBeInstanceOf(RunStateConflictError)
  })
})

describe('run lease', () => {
  test('refuses a second owner and frees on release', async () => {
    const store = createMemorySharedStateStore()
    const lease = await acquireRunLease(store, 'run-1', 'host:1')
    await expect(acquireRunLease(store, 'run-1', 'host:2')).rejects.toBeInstanceOf(RunLeaseBusyError)
    await lease.release()
    const next = await acquireRunLease(store, 'run-1', 'host:2')
    await next.release()
    await store.close()
  })
})

describe('container measure', () => {
  test('reads the peak of a measured container and nothing else', () => {
    expect(parseContainerMeasure('measured 6647808 4247552 18866\n')).toBe(6647808)
    expect(parseContainerMeasure('absent')).toBeUndefined()
  })
})
