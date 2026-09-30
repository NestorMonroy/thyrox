/**
 * El cuerpo de un JWT sin verificar su firma: sólo un token de tres partes
 * cuyo cuerpo sea un objeto.
 */
import { describe, expect, test } from 'bun:test'

import { decodeJwtPayload } from '../../src/accounts/jwtPayload.ts'

const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')

describe('jwt payload', () => {
  test('a three-part token with an object body is decoded', () => {
    expect(decodeJwtPayload(`h.${part({ sub: 's' })}.sig`)).toEqual({ sub: 's' })
  })

  test('anything else is null: another shape, a non-object body, garbage or not a string', () => {
    expect(decodeJwtPayload(`h.${part({ sub: 's' })}.sig.extra`)).toBeNull()
    expect(decodeJwtPayload(`h.${part([1, 2])}.sig`)).toBeNull()
    expect(decodeJwtPayload(`h.${part('text')}.sig`)).toBeNull()
    expect(decodeJwtPayload('h.%%%.sig')).toBeNull()
    expect(decodeJwtPayload(42)).toBeNull()
  })
})
