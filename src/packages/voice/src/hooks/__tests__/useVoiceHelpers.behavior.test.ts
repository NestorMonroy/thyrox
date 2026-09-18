import { describe, expect, test } from 'bun:test'

import {
  FIRST_PRESS_FALLBACK_MS,
  computeLevel,
  normalizeLanguageForSTT,
} from '../useVoice.ts'

/**
 * Copia de `ccnmt: packages/voice/src/hooks/__tests__/
 * useVoiceHelpers.behavior.test.ts` con los comentarios traducidos; el cuerpo
 * es el de la fuente.
 *
 * Fija los ayudantes del modo de voz — el cálculo de amplitud del audio y la
 * normalización del idioma de STT. Un valor equivocado afecta directamente a
 * la experiencia de grabación:
 *   - computeLevel: si falla → el visualizador de waveform se aplana o satura
 *   - normalizeLanguageForSTT: si falla → las peticiones de STT salen con un
 *     código de idioma basura, y la transcripción cae a inglés en silencio
 */
describe('useVoice helpers (voice-mode UX invariants)', () => {
  describe('computeLevel (RMS amplitude → 0..1 with sqrt curve)', () => {
    test('empty buffer → 0 (no crash)', () => {
      expect(computeLevel(Buffer.alloc(0))).toBe(0)
    })

    test('all-zero PCM → 0 (silent)', () => {
      const buf = Buffer.alloc(64)
      expect(computeLevel(buf)).toBe(0)
    })

    test('positive 16-bit samples produce non-zero level', () => {
      // 16 muestras × 32 bytes? Cada muestra son 2 bytes.
      // Se rellena con el valor 5000 (muy por debajo del máximo 32767)
      const buf = Buffer.alloc(64)
      for (let i = 0; i < 32; i++) {
        buf.writeInt16LE(5000, i * 2)
      }
      const level = computeLevel(buf)
      expect(level).toBeGreaterThan(0)
      expect(level).toBeLessThanOrEqual(1)
    })

    test('full-amplitude signal saturates near 1', () => {
      // Max 16-bit signed = 32767. RMS of pure 32767 = 32767.
      // normalized = min(32767/2000, 1) = 1; sqrt(1) = 1.
      const buf = Buffer.alloc(64)
      for (let i = 0; i < 32; i++) {
        buf.writeInt16LE(32767, i * 2)
      }
      expect(computeLevel(buf)).toBe(1)
    })

    test('handles negative samples (16-bit signed sign extension)', () => {
      // Una muestra a -16000 tiene que dar el mismo nivel que +16000: se
      // eleva al cuadrado.
      const buf = Buffer.alloc(64)
      for (let i = 0; i < 32; i++) {
        buf.writeInt16LE(-16000, i * 2)
      }
      const negLevel = computeLevel(buf)

      const posBuf = Buffer.alloc(64)
      for (let i = 0; i < 32; i++) {
        posBuf.writeInt16LE(16000, i * 2)
      }
      const posLevel = computeLevel(posBuf)

      expect(negLevel).toBeCloseTo(posLevel, 5)
    })

    test('returns 0..1 range (never NaN, never > 1)', () => {
      // Se prueba con entradas variadas — un buffer aleatorio
      for (let trial = 0; trial < 10; trial++) {
        const buf = Buffer.alloc(64)
        for (let i = 0; i < 32; i++) {
          buf.writeInt16LE(Math.floor((Math.random() - 0.5) * 60000), i * 2)
        }
        const level = computeLevel(buf)
        expect(level).toBeGreaterThanOrEqual(0)
        expect(level).toBeLessThanOrEqual(1)
        expect(Number.isNaN(level)).toBe(false)
      }
    })
  })

  describe('normalizeLanguageForSTT (BCP-47-ish → STT-supported)', () => {
    test('undefined/empty → default STT language (no fellBackFrom)', () => {
      expect(normalizeLanguageForSTT(undefined).code).toBeTruthy()
      expect(normalizeLanguageForSTT('').code).toBeTruthy()
      // Vacío o undefined significan «sin preferencia», no un fallback
      expect(normalizeLanguageForSTT(undefined).fellBackFrom).toBeUndefined()
    })

    test('supported lowercase code passes through', () => {
      const result = normalizeLanguageForSTT('en')
      expect(result.code).toBe('en')
      expect(result.fellBackFrom).toBeUndefined()
    })

    test('mixed-case code lowercased ("EN" → "en")', () => {
      const result = normalizeLanguageForSTT('EN')
      expect(result.code).toBe('en')
    })

    test('whitespace trimmed (" en " → "en")', () => {
      const result = normalizeLanguageForSTT(' en ')
      expect(result.code).toBe('en')
    })

    test('region-variant falls back to base ("en-US" → "en")', () => {
      const result = normalizeLanguageForSTT('en-US')
      expect(result.code).toBe('en')
    })

    test('unknown language → default WITH fellBackFrom recording original', () => {
      const result = normalizeLanguageForSTT('klingon')
      expect(result.fellBackFrom).toBe('klingon')
      // el código cae a lo que valga DEFAULT_STT_LANGUAGE
      expect(result.code).toBeTruthy()
    })
  })

  describe('timing constants', () => {
    test('FIRST_PRESS_FALLBACK_MS = 2000 (covers macOS "Long" key repeat delay)', () => {
      // El deslizador de key repeat de macOS en «Long» puede tener un
      // retardo inicial de ~2 s. Fijar esto demasiado corto → la grabación
      // se detiene antes de que llegue el auto-repeat → un tap-and-release
      // pierde la grabación.
      expect(FIRST_PRESS_FALLBACK_MS).toBe(2000)
    })
  })
})
