import { describe, expect, test } from 'bun:test'

import {
  QUANTIZATION_STEPS,
  SCRATCH_METADATA_MARGIN_BYTES,
  evaluateScratchCapacity,
  isStepComplete,
  nextPendingStep,
  requiredScratchBytes,
  stepFingerprint,
  firstStepToRun,
  validateSourceSpec,
  type StepRecord,
} from '../quantizationPlan.ts'

/** Total medido de la fuente de Qwen2.5-Coder-1.5B-Instruct en 2e1fd397 (API de Hugging Face). */
const CODER_1_5B_SOURCE_BYTES = 3_098_973_788
const FORTY_GIB = 42_949_672_960

const INPUTS = {
  source: { repository: 'Qwen/x', revision: 'a'.repeat(40), files: [{ path: 'm.safetensors', sizeBytes: 1, digest: 'sha256:aa' as const }] },
  imageDigest: `sha256:${'b'.repeat(64)}`,
  method: 'direct' as const,
  level: 'Q4_K_M',
}

function record(step: StepRecord['step'], sha256?: string): StepRecord {
  const artifact = sha256 === undefined ? undefined : { path: `/scratch/${step}`, sha256, bytes: 1 }
  return { step, completedAt: '2026-10-01T00:00:00Z', fingerprint: stepFingerprint(step, INPUTS), ...(artifact === undefined ? {} : { artifact }) }
}

const intact = async () => true
const tampered = async () => false

describe('quantization plan', () => {
  test('releases each artifact only after the next one is verified', () => {
    expect(QUANTIZATION_STEPS.indexOf('release-source')).toBeGreaterThan(QUANTIZATION_STEPS.indexOf('verify-intermediate'))
    expect(QUANTIZATION_STEPS.indexOf('release-intermediate')).toBeGreaterThan(QUANTIZATION_STEPS.indexOf('validate'))
  })

  test('the direct peak is source plus F16 for the measured 1.5B source', () => {
    expect(requiredScratchBytes(CODER_1_5B_SOURCE_BYTES, 'direct')).toBe(2 * CODER_1_5B_SOURCE_BYTES + SCRATCH_METADATA_MARGIN_BYTES)
  })

  test('requantization through Q8_0 needs less scratch than the direct method', () => {
    expect(requiredScratchBytes(CODER_1_5B_SOURCE_BYTES, 'requantized_q8_to_q4'))
      .toBeLessThan(requiredScratchBytes(CODER_1_5B_SOURCE_BYTES, 'direct'))
  })

  test('refuses with its three figures when the declared minimum is not free', () => {
    const verdict = evaluateScratchCapacity({ freeBytes: 9_000_000_000, requiredBytes: 6_500_000_000, minimumFreeBytes: FORTY_GIB })
    expect(verdict.admitted).toBe(false)
    if (!verdict.admitted) {
      expect(verdict.reason).toContain(String(FORTY_GIB))
      expect(verdict.freeBytes).toBe(9_000_000_000)
    }
  })

  test('admits when free space covers the larger of peak and minimum', () => {
    expect(evaluateScratchCapacity({ freeBytes: 9_000_000_000, requiredBytes: 6_500_000_000, minimumFreeBytes: 0 }).admitted).toBe(true)
  })

  test('rejects a revision that is not a full commit', () => {
    expect(() => validateSourceSpec({ repository: 'Qwen/x', revision: 'main', files: [{ path: 'a', sizeBytes: 1, digest: 'sha256:a' }] })).toThrow()
  })
})

describe('pending step', () => {
  test('a fresh run starts at download', async () => {
    expect(await nextPendingStep([], intact, INPUTS)).toBe('download')
  })

  test('a rerun after a failed quantize skips download and convert', async () => {
    const records = [record('download', 'a'), record('convert', 'b'), record('verify-intermediate'), record('release-source')]
    expect(await nextPendingStep(records, intact, INPUTS)).toBe('quantize')
  })

  test('repeats a step whose artifact no longer matches its sha256', async () => {
    expect(await isStepComplete('convert', [record('download', 'a'), record('convert', 'b')], tampered, INPUTS)).toBe(false)
  })

  test('does not demand a released artifact on disk', async () => {
    const records = [record('download', 'a'), record('convert', 'b'), record('release-source')]
    expect(await isStepComplete('download', records, tampered, INPUTS)).toBe(true)
  })

  test('a complete run has nothing pending', async () => {
    const records = QUANTIZATION_STEPS.map(step => record(step))
    expect(await nextPendingStep(records, intact, INPUTS)).toBeUndefined()
  })
})

describe('step fingerprint', () => {
  const inputs = {
    source: { repository: 'Qwen/x', revision: 'a'.repeat(40), files: [{ path: 'm.safetensors', sizeBytes: 1, digest: 'sha256:aa' as const }] },
    imageDigest: `sha256:${'b'.repeat(64)}`,
    method: 'direct' as const,
    level: 'Q4_K_M',
  }

  test('download depends on the source, not on the lab image', () => {
    const other = { ...inputs, imageDigest: `sha256:${'c'.repeat(64)}` }
    expect(stepFingerprint('download', other)).toBe(stepFingerprint('download', inputs))
    expect(stepFingerprint('convert', other)).not.toBe(stepFingerprint('convert', inputs))
  })

  test('a change upstream reaches every later step', () => {
    const other = { ...inputs, source: { ...inputs.source, revision: 'd'.repeat(40) } }
    for (const step of QUANTIZATION_STEPS) expect(stepFingerprint(step, other)).not.toBe(stepFingerprint(step, inputs))
  })

  test('a step recorded under another fingerprint is pending again', async () => {
    const records = [{ ...record('download', 'a'), fingerprint: stepFingerprint('download', inputs) },
      { ...record('convert', 'b'), fingerprint: 'stale' }]
    expect(await isStepComplete('download', records, intact, inputs)).toBe(true)
    expect(await isStepComplete('convert', records, intact, inputs)).toBe(false)
  })
})

describe('first step to run', () => {
  test('restarts at the producer when the pending step needs a released artifact', async () => {
    const records = ['download', 'convert', 'verify-intermediate', 'release-source', 'quantize', 'validate', 'release-intermediate', 'register']
      .map(step => record(step as StepRecord['step']))
    const otherImage = { ...INPUTS, imageDigest: `sha256:${'f'.repeat(64)}` }
    expect(await firstStepToRun(records, intact, otherImage)).toBe('download')
  })

  test('resumes at the pending step when what it consumes is still on disk', async () => {
    const records = [record('download', 'a'), record('convert', 'b'), record('verify-intermediate'), record('release-source')]
    expect(await firstStepToRun(records, intact, INPUTS)).toBe('quantize')
  })
})
