import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildRegistry, MODEL_MUST_BE_A_CATALOG_ID } from '../src/registry.ts'
import {
  CATALOG, MODELS, MODEL_IDS, effortCostIndex, isModelAlias, isModelId,
  resolveModel, usageCostUsd,
} from '../src/models.ts'
import type { AgentDefinition } from '../src/types.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const PACKAGE = join(HERE, '..')
const REPO_ROOT = join(PACKAGE, '..', '..', '..')
const DUMP = join(REPO_ROOT, 'tools', 'claude-code-bin', '2.1.258', 'claude_strings.txt')

describe('src/models.json es derivado, no escrito a mano', () => {
  /**
   * Control POSITIVO REAL: el JSON vendorizado tiene que ser byte a byte lo
   * que el extractor produce hoy desde el volcado. Si alguien edita el JSON,
   * o el extractor cambia de forma, este caso cae. Es el control que faltó
   * en H-DOCS-1003: el JSON era válido y estable y llevaba 63 booleanos
   * invertidos.
   */
  test('coincide byte a byte con la extracción del volcado 2.1.258', () => {
    const result = Bun.spawnSync([
      'python3', join(PACKAGE, 'bin', 'extract_model_registry.py'), DUMP, '--stdout',
    ])
    expect(result.exitCode).toBe(0)
    const fresh = new TextDecoder().decode(result.stdout)
    const vendored = readFileSync(join(PACKAGE, 'src', 'models.json'), 'utf8')
    expect(vendored).toBe(fresh)
  })

  test('declara su fuente y su forma', () => {
    expect(CATALOG.fuente).toContain('claude-code-bin/2.1.258/claude_strings.txt')
    expect(CATALOG.schema_version).toBe(1)
    expect(MODEL_IDS.length).toBe(CATALOG.models.length)
  })
})

describe('el catálogo', () => {
  test('Fable 5.1 está declarado con su tier de cache_read barato', () => {
    const fable = MODELS['claude-fable-5-1']
    expect(fable.display_name).toBe('Fable 5.1')
    expect(fable.pricing_tier).toBe('tier_10_50_cache_read_0_25')
    expect(fable.pricing?.cache_read).toBe(0.25)
    expect(fable.pricing?.input).toBe(10)
  })

  /** El booleano minificado `!0` es true — el control de H-DOCS-1003. */
  test('los booleanos minificados se leen como true', () => {
    expect(MODELS['claude-fable-5-1'].context?.native_1m).toBe(true)
    expect(MODELS['claude-opus-5'].context?.native_1m).toBe(true)
  })

  test('todo tier nombrado resuelve a sus seis precios', () => {
    for (const m of CATALOG.models) {
      if (m.pricing_tier === null) continue
      expect(Object.keys(m.pricing ?? {}).sort()).toEqual(
        ['cache_read', 'cache_write_1h', 'cache_write_5m', 'input', 'output', 'web_search'],
      )
    }
  })
})

describe('alias contra identificador', () => {
  test('el alias resuelve distinto según el proveedor', () => {
    expect(resolveModel('fable')).toBe('claude-fable-5-1')
    expect(resolveModel('fable', 'gateway')).toBe('claude-fable-5')
    expect(resolveModel('sonnet')).toBe('claude-sonnet-5')
    expect(resolveModel('sonnet', 'bedrock')).toBe('claude-sonnet-4-5')
    expect(resolveModel('claude-opus-5')).toBe('claude-opus-5')
    expect(resolveModel('no-existe')).toBeNull()
  })

  test('isModelId distingue el identificador del alias', () => {
    expect(isModelId('claude-sonnet-5')).toBe(true)
    expect(isModelId('sonnet')).toBe(false)
    expect(isModelAlias('sonnet')).toBe(true)
  })

  /** Control NEGATIVO del registro: el alias tiene que poder ser rehusado. */
  test('el registro rehúsa una definición con alias y nombra a qué resolvería', () => {
    const conAlias = {
      name: 'con-alias', description: 'x', prompt: 'y', model: 'sonnet',
    } as unknown as AgentDefinition
    const built = buildRegistry([conAlias])
    expect(built.ok).toBe(false)
    if (!built.ok) {
      expect(built.errors[0]).toContain(MODEL_MUST_BE_A_CATALOG_ID)
      expect(built.errors[0]).toContain('claude-sonnet-5')
    }
  })

  test('el registro acepta el identificador completo y el literal inherit', () => {
    const ok = buildRegistry([
      { name: 'a', description: 'x', prompt: 'y', model: 'claude-sonnet-5' },
      { name: 'b', description: 'x', prompt: 'y', model: 'inherit' },
    ])
    expect(ok.ok).toBe(true)
  })
})

describe('coste', () => {
  // La mezcla medida en el store para claude-fable-5 (n=24, effort high):
  // 383 242 cache_read, 9 765 cache_creation y 81 output por turno.
  const porTurno = { cache_read_tokens: 383242, cache_creation_tokens: 9765, output_tokens: 81 }

  test('reproduce la aritmética del tier con TTL 1h', () => {
    // fable-5-1: 383242*0.25 + 9765*20 + 81*50 = 95810.5 + 195300 + 4050 = 295160.5 / 1e6
    expect(usageCostUsd('claude-fable-5-1', porTurno, '1h')).toBeCloseTo(0.2952, 4)
    // fable-5: cache_read a 1.0 → 383242 + 195300 + 4050 = 582592 / 1e6
    expect(usageCostUsd('claude-fable-5', porTurno, '1h')).toBeCloseTo(0.5826, 4)
  })

  test('con la misma mezcla, Fable 5.1 cuesta menos de la mitad que Fable 5', () => {
    const v51 = usageCostUsd('claude-fable-5-1', porTurno)
    const v5 = usageCostUsd('claude-fable-5', porTurno)
    expect(v51 / v5).toBeLessThan(0.55)
  })

  test('rehúsa un modelo fuera del catálogo en vez de devolver 0', () => {
    // Los 19 registros del 2.1.258 traen tier (medido: 0 sin tier), así que
    // el único camino a "sin precio" es un identificador que no existe.
    expect(() => usageCostUsd('claude-no-existe', porTurno)).toThrow()
  })

  test('effortCostIndex devuelve null donde el registro no lo declara', () => {
    expect(effortCostIndex('claude-fable-5-1', 'max')).toBe(1.91)
    expect(effortCostIndex('claude-haiku-4-5', 'max')).toBeNull()
  })
})
