/**
 * El tope de turnos se declara o no existe: sin `--max-turns` ni
 * `THYROX_CODE_MAX_TURNS`, el bucle corre hasta que el modelo termina, igual
 * que `claude -p` (2.1.139 0130.js:30, Zo8). El límite real de un ítem del
 * pool es su `--timeout`, no un conteo de turnos.
 */
import { describe, expect, test } from 'bun:test'
import { resolveMaxTurnsFromEnv } from '../src/entry/maxTurnsEnv.ts'
import { parsePrintArgs } from '../src/entry/print.ts'
import { loopMaxTurns } from '../src/entry/runLoop.ts'

describe('resolveMaxTurnsFromEnv', () => {
  test('sin bandera ni variable no hay tope', () => {
    expect(resolveMaxTurnsFromEnv(undefined, {})).toBeUndefined()
  })
  test('la variable fija el tope cuando falta la bandera', () => {
    expect(resolveMaxTurnsFromEnv(undefined, { THYROX_CODE_MAX_TURNS: '7' })).toBe(7)
  })
  test('la bandera gana a la variable', () => {
    expect(resolveMaxTurnsFromEnv(3, { THYROX_CODE_MAX_TURNS: '7' })).toBe(3)
  })
  test('una variable inválida se rechaza en vez de quedar sin tope', () => {
    expect(() => resolveMaxTurnsFromEnv(undefined, { THYROX_CODE_MAX_TURNS: '0' })).toThrow('THYROX_CODE_MAX_TURNS')
    expect(() => resolveMaxTurnsFromEnv(undefined, { THYROX_CODE_MAX_TURNS: 'x' })).toThrow('THYROX_CODE_MAX_TURNS')
  })
})

describe('thyrox -p sin --max-turns', () => {
  test('no pone tope y no pasa --max-turns al bucle', () => {
    const a = parsePrintArgs(['-p', 'x'], null, {})
    expect(a.maxTurns).toBeUndefined()
    expect(a.loopArgv).not.toContain('--max-turns')
  })
  test('THYROX_CODE_MAX_TURNS llega al bucle como --max-turns', () => {
    const a = parsePrintArgs(['-p', 'x'], null, { THYROX_CODE_MAX_TURNS: '9' })
    expect(a.maxTurns).toBe(9)
    expect(a.loopArgv[a.loopArgv.indexOf('--max-turns') + 1]).toBe('9')
  })
  test('--max-turns explícito se conserva', () => {
    expect(parsePrintArgs(['-p', 'x', '--max-turns', '4'], null, {}).maxTurns).toBe(4)
  })
  test('--max-turns inválido se rechaza', () => {
    expect(() => parsePrintArgs(['-p', 'x', '--max-turns', '0'], null, {})).toThrow('--max-turns')
  })
})

describe('el bucle sin --max-turns', () => {
  test('corre sin tope', () => {
    expect(loopMaxTurns(['--prompt', 'x'], {})).toBe(Infinity)
  })
  test('con --max-turns respeta el valor', () => {
    expect(loopMaxTurns(['--prompt', 'x', '--max-turns', '5'], {})).toBe(5)
  })
  test('con la variable respeta el valor', () => {
    expect(loopMaxTurns(['--prompt', 'x'], { THYROX_CODE_MAX_TURNS: '6' })).toBe(6)
  })
})
