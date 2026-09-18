/**
 * Copia de `ccnmt: packages/permission/src/__tests__/parseToolListFromCLI.test.ts`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Tests de `parseToolListFromCLI` — el que parsea las banderas de CLI
 * `--allowed-tools` y `--disallowed-tools`. Parsear mal hace que el usuario
 * vea funcionar «Bash(ls)» y desarmarse «Bash(ls, -la)», o que una regla con
 * comas se parta donde no debe.
 *
 * El parser se ocupa de:
 *   - los separadores de espacio y coma que van FUERA de los paréntesis
 *   - las comas que van DENTRO son parte de la regla, no separadores
 *   - cada cadena de entrada se parsea de forma independiente
 *   - las cadenas vacías se descartan
 */
import { describe, expect, test } from 'bun:test'
import { parseToolListFromCLI } from '../permissionSetup.js'

describe('parseToolListFromCLI — basic separators', () => {
  test('empty array → empty list', () => {
    expect(parseToolListFromCLI([])).toEqual([])
  })

  test('single tool → single-element list', () => {
    expect(parseToolListFromCLI(['Bash'])).toEqual(['Bash'])
  })

  test('comma-separated tools', () => {
    expect(parseToolListFromCLI(['Bash,FileRead'])).toEqual([
      'Bash',
      'FileRead',
    ])
  })

  test('space-separated tools', () => {
    expect(parseToolListFromCLI(['Bash FileRead'])).toEqual([
      'Bash',
      'FileRead',
    ])
  })

  test('mixed comma + space', () => {
    expect(parseToolListFromCLI(['Bash, FileRead Edit'])).toEqual([
      'Bash',
      'FileRead',
      'Edit',
    ])
  })

  test('trailing whitespace trimmed', () => {
    expect(parseToolListFromCLI(['Bash   '])).toEqual(['Bash'])
  })
})

describe('parseToolListFromCLI — paren-wrapped rules (commas preserved)', () => {
  test('Bash(ls -la) preserved as one tool', () => {
    expect(parseToolListFromCLI(['Bash(ls -la)'])).toEqual(['Bash(ls -la)'])
  })

  test('comma inside parens is NOT a separator', () => {
    // `Bash(rm, -rf)` es una sola regla, no `[Bash(rm, -rf)]` partida en dos.
    expect(parseToolListFromCLI(['Bash(rm, -rf)'])).toEqual(['Bash(rm, -rf)'])
  })

  test('space inside parens is NOT a separator', () => {
    expect(parseToolListFromCLI(['Bash(ls -la)'])).toEqual(['Bash(ls -la)'])
  })

  test('multiple paren-wrapped tools separated by comma', () => {
    expect(parseToolListFromCLI(['Bash(ls),FileRead(*.ts)'])).toEqual([
      'Bash(ls)',
      'FileRead(*.ts)',
    ])
  })

  test('paren-wrapped + bare tool mixed', () => {
    expect(parseToolListFromCLI(['Bash(ls), Edit'])).toEqual([
      'Bash(ls)',
      'Edit',
    ])
  })

  test('nested-looking content (no real nesting) still works', () => {
    // Los paréntesis exteriores cierran la envoltura; los interiores son parte de la regla.
    expect(parseToolListFromCLI(['Bash(echo "(hi)")'])).toEqual([
      'Bash(echo "(hi)")',
    ])
  })
})

describe('parseToolListFromCLI — multiple input strings', () => {
  test('each input string is parsed independently', () => {
    expect(parseToolListFromCLI(['Bash', 'FileRead'])).toEqual([
      'Bash',
      'FileRead',
    ])
  })

  test('mixed multi-input + comma-separated', () => {
    expect(parseToolListFromCLI(['Bash,FileRead', 'Edit Glob'])).toEqual([
      'Bash',
      'FileRead',
      'Edit',
      'Glob',
    ])
  })

  test('empty strings within array are filtered', () => {
    expect(parseToolListFromCLI(['', 'Bash', ''])).toEqual(['Bash'])
  })

  test('whitespace-only strings produce no output', () => {
    expect(parseToolListFromCLI(['   '])).toEqual([])
  })
})

describe('parseToolListFromCLI — edge cases', () => {
  test('multiple commas in a row do not produce empty entries', () => {
    expect(parseToolListFromCLI(['Bash,,FileRead'])).toEqual([
      'Bash',
      'FileRead',
    ])
  })

  test('leading comma ignored', () => {
    expect(parseToolListFromCLI([',Bash'])).toEqual(['Bash'])
  })

  test('trailing comma ignored', () => {
    expect(parseToolListFromCLI(['Bash,'])).toEqual(['Bash'])
  })

  test('multiple spaces collapsed implicitly via per-tool trim', () => {
    expect(parseToolListFromCLI(['Bash    FileRead'])).toEqual([
      'Bash',
      'FileRead',
    ])
  })

  test('paren tool with literal whitespace inside parsed correctly', () => {
    expect(parseToolListFromCLI(['Bash(ls   -la)'])).toEqual([
      'Bash(ls   -la)',
    ])
  })
})
