import { afterAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const { planCopies, applyPlan } = (await import(
  process.env.COPY_MISSING_MODULE ?? '../../src/verify/copy_missing_symbols.ts'
)) as typeof import('../../src/verify/copy_missing_symbols.ts')

// Un árbol destino al que le faltan exports que la fuente sí declara, y un log
// de tsc con sus TS2305. La fuente usa el alias viejo de import.
const root = mkdtempSync(join(tmpdir(), 'copy-missing-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))
const dest = join(root, 'dest')
const source = join(root, 'source')
for (const dir of [dest, source]) mkdirSync(join(dir, 'pkg'), { recursive: true })
writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({
  compilerOptions: { strict: true, noEmit: true, target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler' },
  include: ['dest/**/*.ts'],
}))
writeFileSync(join(dest, 'pkg', 'mod.ts'), `import { keep } from './dep'
// nuestro comentario: el alias @claude-code-how-works/ se nombra aquí y no se reescribe
export const kept = keep
`)
writeFileSync(join(dest, 'pkg', 'dep.ts'), 'export const keep = 1\nexport const other = 2\n')
writeFileSync(join(dest, 'pkg', 'consumer.ts'),
  `import { foo, Shape, reexported } from './mod.js'\nexport const use = [foo, reexported] as const\nexport type T = Shape\n`)
writeFileSync(join(source, 'pkg', 'mod.ts'), `import { keep, other } from './dep'
import type { Unused } from '@claude-code-how-works/nowhere'
import { aliased } from '@claude-code-how-works/dep'
export const kept = keep

/** Suma con el auxiliar privado. */
export function foo(): number {
  return helper() + other + aliased + keep
}

function helper(): number {
  return 41
}

export type Shape = { value: number }
export { keep as reexported } from './dep'
export function notRequested(): Unused { return null as never }
`)
writeFileSync(join(source, 'pkg', 'dep.ts'), 'export const keep = 1\nexport const other = 2\n')
const log = [
  `dest/pkg/consumer.ts(1,10): error TS2305: Module '"./mod.js"' has no exported member 'foo'.`,
  `dest/pkg/consumer.ts(1,15): error TS2305: Module '"./mod.js"' has no exported member 'Shape'.`,
  `dest/pkg/consumer.ts(1,22): error TS2305: Module '"./mod.js"' has no exported member 'reexported'.`,
  `dest/pkg/consumer.ts(1,40): error TS2305: Module '"./ghost.js"' has no exported member 'x'.`,
]
const rewrites: [string, string][] = [['@claude-code-how-works/', '@thyrox/']]

describe('copy_missing_symbols', () => {
  const plan = planCopies({ root, destRoot: dest, sourceRoot: source, tsconfig: join(root, 'tsconfig.json'), logLines: log, rewrites })
  const mod = plan.files.find(f => f.destFile.endsWith('pkg/mod.ts'))!

  test('agrupa los símbolos pedidos por archivo destino', () => {
    expect(mod.symbols.sort()).toEqual(['Shape', 'foo', 'reexported'])
  })
  test('lo que no resuelve a un archivo con par en la fuente se informa, no se inventa', () => {
    expect(plan.skipped.map(s => s.symbol)).toEqual(['x'])
  })
  test('copia la declaración literal, con su comentario', () => {
    expect(mod.newText).toContain('/** Suma con el auxiliar privado. */\nexport function foo(): number {')
  })
  test('trae el auxiliar no exportado que la declaración usa', () => {
    expect(mod.newText).toContain('function helper(): number {')
  })
  test('trae el import que falta y no duplica el que ya existe', () => {
    expect(mod.newText).toContain("import { other } from './dep'")
    expect(mod.newText.match(/import \{ keep \} from '\.\/dep'/g)?.length).toBe(1)
  })
  test('copia el reexport tal cual', () => {
    expect(mod.newText).toContain("export { keep as reexported } from './dep'")
  })
  test('no copia lo que nadie pidió ni sus imports', () => {
    expect(mod.newText).not.toContain('notRequested')
    expect(mod.newText).not.toContain('nowhere')
  })
  test('conserva lo que el destino ya tenía, sin reescribirlo', () => {
    expect(mod.newText).toContain('// nuestro comentario: el alias @claude-code-how-works/ se nombra aquí y no se reescribe\nexport const kept = keep')
  })
  test('reescribe el alias en el import copiado', () => {
    expect(mod.newText).toContain("import { aliased } from '@thyrox/dep'")
  })
  test('el candidato lleva objetivos, base y una edición de archivo entero', () => {
    const candidates = applyPlan(plan, { write: false })
    expect(candidates).toHaveLength(1)
    const [candidate] = candidates
    expect(candidate?.targets).toHaveLength(3)
    expect(candidate?.edits[0]?.start).toBe(0)
    expect(Object.keys(candidate?.bases ?? {})).toEqual(candidate?.files ?? [])
  })
  test('el resultado compila: los tres TS2305 desaparecen', () => {
    applyPlan(plan, { write: true })
    const ts = require('typescript') as typeof import('typescript')
    const config = ts.getParsedCommandLineOfConfigFile(join(root, 'tsconfig.json'), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} })!
    const program = ts.createProgram(config.fileNames, config.options)
    const codes = ts.getPreEmitDiagnostics(program).map(d => d.code)
    expect(codes.filter(c => c === 2305)).toEqual([])
    expect(readFileSync(join(dest, 'pkg', 'mod.ts'), 'utf8')).toContain('export type Shape')
  })
})
