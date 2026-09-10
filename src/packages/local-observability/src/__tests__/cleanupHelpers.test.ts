/**
 * Puerto de `ccnmt: packages/local-observability/src/__tests__/cleanupHelpers.test.ts`
 * (86 líneas fuente, 100 % portado).
 *
 * Pruebas para los helpers puros de cleanup — usados en el
 * envejecimiento de archivos de la caché de stats.
 *
 * `convertFileNameToDate` parsea el timestamp tipo-ISO del nombre de un
 * archivo generado por `new Date().toISOString().replace(/[:.]/g, '-')`
 * (la convención de nombres de los archivos de agregación de stats).
 *
 * Un parseo incorrecto = la detección de archivos viejos falla en
 * silencio (nunca se limpian → el disco se llena) o es agresiva
 * (se borran archivos actuales).
 */
import { describe, expect, test } from 'bun:test'
import {
  addCleanupResults,
  convertFileNameToDate,
} from '../aggregates/cleanup.js'

describe('addCleanupResults', () => {
  test('combines messages and errors', () => {
    expect(
      addCleanupResults({ messages: 5, errors: 1 }, { messages: 3, errors: 2 }),
    ).toEqual({ messages: 8, errors: 3 })
  })

  test('zeros: identity for the other operand', () => {
    expect(
      addCleanupResults(
        { messages: 0, errors: 0 },
        { messages: 5, errors: 5 },
      ),
    ).toEqual({ messages: 5, errors: 5 })
  })

  test('does not mutate inputs', () => {
    const a = { messages: 1, errors: 1 }
    const b = { messages: 2, errors: 2 }
    addCleanupResults(a, b)
    expect(a).toEqual({ messages: 1, errors: 1 })
    expect(b).toEqual({ messages: 2, errors: 2 })
  })
})

describe('convertFileNameToDate — ISO round-trip', () => {
  test('parses canonical filename format', () => {
    // Formato: 2026-04-30T14-30-45-123Z.jsonl → 2026-04-30T14:30:45.123Z
    const date = convertFileNameToDate('2026-04-30T14-30-45-123Z.jsonl')
    expect(date.toISOString()).toBe('2026-04-30T14:30:45.123Z')
  })

  test('strips extension correctly (.split on .)', () => {
    // Documentado: filename.split('.')[0] quita la extensión antes de parsear.
    const date = convertFileNameToDate('2026-01-01T00-00-00-000Z.json')
    expect(date.toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })

  test('multi-dot extension uses first-dot split', () => {
    // .split('.')[0] toma todo ANTES del primer punto. Así que
    // '2026-04-30T14-30-45-123Z.foo.jsonl' se vuelve
    // '2026-04-30T14-30-45-123Z'.
    const date = convertFileNameToDate(
      '2026-04-30T14-30-45-123Z.foo.jsonl',
    )
    expect(date.toISOString()).toBe('2026-04-30T14:30:45.123Z')
  })

  test('millisecond zero-padding preserved', () => {
    const date = convertFileNameToDate('2026-04-30T00-00-00-001Z.jsonl')
    expect(date.toISOString()).toBe('2026-04-30T00:00:00.001Z')
  })

  test('invalid format → Invalid Date', () => {
    // Sin match de T → el regex es no-op → ISO inválido → Invalid Date.
    const date = convertFileNameToDate('not-a-date.jsonl')
    expect(Number.isNaN(date.getTime())).toBe(true)
  })

  test('round-trip: ISO → filename → ISO', () => {
    // Simula el camino de creación de archivo: new Date().toISOString() →
    // reemplaza : y . por - → agrega extensión.
    const original = new Date('2026-04-30T14:30:45.789Z').toISOString()
    const filename = original.replace(/[:.]/g, '-') + 'Z.jsonl'
    // Ojo, el ISO ya termina en Z. Se rehace:
    const filename2 = original.replace(/:/g, '-').replace(/\./g, '-') + '.jsonl'
    const parsed = convertFileNameToDate(filename2)
    expect(parsed.toISOString()).toBe(original)
  })
})
