/**
 * Porte del contrato de `ccnmt: packages/provider/src/__tests__/geminiModelMapping.test.ts`
 * (15 casos en 5 describes).
 *
 * Conserva su arnes TRACKED por la razon que la fuente escribe: `mock.module`
 * sobre el modulo de entorno contamina el proceso entero en bun-test.
 *
 * La diferencia de fondo con su hermano de OpenAI, que estos casos fijan: sin
 * variable de entorno que resuelva la familia, este NO cae a un mapa por
 * defecto — LANZA. Gemini no tiene mapa de modelos aqui.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { resolveGeminiModel } from '../src/gemini/modelMapping.js'

const TRACKED = [
  'GEMINI_MODEL',
  'GEMINI_DEFAULT_HAIKU_MODEL',
  'GEMINI_DEFAULT_SONNET_MODEL',
  'GEMINI_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
] as const
const saved = new Map<string, string | undefined>()

beforeEach(() => {
  for (const k of TRACKED) {
    saved.set(k, process.env[k])
    delete process.env[k]
  }
})

afterEach(() => {
  for (const k of TRACKED) {
    const v = saved.get(k)
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  saved.clear()
})

describe('resolveGeminiModel — override explicito GEMINI_MODEL', () => {
  test('GEMINI_MODEL gana sobre la resolucion por familia', () => {
    process.env.GEMINI_MODEL = 'gemini-2.0-pro-experimental'
    expect(resolveGeminiModel('claude-haiku-4-5')).toBe('gemini-2.0-pro-experimental')
  })

  test('GEMINI_MODEL gana aunque GEMINI_DEFAULT_* este puesta', () => {
    process.env.GEMINI_MODEL = 'override'
    process.env.GEMINI_DEFAULT_HAIKU_MODEL = 'gemini-flash'
    expect(resolveGeminiModel('claude-haiku-4-5')).toBe('override')
  })
})

describe('resolveGeminiModel — deteccion de familia', () => {
  test('familia haiku toma GEMINI_DEFAULT_HAIKU_MODEL', () => {
    process.env.GEMINI_DEFAULT_HAIKU_MODEL = 'gemini-flash'
    expect(resolveGeminiModel('claude-haiku-4-5')).toBe('gemini-flash')
  })

  test('familia sonnet toma GEMINI_DEFAULT_SONNET_MODEL', () => {
    process.env.GEMINI_DEFAULT_SONNET_MODEL = 'gemini-pro'
    expect(resolveGeminiModel('claude-sonnet-4-5')).toBe('gemini-pro')
  })

  test('familia opus toma GEMINI_DEFAULT_OPUS_MODEL', () => {
    process.env.GEMINI_DEFAULT_OPUS_MODEL = 'gemini-ultra'
    expect(resolveGeminiModel('claude-opus-4-7')).toBe('gemini-ultra')
  })

  test('la deteccion de familia ignora la caja', () => {
    process.env.GEMINI_DEFAULT_HAIKU_MODEL = 'gemini-flash'
    expect(resolveGeminiModel('CLAUDE-HAIKU-4-5')).toBe('gemini-flash')
    expect(resolveGeminiModel('Claude-Haiku-4-5')).toBe('gemini-flash')
  })

  test('recorta el sufijo [1m] antes de detectar la familia', () => {
    process.env.GEMINI_DEFAULT_SONNET_MODEL = 'gemini-pro'
    expect(resolveGeminiModel('claude-sonnet-4-5[1m]')).toBe('gemini-pro')
  })

  test('recorta [1M] sin distinguir caja — a diferencia del de OpenAI', () => {
    process.env.GEMINI_DEFAULT_OPUS_MODEL = 'gemini-ultra'
    expect(resolveGeminiModel('claude-opus-4-7[1M]')).toBe('gemini-ultra')
  })
})

describe('resolveGeminiModel — compatibilidad con ANTHROPIC_DEFAULT_*', () => {
  test('cae a ANTHROPIC_DEFAULT_HAIKU_MODEL si la de GEMINI no esta', () => {
    process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = 'compat-haiku'
    expect(resolveGeminiModel('claude-haiku-4-5')).toBe('compat-haiku')
  })

  test('GEMINI_DEFAULT_* gana sobre ANTHROPIC_DEFAULT_*', () => {
    process.env.GEMINI_DEFAULT_SONNET_MODEL = 'gemini-pro'
    process.env.ANTHROPIC_DEFAULT_SONNET_MODEL = 'anthropic-fallback'
    expect(resolveGeminiModel('claude-sonnet-4-5')).toBe('gemini-pro')
  })
})

describe('resolveGeminiModel — modelos sin familia detectable', () => {
  test('pasa tal cual cuando no hay familia que detectar', () => {
    expect(resolveGeminiModel('custom-model-name-123')).toBe('custom-model-name-123')
  })

  test('recorta [1m] tambien en el modelo que pasa tal cual', () => {
    expect(resolveGeminiModel('weird-model[1m]')).toBe('weird-model')
  })
})

describe('resolveGeminiModel — el caso de error', () => {
  test('lanza ConfigurationError con familia detectada y sin variable', () => {
    expect(() => resolveGeminiModel('claude-haiku-4-5')).toThrow(
      /GEMINI_MODEL or GEMINI_DEFAULT_HAIKU_MODEL/i,
    )
  })

  test('el mensaje nombra la familia correcta', () => {
    try {
      resolveGeminiModel('claude-opus-4-7')
      expect.unreachable()
    } catch (e) {
      expect((e as Error).message).toContain('OPUS')
    }
  })

  test('el mensaje lista la variable de compatibilidad como respaldo', () => {
    try {
      resolveGeminiModel('claude-sonnet-4-5')
      expect.unreachable()
    } catch (e) {
      expect((e as Error).message).toContain('ANTHROPIC_DEFAULT_SONNET_MODEL')
    }
  })
})
