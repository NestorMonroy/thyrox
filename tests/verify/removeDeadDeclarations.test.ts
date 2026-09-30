/**
 * Control de `src/verify/removeDeadDeclarations.ts`: el racimo muerto se
 * retira hasta el punto fijo, y nada con efectos, exportado o vivo en la
 * fuente se toca.
 */
import { describe, expect, test } from 'bun:test'
import ts from 'typescript'
import { deadDeclarationEdits } from '../../src/verify/removeDeadDeclarations'

function apply(text: string, edits: ts.TextChange[]): string {
  let result = text
  for (const edit of [...edits].sort((a, b) => b.span.start - a.span.start)) {
    result = result.slice(0, edit.span.start) + edit.newText + result.slice(edit.span.start + edit.span.length)
  }
  return result
}

const CLUSTER = [
  '// Cabecera del archivo.',
  '',
  '/** Ayudante que sólo usa `dead`. */',
  'function helper(): number {',
  '  return 1',
  '}',
  '',
  'function dead(): number {',
  '  return helper()',
  '}',
  '',
  'const registered = register()',
  'const table = { a: () => 2 }',
  '',
  'export function alive(): number {',
  '  return 3',
  '}',
  '',
].join('\n')

describe('deadDeclarationEdits', () => {
  test('retira el racimo hasta el punto fijo: la muerta y el ayudante que sólo ella usaba', () => {
    const out = apply(CLUSTER, deadDeclarationEdits('/m.ts', CLUSTER))
    expect(out).not.toContain('function dead')
    expect(out).not.toContain('function helper')
    expect(out).not.toContain('Ayudante que sólo usa')
  })

  test('conserva lo que llama algo, lo exportado y la cabecera del archivo', () => {
    const out = apply(CLUSTER, deadDeclarationEdits('/m.ts', CLUSTER))
    expect(out).toContain('const registered = register()')
    expect(out).toContain('export function alive')
    expect(out.startsWith('// Cabecera del archivo.\n')).toBe(true)
    expect(out).not.toContain('const table')
  })

  test('no retira lo que la fuente sí usa: ahí lo que falta es el porte', () => {
    const source = 'function dead() { return helper() }\nfunction helper() { return 1 }\ndead()\n'
    const out = apply(CLUSTER, deadDeclarationEdits('/m.ts', CLUSTER, source))
    expect(out).toContain('function dead')
    expect(out).toContain('function helper')
  })

  test('el ayudante que en la fuente sólo usa otra muerta también está muerto allá', () => {
    const source = 'function dead() { return helper() }\nfunction helper() { return 1 }\n'
    const out = apply(CLUSTER, deadDeclarationEdits('/m.ts', CLUSTER, source))
    expect(out).not.toContain('function dead')
    expect(out).not.toContain('function helper')
  })
})

const IMPORTS = [
  "import { used, orphan } from './lib'",
  '',
  'function deadUser(): number {',
  '  return orphan()',
  '}',
  '',
  'let counter = 0',
  '',
  'export function tick(): number {',
  '  counter = 1',
  '  return used()',
  '}',
  '',
].join('\n')

describe('deadDeclarationEdits — lo que el racimo deja atrás', () => {
  test('retira el import que sólo usaba el racimo y conserva el resto del import', () => {
    const out = apply(IMPORTS, deadDeclarationEdits('/i.ts', IMPORTS))
    expect(out).not.toContain('function deadUser')
    expect(out).not.toContain('orphan')
    expect(out).toContain("import { used } from './lib'")
  })

  test('no retira una variable que el archivo asigna aunque nadie la lea', () => {
    const out = apply(IMPORTS, deadDeclarationEdits('/i.ts', IMPORTS))
    expect(out).toContain('let counter = 0')
  })
})
