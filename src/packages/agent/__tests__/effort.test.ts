/**
 * Porte de `ccnmt: packages/agent/__tests__/effort.test.ts`.
 * Los casos, sus datos y sus aserciones vienen de la fuente; lo que cambia es
 * el idioma de la descripción.
 *
 * La fuente (`ccnmt: packages/agent/effort.ts`) importa media docena de
 * módulos de `@claude-code-how-works/*` (config, provider, headless-sdk) que
 * no existen en este árbol y que sólo alimentan funciones que ESTE test no
 * ejercita (`modelSupportsEffort`, `resolveAppliedEffort`,
 * `getDefaultEffortForModel`, `getEffortSuffix`, …). El porte se limita a los
 * seis símbolos que el test importa — todos autocontenidos en la fuente— y
 * declara ese recorte en la cabecera de `../effort.ts`, en vez de arrastrar
 * una dependencia inexistente para código que ningún caso mide.
 */
import { describe, expect, test } from 'bun:test'
import {
  EFFORT_LEVELS,
  convertEffortValueToLevel,
  isEffortLevel,
  isValidNumericEffort,
  parseEffortValue,
  toPersistableEffort,
} from '../effort.ts'

describe('EFFORT_LEVELS', () => {
  test('contiene el orden canónico de 6 niveles none → max', () => {
    expect([...EFFORT_LEVELS]).toEqual([
      'none',
      'low',
      'medium',
      'high',
      'xhigh',
      'max',
    ])
  })
})

describe('isEffortLevel', () => {
  test('los 6 niveles canónicos pasan', () => {
    for (const lvl of EFFORT_LEVELS) {
      expect(isEffortLevel(lvl)).toBe(true)
    }
  })
  test('rechaza cadenas desconocidas', () => {
    expect(isEffortLevel('foo')).toBe(false)
    expect(isEffortLevel('')).toBe(false)
    expect(isEffortLevel('LOW')).toBe(false) // sensible a mayúsculas
    expect(isEffortLevel('best')).toBe(false)
  })
})

describe('isValidNumericEffort', () => {
  test('acepta enteros', () => {
    expect(isValidNumericEffort(0)).toBe(true)
    expect(isValidNumericEffort(50)).toBe(true)
    expect(isValidNumericEffort(100)).toBe(true)
    expect(isValidNumericEffort(-5)).toBe(true) // contrato: cualquier entero
  })
  test('rechaza no-enteros', () => {
    expect(isValidNumericEffort(50.5)).toBe(false)
    expect(isValidNumericEffort(NaN)).toBe(false)
    expect(isValidNumericEffort(Infinity)).toBe(false)
  })
})

describe('parseEffortValue', () => {
  test('null/undefined/vacío → undefined', () => {
    expect(parseEffortValue(undefined)).toBeUndefined()
    expect(parseEffortValue(null)).toBeUndefined()
    expect(parseEffortValue('')).toBeUndefined()
  })
  test('las cadenas de nivel canónico pasan tal cual', () => {
    expect(parseEffortValue('none')).toBe('none')
    expect(parseEffortValue('low')).toBe('low')
    expect(parseEffortValue('medium')).toBe('medium')
    expect(parseEffortValue('high')).toBe('high')
    expect(parseEffortValue('xhigh')).toBe('xhigh')
    expect(parseEffortValue('max')).toBe('max')
  })
  test('mayúsculas se normalizan a minúsculas', () => {
    expect(parseEffortValue('LOW')).toBe('low')
    expect(parseEffortValue('MAX')).toBe('max')
  })
  test('números enteros pasan tal cual', () => {
    expect(parseEffortValue(50)).toBe(50)
    expect(parseEffortValue(0)).toBe(0)
    expect(parseEffortValue(100)).toBe(100)
  })
  test('cadenas numéricas parsean a entero', () => {
    expect(parseEffortValue('50')).toBe(50)
    expect(parseEffortValue('100')).toBe(100)
  })
  test('números no enteros caen a parseInt (trunca a entero)', () => {
    // No-entero falla isValidNumericEffort, luego String(50.5)→'50.5'→
    // parseInt('50.5', 10) = 50 → pasa el check de entero
    expect(parseEffortValue(50.5)).toBe(50)
  })
  test('basura se rechaza', () => {
    expect(parseEffortValue('foo')).toBeUndefined()
    expect(parseEffortValue({})).toBeUndefined()
    expect(parseEffortValue([])).toBeUndefined()
  })
})

describe('toPersistableEffort', () => {
  test('sólo los niveles-cadena son persistibles', () => {
    expect(toPersistableEffort('none')).toBe('none')
    expect(toPersistableEffort('low')).toBe('low')
    expect(toPersistableEffort('medium')).toBe('medium')
    expect(toPersistableEffort('high')).toBe('high')
    expect(toPersistableEffort('xhigh')).toBe('xhigh')
    expect(toPersistableEffort('max')).toBe('max')
  })
  test('los valores numéricos NO son persistibles (sólo default del modelo)', () => {
    expect(toPersistableEffort(50)).toBeUndefined()
    expect(toPersistableEffort(0)).toBeUndefined()
    expect(toPersistableEffort(100)).toBeUndefined()
  })
  test('undefined → undefined', () => {
    expect(toPersistableEffort(undefined)).toBeUndefined()
  })
})

describe('convertEffortValueToLevel — passthrough de cadena', () => {
  test('un nivel válido pasa tal cual', () => {
    expect(convertEffortValueToLevel('low')).toBe('low')
    expect(convertEffortValueToLevel('xhigh')).toBe('xhigh')
  })
  test('un nivel inválido cae a high', () => {
    expect(convertEffortValueToLevel('garbage' as never)).toBe('high')
  })
})

describe('convertEffortValueToLevel — numérico (sólo ant)', () => {
  test('sin USER_TYPE=ant, numérico → default high', () => {
    const original = process.env.USER_TYPE
    delete process.env.USER_TYPE
    try {
      expect(convertEffortValueToLevel(50)).toBe('high')
    } finally {
      if (original !== undefined) process.env.USER_TYPE = original
    }
  })
  test('con USER_TYPE=ant, numérico mapea a niveles', () => {
    const original = process.env.USER_TYPE
    process.env.USER_TYPE = 'ant'
    try {
      // 5 niveles: ≤50 low, ≤85 medium, ≤95 high, ≤100 xhigh, >100 max
      expect(convertEffortValueToLevel(0)).toBe('low')
      expect(convertEffortValueToLevel(50)).toBe('low')
      expect(convertEffortValueToLevel(51)).toBe('medium')
      expect(convertEffortValueToLevel(85)).toBe('medium')
      expect(convertEffortValueToLevel(86)).toBe('high')
      expect(convertEffortValueToLevel(95)).toBe('high')
      expect(convertEffortValueToLevel(96)).toBe('xhigh')
      expect(convertEffortValueToLevel(100)).toBe('xhigh')
      expect(convertEffortValueToLevel(101)).toBe('max')
      expect(convertEffortValueToLevel(150)).toBe('max')
    } finally {
      if (original !== undefined) process.env.USER_TYPE = original
      else delete process.env.USER_TYPE
    }
  })
})
