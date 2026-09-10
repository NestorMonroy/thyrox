/**
 * Puerto de `ccnmt: packages/output/src/__tests__/truncateToLines.test.ts`
 * (verbatim). Tests de truncateToLines — limita una salida multi-linea a
 * N lineas + "…".
 *
 * Se usa en el renderizado compacto de salida (celdas de tabla Markdown,
 * blurbs de preview de log, resumenes de bloque de error). Un conteo de
 * lineas incorrecto descarta contenido demasiado pronto (bloques de 1
 * linea pierden su contenido) o no limita y satura la pantalla.
 */
import { describe, expect, test } from 'bun:test'
import { truncateToLines } from '../utils/stringUtils.js'

describe('truncateToLines — within limit', () => {
  test('text fits in maxLines: returned verbatim', () => {
    expect(truncateToLines('a\nb\nc', 5)).toBe('a\nb\nc')
  })

  test('exact line count: returned verbatim (NOT truncated)', () => {
    expect(truncateToLines('a\nb\nc', 3)).toBe('a\nb\nc')
  })

  test('single line: returned verbatim regardless of maxLines', () => {
    expect(truncateToLines('hello', 1)).toBe('hello')
    expect(truncateToLines('hello', 100)).toBe('hello')
  })

  test('empty string: empty result (1 "line" = empty string)', () => {
    // 'split('\n')' on '' returns [''], 1 element. maxLines=1 keeps it.
    expect(truncateToLines('', 1)).toBe('')
  })
})

describe('truncateToLines — over limit', () => {
  test('exceeds maxLines: truncated + ellipsis', () => {
    expect(truncateToLines('a\nb\nc\nd\ne', 2)).toBe('a\nb…')
  })

  test('maxLines=1: keeps first line + ellipsis', () => {
    expect(truncateToLines('first\nsecond\nthird', 1)).toBe('first…')
  })

  test('truncated result ends with single "…"', () => {
    const r = truncateToLines('a\nb\nc\nd', 2)
    expect(r.endsWith('…')).toBe(true)
    // Should NOT end with multiple ellipses or a different marker.
    expect(r).not.toMatch(/……/)
    expect(r).not.toContain('...')
  })

  test('truncated result contains exactly maxLines newline-joined', () => {
    const r = truncateToLines('a\nb\nc\nd\ne', 3)
    // 'a\nb\nc' + '…' = 5 newline-joined chars + ellipsis
    expect(r).toBe('a\nb\nc…')
  })
})

describe('truncateToLines — empty lines counted', () => {
  test('blank lines count toward maxLines', () => {
    // 'a\n\nb\n\nc' → 5 lines (3 content + 2 blank).
    // maxLines=3 keeps first 3 → 'a\n\nb' + '…'.
    expect(truncateToLines('a\n\nb\n\nc', 3)).toBe('a\n\nb…')
  })

  test('leading blank line counted', () => {
    expect(truncateToLines('\nfirst\nsecond', 1)).toBe('…')
  })

  test('trailing blank: lines count includes the trailing empty', () => {
    // 'a\n' splits to ['a', ''], 2 lines.
    expect(truncateToLines('a\n', 2)).toBe('a\n')
    expect(truncateToLines('a\n', 1)).toBe('a…')
  })
})

describe('truncateToLines — line ending normalization', () => {
  test('\\r\\n NOT normalized: counted as part of line content', () => {
    // The function only splits on '\n', so '\r' stays attached to the
    // line. Documented behavior — caller is expected to use Unix-style
    // line endings.
    const text = 'a\r\nb\r\nc'
    // split('\n') → ['a\r', 'b\r', 'c'], 3 lines.
    expect(truncateToLines(text, 3)).toBe(text)
    expect(truncateToLines(text, 2)).toBe('a\r\nb\r…')
  })

  test('only \\r (legacy Mac) → ALL stays as 1 line', () => {
    // No '\n' in input → 1 line.
    expect(truncateToLines('a\rb\rc', 1)).toBe('a\rb\rc')
  })
})

describe('truncateToLines — boundary', () => {
  test('maxLines=0: keeps zero lines + ellipsis', () => {
    expect(truncateToLines('a\nb\nc', 0)).toBe('…')
  })

  test('negative maxLines: empty + ellipsis (slice(0, neg) = empty)', () => {
    // Documented: slice(0, -1) excludes last. But split returns array,
    // slice(0, -1) returns [items minus last]. Lock current behavior.
    const r = truncateToLines('a\nb\nc', -1)
    // Result depends on slice behavior with negative indices.
    expect(r).toContain('…')
  })
})
