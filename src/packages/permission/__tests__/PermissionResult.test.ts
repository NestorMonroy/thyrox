/**
 * Tests del porte fiel de `PermissionResult.ts`.
 */
import { describe, expect, test } from 'bun:test'
import { getRuleBehaviorDescription } from '../src/PermissionResult.ts'

describe('getRuleBehaviorDescription', () => {
  test('allow -> "allowed"', () => {
    expect(getRuleBehaviorDescription('allow')).toBe('allowed')
  })

  test('deny -> "denied"', () => {
    expect(getRuleBehaviorDescription('deny')).toBe('denied')
  })

  test('ask y passthrough caen ambos al default branch', () => {
    // `PermissionResult['behavior']` incluye 'passthrough' además de las
    // tres de `PermissionDecision` — el `switch` de la fuente sólo
    // distingue 'allow'/'deny' y manda todo lo demás al mismo mensaje.
    expect(getRuleBehaviorDescription('ask')).toBe('asked for confirmation for')
    expect(getRuleBehaviorDescription('passthrough')).toBe(
      'asked for confirmation for',
    )
  })
})
