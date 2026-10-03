import { describe, expect, test } from 'bun:test'

import {
  QUANTIZATION_LEVELS,
  UnknownQuantizationLevelError,
  normalizeQuantizationLevel,
  quantizationBackend,
} from '../quantizationLevel.js'

describe('normalizeQuantizationLevel', () => {
  test('las mayúsculas no distinguen niveles: Q4_K_M ≡ q4_k_m', () => {
    expect(normalizeQuantizationLevel('Q4_K_M')).toBe('q4_k_m')
    expect(normalizeQuantizationLevel('q4_k_m')).toBe('q4_k_m')
    expect(normalizeQuantizationLevel('INT4')).toBe('int4')
  })

  test('un alias de llama-quantize resuelve a su nivel canónico, no a un segundo nombre', () => {
    expect(normalizeQuantizationLevel('Q4_K')).toBe('q4_k_m')
    expect(normalizeQuantizationLevel('q3_k')).toBe('q3_k_m')
    expect(normalizeQuantizationLevel('Q5_K')).toBe('q5_k_m')
  })

  test('rehúsa un nivel desconocido nombrándolo', () => {
    expect(() => normalizeQuantizationLevel('q9_z')).toThrow(UnknownQuantizationLevelError)
    expect(() => normalizeQuantizationLevel('q9_z')).toThrow(/q9_z/)
    expect(() => normalizeQuantizationLevel('')).toThrow(UnknownQuantizationLevelError)
  })
})

describe('quantizationBackend', () => {
  test('los K-quants y los cuantos clásicos los produce llama-quantize', () => {
    for (const level of ['Q4_K_M', 'q8_0', 'Q4_0', 'Q6_K', 'IQ4_XS', 'Q4_K']) {
      expect(quantizationBackend(level)).toBe('llama-quantize')
    }
  })

  test('int4, int8, nvfp4, mxfp4 y mxfp8 sólo los produce ollama create desde safetensors', () => {
    for (const level of ['int4', 'int8', 'nvfp4', 'mxfp4', 'MXFP8']) {
      expect(quantizationBackend(level)).toBe('ollama-create')
    }
  })

  test('f16 y bf16 salen del convertidor', () => {
    expect(quantizationBackend('F16')).toBe('convert')
    expect(quantizationBackend('bf16')).toBe('convert')
  })

  test('rehúsa lo desconocido en vez de elegir un backend por defecto', () => {
    expect(() => quantizationBackend('fp3')).toThrow(UnknownQuantizationLevelError)
  })
})

describe('QUANTIZATION_LEVELS', () => {
  test('cada nivel canónico está en minúsculas y no lleva guion, que separa partes del nombre', () => {
    for (const level of Object.keys(QUANTIZATION_LEVELS)) {
      expect(level).toBe(level.toLowerCase())
      expect(level.includes('-')).toBe(false)
    }
  })
})
