import { describe, expect, test } from 'bun:test'

import {
  QUANTIZATION_STEPS,
  SCRATCH_METADATA_MARGIN_BYTES,
  evaluateScratchCapacity,
  isStepComplete,
  nextPendingStep,
  requiredScratchBytes,
  validateSourceSpec,
  type StepRecord,
} from '../quantizationPlan.ts'

/** Total medido de la fuente de Qwen2.5-Coder-1.5B-Instruct en 2e1fd397 (API de Hugging Face). */
const CODER_1_5B_SOURCE_BYTES = 3_098_973_788
const FORTY_GIB = 42_949_672_960

function record(step: StepRecord['step'], sha256?: string): StepRecord {
  const artifact = sha256 === undefined ? undefined : { path: `/scratch/${step}`, sha256, bytes: 1 }
  return { step, completedAt: '2026-10-01T00:00:00Z', ...(artifact === undefined ? {} : { artifact }) }
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
    expect(await nextPendingStep([], intact)).toBe('download')
  })

  test('a rerun after a failed quantize skips download and convert', async () => {
    const records = [record('download', 'a'), record('convert', 'b'), record('verify-intermediate'), record('release-source')]
    expect(await nextPendingStep(records, intact)).toBe('quantize')
  })

  test('repeats a step whose artifact no longer matches its sha256', async () => {
    expect(await isStepComplete('convert', [record('download', 'a'), record('convert', 'b')], tampered)).toBe(false)
  })

  test('does not demand a released artifact on disk', async () => {
    const records = [record('download', 'a'), record('convert', 'b'), record('release-source')]
    expect(await isStepComplete('download', records, tampered)).toBe(true)
  })

  test('a complete run has nothing pending', async () => {
    const records = QUANTIZATION_STEPS.map(step => record(step))
    expect(await nextPendingStep(records, intact)).toBeUndefined()
  })
})
