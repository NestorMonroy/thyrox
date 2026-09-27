/**
 * `references`: quién usa un símbolo y qué miembro llama. Es la dirección que
 * `symbol` no recorre: aquél baja del uso a la definición; éste sube de la
 * definición a sus usos, siguiendo el alias del export y el nombre local de
 * cada import. Buscar por un literal encuentra a quien lo lee, no a quien usa
 * el mecanismo (la detección de WSL se leyó así, y lo que no estaba junto al
 * literal no se vio).
 *
 * Control de anulación, medido: buscar el nombre exportado en vez del alias
 * local del import hace caer los casos 1 y 4; saltarse el propio chunk hace
 * caer los mismos dos (el 4 es la CLI sobre el mismo recorrido). El caso 2 no
 * depende de ninguno: mide que un homónimo de otro export no cuente.
 */
import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { referencesOf } from '../src/symbol.ts'

const root = mkdtempSync(join(tmpdir(), 'binary-references-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))
const DEF = '/$bunfs/root/chunk-def.js'
writeFileSync(join(root, 'chunk-def.js'),
  'class S{getPlatform(){return"linux"}prime(){}getWslVersion(){}}\n' +
  'var G;function p(){return G??=new S}\n' +
  'function internal(){return p().getWslVersion()}\n' +
  'export{p as Pf,internal as In};\n')
writeFileSync(join(root, 'chunk-use1.js'),
  `import{Pf as q}from"${DEF}";function useA(){return q().getPlatform()==="windows"}\nexport{useA};\n`)
writeFileSync(join(root, 'chunk-use2.js'),
  `import{Pf as z}from"${DEF}";async function boot(){await z().prime()}\n`)
writeFileSync(join(root, 'chunk-other.js'),
  `import{In as p}from"${DEF}";function unrelated(){return p()}\n`)

const BIN = join(import.meta.dir, '..', 'bin', 'binary.ts')

describe('referencesOf — de la definición a sus usos', () => {
  test('1. cada uso con su chunk, su declaración y el miembro que llama', () => {
    const found = referencesOf(root, 'chunk-def.js', 'p').map(r => [r.file, r.binding, r.member])
    expect(found).toEqual([
      ['chunk-def.js', 'internal', 'getWslVersion'],
      ['chunk-use1.js', 'useA', 'getPlatform'],
      ['chunk-use2.js', 'boot', 'prime'],
    ])
  })

  test('2. un homónimo local importado de OTRO export no cuenta', () => {
    expect(referencesOf(root, 'chunk-def.js', 'p').some(r => r.file === 'chunk-other.js')).toBe(false)
  })

  test('3. un símbolo sin usos da una lista vacía', () => {
    expect(referencesOf(root, 'chunk-use1.js', 'useA')).toEqual([])
  })
})

describe('bin/binary references', () => {
  test('4. imprime cada uso y el denominador', () => {
    const p = Bun.spawnSync(['bun', 'run', BIN, 'references', 'chunk-def.js', 'p', '--root', root])
    expect(p.exitCode).toBe(0)
    expect(p.stdout.toString()).toContain('chunk-use2.js FunctionDeclaration boot .prime')
    expect(p.stderr.toString()).toContain('references: 3 uso(s) de p en 3 chunk(s), exportado como Pf')
  })
})
