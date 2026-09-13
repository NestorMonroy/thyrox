import { describe, expect, test } from 'bun:test'
import { compressToolResult } from '../src/index.ts'

describe('compressToolResult', () => {
  test('texto corto sin filtro conocido: sin cambio', () => {
    const r = compressToolResult('hola mundo')
    expect(r.engine).toBe('unchanged')
    expect(r.text).toBe('hola mundo')
  })

  test('un git status real usa RTK y recorta el ruido', () => {
    const output =
      'On branch main\nChanges not staged for commit:\n  (use "git add" to update)\n\tmodified: a.ts\n'
    const r = compressToolResult(output, 'git status')
    expect(r.engine).toBe('rtk')
    expect(r.filterId).toBe('git-status')
    expect(r.text).not.toContain('(use "git add"')
  })

  test('texto largo sin filtro conocido cae al tope generico, sin partir palabras', () => {
    const long = 'word '.repeat(500) // 2500 caracteres, sin forma reconocida por RTK
    const r = compressToolResult(long)
    expect(r.engine).toBe('generic-cap')
    expect(r.filterId).toBeNull()
    expect(r.text.endsWith('\n...[truncado]')).toBe(true)
    expect(r.text.length).toBeLessThan(long.length)
  })

  test('control de anulacion: un git status CORTO no dispara el tope generico', () => {
    // Confirma que "unchanged" no es el default universal: un texto que SI
    // matchea RTK pasa por RTK aunque sea corto, no por el tope de longitud.
    const r = compressToolResult('On branch main\nChanges not staged for commit:\n', 'git status')
    expect(r.engine).toBe('rtk')
  })
})
