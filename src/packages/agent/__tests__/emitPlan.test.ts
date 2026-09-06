import { describe, expect, test } from 'bun:test'
import { diffSummary, parseArgs } from '../emit/plan.ts'

describe('parseArgs', () => {
  /**
   * Control POSITIVO REAL: la bandera que el gate consume hoy.
   */
  test('reconoce --check', () => {
    expect(parseArgs(['--check'])).toEqual({ check: true })
  })

  test('sin banderas escribe', () => {
    expect(parseArgs([])).toEqual({ check: false })
  })

  /**
   * Control NEGATIVO, y es el defecto que costó contenido: `--stdout` no
   * existe, el emisor lo ignoraba en silencio y caía a la rama que ESCRIBE.
   * Un argumento que no se entiende rehúsa; no elige la rama destructiva.
   */
  test('rehúsa una bandera desconocida en vez de escribir', () => {
    const r = parseArgs(['--stdout'])
    expect(r).toHaveProperty('error')
    expect((r as { error: string }).error).toContain('--stdout')
  })

  test('rehúsa un argumento suelto', () => {
    expect(parseArgs(['thyrox-coordinator'])).toHaveProperty('error')
  })
})

describe('diffSummary', () => {
  /**
   * `DIFIERE <nombre> — <ruta>` no dice QUÉ difiere: para verlo hay que
   * re-emitir a mano, que es cómo se llegó al `--stdout` inexistente.
   */
  test('publica cuántas líneas sobran y cuántas faltan', () => {
    const s = diffSummary('a\nb\nc\n', 'a\nb\nc\nd\ne\n')
    expect(s).toContain('+2')
    expect(s).toContain('-0')
  })

  test('muestra la primera línea que difiere, con su número', () => {
    expect(diffSummary('a\nb\nc\n', 'a\nX\nc\n')).toContain('2')
  })

  test('no publica nada cuando son idénticos', () => {
    expect(diffSummary('a\nb\n', 'a\nb\n')).toBe('')
  })

  test('acota la muestra para no volcar el archivo entero', () => {
    const a = Array.from({ length: 500 }, (_, i) => `l${i}`).join('\n')
    const b = Array.from({ length: 500 }, (_, i) => `x${i}`).join('\n')
    expect(diffSummary(a, b).split('\n').length).toBeLessThan(15)
  })
})
