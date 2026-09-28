/**
 * Contrato del build JavaScript de los paquetes del workspace, sobre
 * `Bun.build` (`src/typescript/buildJavascript.ts`).
 *
 * Los hermanos se consumen por su build, no por su fuente (directiva del
 * ejecutor). Hechos de Bun 1.3.11 que fijan la forma:
 *
 * 1. Sin `splitting`, cada entrada lleva dentro su copia de los módulos que
 *    importa: dos entradas que comparten un módulo con estado ven dos
 *    estados. Con `splitting` el compartido va a un chunk único.
 * 2. `bunfig.toml` no tiene clave de condiciones; leer el fuente exige
 *    `--conditions=@thyrox/source` en cada invocación.
 * 3. Sin condición, Bun resuelve `default`.
 *
 * Ciega a: si el JS emitido se comporta como el fuente más allá de lo que
 * las suites de cada paquete ejercitan contra `dist/`.
 */
import { afterAll, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  buildPackage,
  checkPackage,
  distEntry,
  expandEntries,
  repointDefault,
  sourceEntries,
} from '../../src/typescript/buildJavascript.ts'

const ROOT = join(import.meta.dir, '../..')
const SCRATCH = join(ROOT, '.claude/cache')
const temps: string[] = []
function tempDir(prefix: string): string {
  mkdirSync(SCRATCH, { recursive: true })
  const dir = mkdtempSync(join(SCRATCH, prefix))
  temps.push(dir)
  return dir
}
afterAll(() => temps.forEach(d => rmSync(d, { recursive: true, force: true })))

function writeFile(path: string, text: string): void {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, text)
}

/** Un paquete con dos entradas que comparten un módulo con estado. */
function writePackage(root: string): string {
  const pkg = join(root, 'pkg')
  writeFile(join(pkg, 'shared.ts'), 'export const state = { count: 0 }\n')
  writeFile(join(pkg, 'index.ts'),
    "import { state } from './shared.ts'\nexport function bump() { state.count++ }\n")
  writeFile(join(pkg, 'sub/reader.tsx'),
    "import { state } from '../shared.ts'\nexport function read() { return state.count }\n")
  const manifest = {
    name: '@probe/pkg', version: '0.1.0', private: true, type: 'module', main: './index.ts',
    exports: {
      '.': { '@thyrox/source': './index.ts', types: './dist/index.d.ts', default: './index.ts' },
      './reader': { '@thyrox/source': './sub/reader.tsx', types: './dist/sub/reader.d.ts',
        default: './sub/reader.tsx' },
    },
  }
  writeFileSync(join(pkg, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
  return pkg
}

describe('distEntry', () => {
  test('.ts a .js bajo dist', () => expect(distEntry('./index.ts')).toBe('./dist/index.js'))
  test('.tsx anidado', () => expect(distEntry('./sub/reader.tsx')).toBe('./dist/sub/reader.js'))
  test('relativo al rootDir', () => expect(distEntry('./src/a.ts', 'src')).toBe('./dist/a.js'))
})

test('sourceEntries toma @thyrox/source y la cadena llana, nunca dist', () => {
  expect(sourceEntries({
    main: './index.ts',
    exports: { '.': { '@thyrox/source': './index.ts', default: './dist/index.js' }, './a': './a.ts' },
  })).toEqual(['./a.ts', './index.ts'])
})

test('un comodín en la raíz no recoge dist/, declaraciones ni pruebas', () => {
  const wild = tempDir('build-js-wild-')
  for (const rel of ['dist/index.d.ts', 'dist/old.js', 'dist/stale.ts', '__tests__/a.test.ts',
    'io.ts', 'types.d.ts']) writeFile(join(wild, rel), 'export {}\n')
  expect(expandEntries(wild, ['./*.ts'])).toEqual(['./io.ts'])
})

describe('build y repunte', () => {
  const pkg = writePackage(tempDir('build-js-'))

  test('sin dist/*.js el repunte rehúsa', () => expect(repointDefault(pkg)).toBe(false))

  test('build emite las dos entradas con el estado compartido en UNA instancia', async () => {
    const result = await buildPackage(pkg)
    expect(result.success).toBe(true)
    expect(existsSync(join(pkg, 'dist/index.js'))).toBe(true)
    expect(existsSync(join(pkg, 'dist/sub/reader.js'))).toBe(true)
    writeFileSync(join(pkg, 'probe.mjs'),
      "import { bump } from './dist/index.js'\nimport { read } from './dist/sub/reader.js'\n" +
      'bump(); bump(); console.log(read())\n')
    const run = Bun.spawnSync(['bun', join(pkg, 'probe.mjs')], { cwd: pkg })
    expect(run.stdout.toString().trim()).toBe('2')
  })

  test('con los .js repunta default y main, conserva la fuente y es idempotente', () => {
    expect(repointDefault(pkg)).toBe(true)
    const written = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8'))
    expect(written.exports['.'].default).toBe('./dist/index.js')
    expect(written.exports['./reader'].default).toBe('./dist/sub/reader.js')
    expect(written.exports['./reader']['@thyrox/source']).toBe('./sub/reader.tsx')
    expect(written.main).toBe('./dist/index.js')
    const before = readFileSync(join(pkg, 'package.json'), 'utf8')
    repointDefault(pkg)
    expect(readFileSync(join(pkg, 'package.json'), 'utf8')).toBe(before)
    expect(checkPackage(pkg)).toEqual([])
  })

  test('emit_declarations.repoint_manifest no deshace el repunte JS', () => {
    for (const rel of ['dist/index.d.ts', 'dist/sub/reader.d.ts']) writeFile(join(pkg, rel), 'export {}\n')
    const run = Bun.spawnSync(['python3', '-c',
      'import sys; from pathlib import Path; from typescript import emit_declarations as e; '
      + 'print(e.repoint_manifest(Path(sys.argv[1])))', pkg],
    { cwd: ROOT, env: { ...process.env, PYTHONPATH: join(ROOT, 'src') } })
    expect(run.stdout.toString().trim()).toBe('True')
    const after = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8'))
    expect(after.exports['./reader'].default).toBe('./dist/sub/reader.js')
    expect(after.exports['./reader']['@thyrox/source']).toBe('./sub/reader.tsx')
  })
})
