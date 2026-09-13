import { describe, expect, test } from 'bun:test'
import { compressToolResult } from '../src/index.ts'

describe('compressToolResult', () => {
  test('texto corto sin filtro conocido: sin cambio', () => {
    const r = compressToolResult('hola mundo')
    expect(r.motor).toBe('sin-cambio')
    expect(r.texto).toBe('hola mundo')
  })

  test('un git status real usa RTK y recorta el ruido', () => {
    const salida =
      'On branch main\nChanges not staged for commit:\n  (use "git add" to update)\n\tmodified: a.ts\n'
    const r = compressToolResult(salida, 'git status')
    expect(r.motor).toBe('rtk')
    expect(r.filtroId).toBe('git-status')
    expect(r.texto).not.toContain('(use "git add"')
  })

  test('texto largo sin filtro conocido cae al tope generico, sin partir palabras', () => {
    const largo = 'palabra '.repeat(400) // 3200 caracteres, sin forma reconocida por RTK
    const r = compressToolResult(largo)
    expect(r.motor).toBe('tope-generico')
    expect(r.filtroId).toBeNull()
    expect(r.texto.endsWith('\n...[truncado]')).toBe(true)
    expect(r.texto.length).toBeLessThan(largo.length)
  })

  test('control de anulacion: un git status CORTO no dispara el tope generico', () => {
    // Confirma que "sin-cambio" no es el default universal: un texto que SI
    // matchea RTK pasa por RTK aunque sea corto, no por el tope de longitud.
    const r = compressToolResult('On branch main\nChanges not staged for commit:\n', 'git status')
    expect(r.motor).toBe('rtk')
  })
})
