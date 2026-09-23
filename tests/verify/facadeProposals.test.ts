/**
 * Control de las fachadas TS2305 de `src/verify/tscProposers.ts`.
 *
 * Un miembro que falta en un módulo y existe exportado UNA vez en el mismo
 * paquete admite una fachada: `export { M } from './decl.js'` en el módulo
 * proveedor. Es la forma del primer lote verificado (`thyrox@f49db1a4`).
 *
 * Qué haría fallar a este control:
 * - proponer con dos declaraciones candidatas: elegir una es juicio;
 * - cruzar de paquete: una fachada así crea una dependencia que nadie decidió;
 * - reexportar un tipo con `export {}`: bajo `isolatedModules` es un error;
 * - reexportar desde un archivo que importa al proveedor (ciclo directo) o que
 *   delega en los bindings del host (el ciclo de H-THYROX-156).
 */
import { describe, expect, test } from 'bun:test'
import ts from 'typescript'
import { applyProposalEdits, proposeInMemory } from '../../src/verify/tscProposers'
import { DEFAULT_OPTIONS, createMemoryService } from '../../src/verify/tsLanguageService'

const OPTIONS: ts.CompilerOptions = {
  ...DEFAULT_OPTIONS,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  isolatedModules: true,
}

const base = {
  '/p/package.json': '{"name": "p"}\n',
  '/p/impl.ts': 'export function helper(): number { return 1 }\nexport interface Shape { a: number }\n',
  '/p/barrel.ts': 'export const other = 1\n',
  '/p/use.ts':
    "import { helper, other } from './barrel.js'\nimport type { Shape } from './barrel.js'\n" +
    'export const s: Shape = { a: helper() + other }\n',
}

function codes(files: Record<string, string>, file: string): number[] {
  return createMemoryService(files, OPTIONS).service.getSemanticDiagnostics(file).map(d => d.code)
}

describe('ts2305 facades', () => {
  test('control del arnés: la fixture resuelve sus módulos y tiene sus dos TS2305', () => {
    expect(codes(base, '/p/use.ts').filter(code => code === 2305)).toHaveLength(2)
    expect(codes(base, '/p/use.ts')).not.toContain(2307)
  })

  test('re-exports a value and a type from their single declaration', () => {
    const rows = proposeInMemory(base, Object.keys(base).filter(f => f.endsWith('.ts')), '/p', OPTIONS)
      .filter(row => row.proposer === 'ts2305-facade')
    expect(rows.map(row => row.proposal_id)).toEqual(['ts2305-facade:barrel.ts'])
    expect(rows[0].files).toEqual(['barrel.ts'])
    expect(rows[0].targets).toHaveLength(2)
    const next = applyProposalEdits(base, rows[0], '/p')
    expect(next['/p/barrel.ts']).toContain("export { helper } from './impl.js'")
    expect(next['/p/barrel.ts']).toContain("export type { Shape } from './impl.js'")
    expect(codes(next, '/p/use.ts')).toEqual([])
    expect(codes(next, '/p/barrel.ts')).toEqual([])
  })

  test('two candidate declarations are judgment, not a facade', () => {
    const twice = { ...base, '/p/impl2.ts': 'export function helper(): number { return 2 }\n' }
    const rows = proposeInMemory(twice, Object.keys(twice).filter(f => f.endsWith('.ts')), '/p', OPTIONS)
      .filter(row => row.proposer === 'ts2305-facade')
    expect(rows.flatMap(row => row.edits.map(edit => edit.newText)).join('')).not.toContain('helper')
  })

  test('a declaration in another package is not re-exported', () => {
    const other = {
      '/p/package.json': base['/p/package.json'],
      '/p/barrel.ts': base['/p/barrel.ts'],
      '/p/use.ts': "import { helper } from './barrel.js'\nexport const n = helper()\n",
      '/q/package.json': '{"name": "q"}\n',
      '/q/impl.ts': 'export function helper(): number { return 1 }\n',
    }
    const rows = proposeInMemory(other, Object.keys(other).filter(f => f.endsWith('.ts')), '/p', OPTIONS)
    expect(rows.filter(row => row.proposer === 'ts2305-facade')).toEqual([])
  })

  test('a declaration that imports the provider is a direct cycle', () => {
    const cyclic = {
      ...base,
      '/p/impl.ts':
        "import { other } from './barrel.js'\nexport function helper(): number { return other }\n" +
        'export interface Shape { a: number }\n',
    }
    const rows = proposeInMemory(cyclic, Object.keys(cyclic).filter(f => f.endsWith('.ts')), '/p', OPTIONS)
      .filter(row => row.proposer === 'ts2305-facade')
    expect(rows).toEqual([])
  })

  test('a declaration that delegates to host bindings is refused (H-THYROX-156)', () => {
    const delegating = {
      ...base,
      '/p/impl.ts':
        'declare function getAgentHostBindings(): { helper?: () => number }\n' +
        'export function helper(): number { return getAgentHostBindings().helper?.() ?? 0 }\n' +
        'export interface Shape { a: number }\n',
    }
    const rows = proposeInMemory(delegating, Object.keys(delegating).filter(f => f.endsWith('.ts')), '/p', OPTIONS)
      .filter(row => row.proposer === 'ts2305-facade')
    expect(rows).toEqual([])
  })
})
