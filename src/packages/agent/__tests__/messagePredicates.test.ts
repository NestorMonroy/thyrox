/**
 * Porte de `ccnmt: packages/agent/__tests__/messagePredicates.test.ts`.
 */
import { describe, expect, test } from 'bun:test'
import { isHumanTurn } from '../messagePredicates.js'

type Msg = Parameters<typeof isHumanTurn>[0]

describe('isHumanTurn', () => {
  // Contrato critico: los mensajes tool_result comparten `type: 'user'` con
  // los turnos humanos. El discriminante es la ausencia de `toolUseResult` Y
  // no estar marcado `isMeta`. Si un refactor futuro invierte esta logica
  // (p. ej. usa `toolUseResult !== null` en vez de `=== undefined`), los
  // mensajes tool_result se contarian como prompts de usuario en atribucion
  // / token-budget / rutas de replay del transcript.

  test('returns true for plain user message', () => {
    expect(
      isHumanTurn({ type: 'user', message: { content: 'hi' } } as Msg),
    ).toBe(true)
  })

  test('returns false for assistant message', () => {
    expect(isHumanTurn({ type: 'assistant' } as never)).toBe(false)
  })

  test('returns false for system message', () => {
    expect(isHumanTurn({ type: 'system' } as never)).toBe(false)
  })

  test('returns false when toolUseResult is set (tool result message)', () => {
    expect(
      isHumanTurn({
        type: 'user',
        toolUseResult: { stdout: 'output' },
        message: { content: 'r' },
      } as Msg),
    ).toBe(false)
  })

  test('returns false when toolUseResult is null', () => {
    // `=== undefined` excluye null. Atrapa la forma de bug silencioso donde
    // un refactor usa `!toolUseResult` (que trataria null como turno humano
    // porque `!null === true`).
    expect(
      isHumanTurn({
        type: 'user',
        toolUseResult: null,
        message: { content: 'r' },
      } as never),
    ).toBe(false)
  })

  test('returns false when toolUseResult is empty object {}', () => {
    // {} es un valor valido de toolUseResult (p. ej. una herramienta que
    // devuelve void). NO debe tratarse como ausente.
    expect(
      isHumanTurn({
        type: 'user',
        toolUseResult: {},
        message: { content: 'r' },
      } as Msg),
    ).toBe(false)
  })

  test('returns false when isMeta is true', () => {
    expect(
      isHumanTurn({
        type: 'user',
        isMeta: true,
        message: { content: 'meta' },
      } as Msg),
    ).toBe(false)
  })

  test('returns true when isMeta is undefined (typical case)', () => {
    expect(isHumanTurn({ type: 'user', message: { content: 'hi' } } as Msg)).toBe(
      true,
    )
  })

  test('returns true when isMeta is false (explicit false)', () => {
    expect(
      isHumanTurn({
        type: 'user',
        isMeta: false,
        message: { content: 'hi' },
      } as Msg),
    ).toBe(true)
  })

  test('type narrowing — returned-true narrows to UserMessage', () => {
    const m: Msg = { type: 'user', message: { content: 'hi' } } as Msg
    if (isHumanTurn(m)) {
      // After type guard, m is UserMessage. Compile-time check.
      const x: { type: 'user' } = m
      expect(x.type).toBe('user')
    }
  })
})
