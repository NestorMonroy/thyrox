import { describe, expect, test } from 'bun:test'
import { measuredOnly } from '../internal/logging.ts'

// Un campo opcional sin medir no viaja como 0: se omite del evento.
describe('measuredOnly', () => {
  test('omite las claves undefined y conserva los ceros medidos', () => {
    // `toEqual` ignora las claves con valor `undefined`: se mide la presencia.
    const sent = measuredOnly({ pre: undefined, post: 0, name: 'x', ok: false })
    expect(Object.keys(sent).sort()).toEqual(['name', 'ok', 'post'])
    expect(sent.post).toBe(0)
  })
})
