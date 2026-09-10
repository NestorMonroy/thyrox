/**
 * Porte de `ccnmt: packages/agent/__tests__/parseTokenBudget.test.ts`.
 * Los casos, sus datos y sus aserciones vienen de la fuente; lo que cambia es
 * el idioma de la descripción.
 */
import { describe, expect, test } from 'bun:test'
import {
  findTokenBudgetPositions,
  getBudgetContinuationMessage,
  parseTokenBudget,
} from '../tokenBudget.ts'

describe('parseTokenBudget — taquigrafía al inicio', () => {
  test('+500k al inicio de la línea', () => {
    expect(parseTokenBudget('+500k do the thing')).toBe(500_000)
  })
  test('+1.5m al inicio de la línea', () => {
    expect(parseTokenBudget('+1.5m research')).toBe(1_500_000)
  })
  test('+2b al inicio de la línea', () => {
    expect(parseTokenBudget('+2b calculate')).toBe(2_000_000_000)
  })
  test('sufijo insensible a mayúsculas', () => {
    expect(parseTokenBudget('+500K xyz')).toBe(500_000)
    expect(parseTokenBudget('+1M abc')).toBe(1_000_000)
  })
  test('espacio en blanco inicial permitido', () => {
    expect(parseTokenBudget('   +500k thing')).toBe(500_000)
  })
})

describe('parseTokenBudget — taquigrafía al final', () => {
  test('+500k al final (precedido de espacio)', () => {
    expect(parseTokenBudget('do the thing +500k')).toBe(500_000)
  })
  test('con puntuación final', () => {
    expect(parseTokenBudget('do the thing +500k.')).toBe(500_000)
    expect(parseTokenBudget('do the thing +500k!')).toBe(500_000)
    expect(parseTokenBudget('do the thing +500k?')).toBe(500_000)
  })
})

describe('parseTokenBudget — forma verbosa', () => {
  test('use 500k tokens', () => {
    expect(parseTokenBudget('please use 500k tokens')).toBe(500_000)
  })
  test('spend 2m tokens', () => {
    expect(parseTokenBudget('spend 2m tokens on this')).toBe(2_000_000)
  })
  test('"token" en singular', () => {
    expect(parseTokenBudget('use 1k token')).toBe(1_000)
  })
  test('verbo insensible a mayúsculas', () => {
    expect(parseTokenBudget('USE 500k tokens')).toBe(500_000)
  })
  test('matchea en medio de la oración', () => {
    expect(parseTokenBudget('hi please spend 1m tokens here')).toBe(1_000_000)
  })
})

describe('parseTokenBudget — no-matches', () => {
  test('devuelve null para texto vacío', () => {
    expect(parseTokenBudget('')).toBeNull()
  })
  test('devuelve null para prosa llana', () => {
    expect(parseTokenBudget('do something simple')).toBeNull()
  })
  test('NO matchea la taquigrafía sin el prefijo +', () => {
    expect(parseTokenBudget('500k tokens or so')).toBeNull()
  })
  test('NO matchea un verbo desconocido (p. ej. "burn N tokens")', () => {
    expect(parseTokenBudget('burn 500k tokens')).toBeNull()
  })
})

describe('findTokenBudgetPositions', () => {
  test('devuelve vacío para un no-match', () => {
    expect(findTokenBudgetPositions('hi there')).toEqual([])
  })
  test('devuelve la posición de +500k al inicio', () => {
    const positions = findTokenBudgetPositions('+500k do thing')
    expect(positions.length).toBe(1)
    expect(positions[0]!.start).toBe(0)
  })
  test('devuelve la posición de +500k al final', () => {
    const positions = findTokenBudgetPositions('do thing +500k')
    expect(positions.length).toBe(1)
    expect(positions[0]!.start).toBeGreaterThan(0)
  })
  test('NO cuenta doble cuando el texto es solo "+500k"', () => {
    const positions = findTokenBudgetPositions('+500k')
    expect(positions.length).toBe(1)
  })
  // Este caso NO viene de la fuente: sin espacio inicial, SHORTHAND_END_RE
  // nunca matchea "+500k" (exige un \s antes del +), así que el caso de
  // arriba no ejercita el guard `alreadyCovered` — pasa igual con o sin él.
  // Con espacio inicial, las DOS formas matchean el mismo "+500k" y sólo el
  // guard evita que se cuente dos veces.
  test('NO cuenta doble cuando el inicio y el final matchean el mismo tramo', () => {
    const positions = findTokenBudgetPositions('  +500k')
    expect(positions.length).toBe(1)
  })
  test('devuelve varias posiciones para ocurrencias del patrón verboso', () => {
    const positions = findTokenBudgetPositions(
      'first use 1k tokens then spend 2k tokens',
    )
    expect(positions.length).toBe(2)
  })
})

describe('getBudgetContinuationMessage', () => {
  test('formatea con separadores de millar sensibles al locale', () => {
    const msg = getBudgetContinuationMessage(50, 250_000, 500_000)
    expect(msg).toContain('50%')
    expect(msg).toContain('250,000')
    expect(msg).toContain('500,000')
    expect(msg).toContain('Keep working')
  })
  test('NO instruye a resumir', () => {
    const msg = getBudgetContinuationMessage(80, 800_000, 1_000_000)
    expect(msg).toContain('do not summarize')
  })
  test('maneja valores pequeños', () => {
    const msg = getBudgetContinuationMessage(10, 100, 1000)
    expect(msg).toContain('10%')
    expect(msg).toContain('100')
    expect(msg).toContain('1,000')
  })
})
