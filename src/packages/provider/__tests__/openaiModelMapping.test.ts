/**
 * Porte del contrato de `ccnmt: packages/provider/src/__tests__/openaiModelMapping.test.ts`
 * (20 casos en 6 describes). El contrato es la suite de la fuente: los mismos
 * modelos, los mismos nombres de variable de entorno y los mismos veredictos.
 *
 * Se conserva su arnes de entorno TRACKED (guardar/borrar en `beforeEach`,
 * restaurar en `afterEach`) porque la fuente lo declara con su motivo escrito:
 * `mock.module` sobre el modulo de entorno contamina el proceso entero en
 * bun-test. Leer `process.env` real y restaurarlo es lo que evita esa
 * contaminacion, y esa razon no depende de si el puerto es copia o
 * reimplementacion.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { resolveOpenAIModel } from '../src/openai/modelMapping.js'

const TRACKED = [
  'OPENAI_MODEL',
  'OPENAI_DEFAULT_HAIKU_MODEL',
  'OPENAI_DEFAULT_SONNET_MODEL',
  'OPENAI_DEFAULT_OPUS_MODEL',
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

describe('resolveOpenAIModel — override explicito OPENAI_MODEL', () => {
  test('OPENAI_MODEL gana sobre la resolucion por familia', () => {
    process.env.OPENAI_MODEL = 'gpt-5-experimental'
    expect(resolveOpenAIModel('claude-haiku-4-5')).toBe('gpt-5-experimental')
  })

  test('OPENAI_MODEL gana sobre OPENAI_DEFAULT_HAIKU_MODEL', () => {
    process.env.OPENAI_MODEL = 'override'
    process.env.OPENAI_DEFAULT_HAIKU_MODEL = 'gpt-4o-mini'
    expect(resolveOpenAIModel('claude-haiku-4-5')).toBe('override')
  })

  test('OPENAI_MODEL gana sobre el mapa por defecto', () => {
    process.env.OPENAI_MODEL = 'override'
    expect(resolveOpenAIModel('claude-opus-4-7')).toBe('override')
  })
})

describe('resolveOpenAIModel — OPENAI_DEFAULT_<FAMILIA>_MODEL', () => {
  test('familia haiku toma OPENAI_DEFAULT_HAIKU_MODEL', () => {
    process.env.OPENAI_DEFAULT_HAIKU_MODEL = 'gpt-4o-mini-custom'
    expect(resolveOpenAIModel('claude-haiku-4-5')).toBe('gpt-4o-mini-custom')
  })

  test('familia sonnet toma OPENAI_DEFAULT_SONNET_MODEL', () => {
    process.env.OPENAI_DEFAULT_SONNET_MODEL = 'gpt-4o-custom'
    expect(resolveOpenAIModel('claude-sonnet-4-6')).toBe('gpt-4o-custom')
  })

  test('familia opus toma OPENAI_DEFAULT_OPUS_MODEL', () => {
    process.env.OPENAI_DEFAULT_OPUS_MODEL = 'o3-pro-custom'
    expect(resolveOpenAIModel('claude-opus-4-7')).toBe('o3-pro-custom')
  })
})

describe('resolveOpenAIModel — ANTHROPIC_DEFAULT_<FAMILIA>_MODEL, compatibilidad', () => {
  test('cae a ANTHROPIC_DEFAULT_HAIKU_MODEL si el de OPENAI no esta', () => {
    process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = 'compat-haiku'
    expect(resolveOpenAIModel('claude-haiku-4-5')).toBe('compat-haiku')
  })

  test('el de OPENAI gana sobre el de ANTHROPIC en la misma familia', () => {
    process.env.OPENAI_DEFAULT_SONNET_MODEL = 'gpt-4o'
    process.env.ANTHROPIC_DEFAULT_SONNET_MODEL = 'fallback-sonnet'
    expect(resolveOpenAIModel('claude-sonnet-4-6')).toBe('gpt-4o')
  })
})

describe('resolveOpenAIModel — mapa por defecto', () => {
  test('claude-sonnet-4-6 da gpt-4o sin variables de entorno', () => {
    expect(resolveOpenAIModel('claude-sonnet-4-6')).toBe('gpt-4o')
  })

  test('claude-opus-4-7 da o3 sin variables de entorno', () => {
    expect(resolveOpenAIModel('claude-opus-4-7')).toBe('o3')
  })

  test('claude-haiku-4-5-20251001 da gpt-4o-mini', () => {
    expect(resolveOpenAIModel('claude-haiku-4-5-20251001')).toBe('gpt-4o-mini')
  })

  test('claude-3-5-sonnet-20241022 da gpt-4o (alias heredado)', () => {
    expect(resolveOpenAIModel('claude-3-5-sonnet-20241022')).toBe('gpt-4o')
  })

  test('claude-3-5-haiku-20241022 da gpt-4o-mini (alias heredado)', () => {
    expect(resolveOpenAIModel('claude-3-5-haiku-20241022')).toBe('gpt-4o-mini')
  })

  test('claude-opus-4-5-20251101 da o3 (version concreta de opus)', () => {
    expect(resolveOpenAIModel('claude-opus-4-5-20251101')).toBe('o3')
  })
})

describe('resolveOpenAIModel — recorte del sufijo [1m]', () => {
  test('recorta [1m] ANTES de detectar la familia', () => {
    process.env.OPENAI_DEFAULT_SONNET_MODEL = 'gpt-4o-1m'
    expect(resolveOpenAIModel('claude-sonnet-4-6[1m]')).toBe('gpt-4o-1m')
  })

  test('recorta [1m] ANTES de consultar el mapa por defecto', () => {
    expect(resolveOpenAIModel('claude-sonnet-4-6[1m]')).toBe('gpt-4o')
  })

  test('devuelve el modelo ya recortado cuando nada mas encaja', () => {
    expect(resolveOpenAIModel('unknown-model[1m]')).toBe('unknown-model')
  })
})

describe('resolveOpenAIModel — paso directo', () => {
  test('devuelve la entrada tal cual sin familia, sin env y fuera del mapa', () => {
    expect(resolveOpenAIModel('custom-llm-v1')).toBe('custom-llm-v1')
  })

  test('devuelve la entrada cuando la deteccion de familia falla', () => {
    expect(resolveOpenAIModel('totally-unknown-model')).toBe('totally-unknown-model')
  })
})

describe('resolveOpenAIModel — la familia se detecta sin distinguir caja', () => {
  test('un nombre en mayusculas dispara la deteccion', () => {
    process.env.OPENAI_DEFAULT_OPUS_MODEL = 'override'
    expect(resolveOpenAIModel('CLAUDE-OPUS-4-7')).toBe('override')
  })
})
