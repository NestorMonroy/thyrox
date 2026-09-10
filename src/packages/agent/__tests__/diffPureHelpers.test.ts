/**
 * Porte de `ccnmt: packages/agent/__tests__/diffPureHelpers.test.ts`.
 * Sólo la parte pura de `diff.ts` — el desplazamiento de números de línea
 * de un hunk cuando el diff se calculó sobre una rebanada del archivo, no
 * sobre el archivo entero.
 */
import { describe, expect, test } from 'bun:test'
import {
  adjustHunkLineNumbers,
  CONTEXT_LINES,
  DIFF_TIMEOUT_MS,
} from '../diff.ts'

describe('CONTEXT_LINES + DIFF_TIMEOUT_MS — constantes operativas', () => {
  test('CONTEXT_LINES = 3 (contexto estándar de un diff unificado)', () => {
    expect(CONTEXT_LINES).toBe(3)
  })

  test('DIFF_TIMEOUT_MS = 5000 (5 segundos, tope ante entrada patológica)', () => {
    expect(DIFF_TIMEOUT_MS).toBe(5_000)
  })
})

describe('adjustHunkLineNumbers — desplazamiento de rebanada a archivo entero', () => {
  function hunk(oldStart: number, newStart: number): {
    oldStart: number
    oldLines: number
    newStart: number
    newLines: number
    lines: string[]
  } {
    return {
      oldStart,
      oldLines: 1,
      newStart,
      newLines: 1,
      lines: ['-old', '+new'],
    }
  }

  test('offset 0 → devuelve la MISMA referencia (camino rápido)', () => {
    // CRÍTICO: con offset 0 la función DEBE devolver el mismo arreglo (sin
    // asignar). Es la optimización del caso común (diff de archivo entero,
    // no de una rebanada).
    const h = [hunk(1, 1), hunk(10, 10)]
    expect(adjustHunkLineNumbers(h, 0)).toBe(h)
  })

  test('offset positivo desplaza oldStart y newStart', () => {
    const adjusted = adjustHunkLineNumbers([hunk(1, 1)], 100)
    expect(adjusted).toEqual([
      {
        oldStart: 101,
        oldLines: 1,
        newStart: 101,
        newLines: 1,
        lines: ['-old', '+new'],
      },
    ])
  })

  test('offset negativo desplaza hacia abajo (p. ej. ctx.lineOffset - 1 con offset=0)', () => {
    // El doc dice que quien llama pasa `ctx.lineOffset - 1`. Con
    // lineOffset=1 (sin rebanada), eso es offset=0 → sin desplazamiento.
    // Con lineOffset=10, el desplazamiento es +9. Un offset negativo
    // también debe funcionar (raro pero documentado).
    const adjusted = adjustHunkLineNumbers([hunk(105, 105)], -100)
    expect(adjusted[0]).toMatchObject({ oldStart: 5, newStart: 5 })
  })

  test('arreglo multi-hunk — cada uno desplazado independientemente', () => {
    const adjusted = adjustHunkLineNumbers(
      [hunk(1, 1), hunk(10, 12), hunk(20, 25)],
      50,
    )
    expect(adjusted.map(h => [h.oldStart, h.newStart])).toEqual([
      [51, 51],
      [60, 62],
      [70, 75],
    ])
  })

  test('arreglo vacío → arreglo vacío (no-op seguro)', () => {
    expect(adjustHunkLineNumbers([], 100)).toEqual([])
  })

  test('preserva los campos que no son número de línea (oldLines, newLines, lines)', () => {
    const original = {
      oldStart: 5,
      oldLines: 3,
      newStart: 5,
      newLines: 4,
      lines: [' context', '-removed', '+added1', '+added2'],
    }
    const [adjusted] = adjustHunkLineNumbers([original], 10)
    expect(adjusted!.oldLines).toBe(3)
    expect(adjusted!.newLines).toBe(4)
    expect(adjusted!.lines).toEqual(original.lines)
  })

  test('devuelve un arreglo NUEVO (no muta la entrada) cuando offset != 0', () => {
    const input = [hunk(1, 1)]
    const result = adjustHunkLineNumbers(input, 5)
    expect(result).not.toBe(input)
    expect(input[0]!.oldStart).toBe(1) // la entrada queda intacta
  })

  test('offsets grandes (1M+) funcionan sin overflow', () => {
    const adjusted = adjustHunkLineNumbers([hunk(1, 1)], 1_000_000)
    expect(adjusted[0]!.oldStart).toBe(1_000_001)
  })
})
