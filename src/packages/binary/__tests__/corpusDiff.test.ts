/**
 * `diffManifests`: compara dos `MANIFEST.tsv` por ruta y sha256. Es la pieza
 * que `writeCorpus` usa para declarar la procedencia de una extracción
 * contra su base — aquí se prueba sola, sin escribir ningún corpus.
 */
import { describe, expect, test } from 'bun:test'
import { diffManifests, parseManifest } from '../src/corpusDiff.ts'

const HEADER = 'archivo\tbytes\ttipo\tsha256'

function manifest(rows: [string, number, string, string][]): string {
  return [HEADER, ...rows.map(f => f.join('\t'))].join('\n') + '\n'
}

describe('parseManifest', () => {
  test('lee cada fila tras la cabecera', () => {
    const text = manifest([['a.js', 10, 'texto', 'sha-a'], ['b.js', 20, 'binario', 'sha-b']])
    expect(parseManifest(text)).toEqual([
      { path: 'a.js', bytes: 10, type: 'texto', sha256: 'sha-a' },
      { path: 'b.js', bytes: 20, type: 'binario', sha256: 'sha-b' },
    ])
  })

  test('solo la cabecera da una lista vacía', () => {
    expect(parseManifest(`${HEADER}\n`)).toEqual([])
  })

  test('texto vacío da una lista vacía', () => {
    expect(parseManifest('')).toEqual([])
  })
})

describe('diffManifests', () => {
  const base = manifest([
    ['a.js', 10, 'texto', 'sha-a'],
    ['b.js', 20, 'texto', 'sha-b'],
    ['c.js', 30, 'texto', 'sha-c'],
  ])

  test('una ruta solo en next es added', () => {
    const next = manifest([['a.js', 10, 'texto', 'sha-a'], ['d.js', 40, 'texto', 'sha-d']])
    const diff = diffManifests(base, next)
    expect(diff.added).toEqual([{ path: 'd.js', bytes: 40, type: 'texto', sha256: 'sha-d' }])
  })

  test('una ruta solo en base es removed', () => {
    const next = manifest([['a.js', 10, 'texto', 'sha-a']])
    const diff = diffManifests(base, next)
    expect(diff.removed.map(e => e.path).sort()).toEqual(['b.js', 'c.js'])
  })

  test('misma ruta y distinto sha256 es changed, con el antes y el después', () => {
    const next = manifest([
      ['a.js', 10, 'texto', 'sha-a'],
      ['b.js', 25, 'texto', 'sha-b2'],
      ['c.js', 30, 'texto', 'sha-c'],
    ])
    const diff = diffManifests(base, next)
    expect(diff.changed).toEqual([{
      path: 'b.js',
      before: { path: 'b.js', bytes: 20, type: 'texto', sha256: 'sha-b' },
      after: { path: 'b.js', bytes: 25, type: 'texto', sha256: 'sha-b2' },
    }])
  })

  test('misma ruta y mismo sha256 es unchanged', () => {
    const diff = diffManifests(base, base)
    expect(diff.unchanged.map(e => e.path).sort()).toEqual(['a.js', 'b.js', 'c.js'])
    expect(diff.added).toEqual([])
    expect(diff.removed).toEqual([])
    expect(diff.changed).toEqual([])
  })

  // CONTROL: sin distinguir por sha256 —solo por ruta— un archivo con el
  // mismo nombre y contenido distinto pasaría por `unchanged`. Retirar la
  // comparación de sha256 (declarar todo lo que comparte ruta como
  // `unchanged`) tumba esta prueba y la de arriba.
  test('control — comparar solo por ruta confundiría changed con unchanged', () => {
    const next = manifest([['b.js', 25, 'texto', 'sha-b2']])
    const diff = diffManifests(manifest([['b.js', 20, 'texto', 'sha-b']]), next)
    expect(diff.changed).toHaveLength(1)
    expect(diff.unchanged).toHaveLength(0)
  })
})
