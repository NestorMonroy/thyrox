import { describe, expect, test } from 'bun:test'
import { getRuleBehaviorDescription } from '../PermissionResult.js'

describe('getRuleBehaviorDescription', () => {
  // Copia de `ccnmt: packages/permission/src/__tests__/
  // getRuleBehaviorDescription.test.ts` con los comentarios traducidos; el
  // cuerpo es el de la fuente.
  //
  // Se usa en los diálogos de permiso que ve el usuario y en los mensajes del
  // registro de eventos. Es crítico que el verbo en pasado case con la
  // conducta: una redaccion equivocada — "allowed" para una denegación — le
  // reporta al usuario un estado de seguridad falso, y en silencio.

  test('"allow" → "allowed"', () => {
    expect(getRuleBehaviorDescription('allow')).toBe('allowed')
  })

  test('"deny" → "denied"', () => {
    expect(getRuleBehaviorDescription('deny')).toBe('denied')
  })

  test('"ask" → "asked for confirmation for"', () => {
    expect(getRuleBehaviorDescription('ask')).toBe('asked for confirmation for')
  })

  test('any other value (default branch) → "asked for confirmation for"', () => {
    // El default es la redaccion de "ask", que es fail-safe: si se añade un
    // tipo de conducta nuevo sin actualizar esta función, cae en "ask" y no en
    // "allow".
    expect(
      getRuleBehaviorDescription('passthrough' as never),
    ).toBe('asked for confirmation for')
    expect(
      getRuleBehaviorDescription('something_else' as never),
    ).toBe('asked for confirmation for')
  })

  test('returns lowercase always (no toLowerCase needed by callers)', () => {
    expect(getRuleBehaviorDescription('allow')).toBe(
      'allowed'.toLowerCase(),
    )
    expect(getRuleBehaviorDescription('deny')).toBe('denied'.toLowerCase())
  })
})
