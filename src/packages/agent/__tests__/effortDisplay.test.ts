/**
 * Las funciones de presentacion de esfuerzo, contra el binario 2.1.275
 * (`chunk-87qahtf8.js`): `ne` (descripcion por nivel), `nQn` (descripcion de
 * un valor), `I_` (¿el modelo admite esfuerzo?), `C` (esfuerzo por defecto
 * del modelo), `TT` (nivel mostrado) y `Uyt` (sufijo « with X effort»).
 *
 * Cada guarda lleva su caso negativo: un modelo que el catalogo NO marca con
 * `effort` tiene que dar `false`, o un `return true` pasaria la suite.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import {
  getDefaultEffortForModel,
  getDisplayedEffortLevel,
  getEffortLevelDescription,
  getEffortSuffix,
  getEffortValueDescription,
  modelSupportsEffort,
  resolveModelEffort,
} from '../effort.ts'

const ENV = ['CLAUDE_CODE_EFFORT_LEVEL', 'CLAUDE_CODE_ALWAYS_ENABLE_EFFORT', 'CLAUDE_CODE_USE_BEDROCK',
  'CLAUDE_CODE_USE_VERTEX', 'CLAUDE_CODE_USE_FOUNDRY', 'ANTHROPIC_BASE_URL'] as const
const saved = Object.fromEntries(ENV.map((k) => [k, process.env[k]]))
afterEach(() => {
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})

describe('getEffortLevelDescription — el texto de `ne`', () => {
  test('los cinco niveles', () => {
    expect(getEffortLevelDescription('low')).toBe('Quick, straightforward implementation with minimal overhead')
    expect(getEffortLevelDescription('medium')).toBe('Balanced approach with standard implementation and testing')
    expect(getEffortLevelDescription('high')).toBe('Comprehensive implementation with extensive testing and documentation')
    expect(getEffortLevelDescription('xhigh')).toBe('Deeper reasoning than high, just below maximum (Fable 5, Opus 4.7+, Sonnet 5)')
    expect(getEffortLevelDescription('max')).toBe(
      'Maximum capability with deepest reasoning. May use excessive tokens resulting in long response times or overthinking. Use sparingly for the hardest tasks.')
  })
})

describe('getEffortValueDescription — `nQn`', () => {
  test('un nivel devuelve su descripcion', () => {
    expect(getEffortValueDescription('low')).toBe(getEffortLevelDescription('low'))
  })
  test('un valor numerico devuelve la descripcion fija', () => {
    expect(getEffortValueDescription(42)).toBe('Balanced approach with standard implementation and testing')
  })
})

describe('modelSupportsEffort — `I_`', () => {
  test('el catalogo decide: sonnet-5 y opus-4-8 si', () => {
    expect(modelSupportsEffort('claude-sonnet-5')).toBe(true)
    expect(modelSupportsEffort('claude-opus-4-8')).toBe(true)
  })
  test('fuera de firstParty solo el catalogo decide: sin el, un modelo sin marca dice que no', () => {
    // Bajo firstParty el proveedor confia en todo lo no excluido, asi que los
    // casos de arriba no distinguen el catalogo del respaldo. Bajo Bedrock el
    // respaldo se apaga y queda el catalogo solo.
    process.env.CLAUDE_CODE_USE_BEDROCK = '1'
    expect(modelSupportsEffort('claude-sonnet-5')).toBe(true)
    expect(modelSupportsEffort('modelo-desconocido')).toBe(false)
  })
  test('las familias que el binario excluye, no', () => {
    for (const m of ['claude-3-7-sonnet', 'claude-opus-4-0', 'claude-opus-4-1', 'claude-sonnet-4-0',
      'claude-sonnet-4-5', 'claude-haiku-4-5']) expect(modelSupportsEffort(m)).toBe(false)
  })
  test('CLAUDE_CODE_ALWAYS_ENABLE_EFFORT habilita lo que no esta excluido', () => {
    process.env.CLAUDE_CODE_USE_BEDROCK = '1'
    expect(modelSupportsEffort('modelo-desconocido')).toBe(false)
    process.env.CLAUDE_CODE_ALWAYS_ENABLE_EFFORT = '1'
    expect(modelSupportsEffort('modelo-desconocido')).toBe(true)
    expect(modelSupportsEffort('claude-haiku-4-5')).toBe(false)
  })
  test('claude-mythos-5 por nombre, aunque el catalogo no lo marque', () => {
    expect(modelSupportsEffort('claude-mythos-5')).toBe(true)
  })
})

describe('getDefaultEffortForModel — `C`', () => {
  test('el default_effort del catalogo', () => {
    expect(getDefaultEffortForModel('claude-opus-4-7')).toBe('xhigh')
    expect(getDefaultEffortForModel('claude-sonnet-5')).toBe('high')
  })
  test('sin default declarado, high', () => {
    expect(getDefaultEffortForModel('claude-opus-4-6')).toBe('high')
  })
})

describe('getDisplayedEffortLevel y getEffortSuffix — `TT` y `Uyt`', () => {
  test('sin valor de sesion, se muestra el default del modelo', () => {
    expect(getDisplayedEffortLevel('claude-opus-4-7', undefined)).toBe('xhigh')
  })
  test('el valor de sesion gana sobre el default', () => {
    expect(getDisplayedEffortLevel('claude-opus-4-7', 'low')).toBe('low')
  })
  test('un modelo sin esfuerzo se muestra high', () => {
    expect(getDisplayedEffortLevel('claude-haiku-4-5', 'low')).toBe('high')
  })
  test('xhigh en un modelo que no lo admite baja a high', () => {
    expect(getDisplayedEffortLevel('claude-sonnet-4-6', 'xhigh')).toBe('high')
    expect(getDisplayedEffortLevel('claude-sonnet-5', 'xhigh')).toBe('xhigh')
  })
  test('el sufijo: vacio sin valor, nombrado con valor', () => {
    expect(getEffortSuffix('claude-opus-4-8', undefined)).toBe('')
    expect(getEffortSuffix('claude-opus-4-8', 'medium')).toBe(' with medium effort')
    expect(getEffortSuffix('claude-haiku-4-5', 'medium')).toBe('')
  })
  test('el valor de un hook gana sobre la sesion y sobre CLAUDE_CODE_EFFORT_LEVEL', () => {
    process.env.CLAUDE_CODE_EFFORT_LEVEL = 'high'
    expect(resolveModelEffort('claude-opus-4-8', 'low', { hookEffortValue: 'medium' })).toBe('medium')
  })
  test('CLAUDE_CODE_EFFORT_LEVEL gana sobre la sesion', () => {
    process.env.CLAUDE_CODE_EFFORT_LEVEL = 'low'
    expect(getDisplayedEffortLevel('claude-opus-4-8', 'high')).toBe('low')
  })
})
