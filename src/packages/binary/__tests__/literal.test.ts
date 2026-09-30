/**
 * `literal`: qué declaraciones del corpus contienen un literal. Es la pregunta
 * con la que empieza toda extracción —«¿quién lee `/proc/version`?»— y se
 * respondía con `rg`/`grep -o` sobre los chunks: `extractByLiteral` existía y
 * ninguna orden de `bin/binary` la exponía.
 *
 * Control de anulación: contar como «con el literal» todo chunk que lo lleva
 * como subcadena —aunque sea sólo en un comentario, sin nodo— tumba
 * exactamente los dos denominadores de los casos 3 y 4.
 */
import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { declarationsByLiteral } from '../src/declaration.ts'

const root = mkdtempSync(join(tmpdir(), 'binary-literal-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))
writeFileSync(join(root, 'chunk-a.js'),
  'function MYn(){try{return ce().readFileSync("/proc/version",{encoding:"utf8"})}catch{return}}\nfunction other(){return 1}\n')
writeFileSync(join(root, 'chunk-b.js'),
  'class S{prime(){return this.sources.read("/proc/version")}}\n// "/proc/version" sólo en un comentario de este chunk no cuenta\n')
writeFileSync(join(root, 'chunk-c.js'), 'function ajeno(){return "/etc/os-release"}\n')
writeFileSync(join(root, 'chunk-d.js'), '// "/proc/version" y "/no/existe" sólo en un comentario\nfunction nada(){}\n')

const BIN = join(import.meta.dir, '..', 'bin', 'binary.ts')

describe('declarationsByLiteral — dónde vive un literal en el corpus', () => {
  test('1. nombra cada declaración con su chunk, su tipo y su nombre', () => {
    const found = declarationsByLiteral(root, '/proc/version').map(d => [d.file, d.kind, d.binding])
    expect(found).toEqual([
      ['chunk-a.js', 'FunctionDeclaration', 'MYn'],
      ['chunk-b.js', 'ClassDeclaration', 'S'],
    ])
  })

  test('2. un literal ausente da una lista vacía', () => {
    expect(declarationsByLiteral(root, '/no/existe')).toEqual([])
  })
})

describe('bin/binary literal', () => {
  test('3. imprime una línea por declaración y el denominador', () => {
    const p = Bun.spawnSync(['bun', 'run', BIN, 'literal', '/proc/version', '--root', root])
    const out = p.stdout.toString()
    expect(p.exitCode).toBe(0)
    expect(out).toContain('chunk-a.js FunctionDeclaration MYn')
    expect(out).toContain('chunk-b.js ClassDeclaration S')
    expect(p.stderr.toString()).toContain('literal: 2 declaración(es) en 2 de 4 chunk(s)')
  })

  test('4. sin coincidencias sale 1, con el denominador', () => {
    const p = Bun.spawnSync(['bun', 'run', BIN, 'literal', '/no/existe', '--root', root])
    expect(p.exitCode).toBe(1)
    expect(p.stderr.toString()).toContain('literal: 0 declaración(es) en 0 de 4 chunk(s)')
  })
})
