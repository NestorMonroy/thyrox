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
  cleanOutputDir,
  distEntry,
  emitModuleResources,
  expandEntries,
  planModuleResources,
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

/** Un paquete al estilo `*-napi`: dos `.node` por `require` literal, uno vendorizado y otro no. */
function writeNapiPackage(root: string): string {
  const pkg = join(root, 'napi')
  writeFile(join(pkg, 'src/index.ts'), [
    "export function loadVendored(): unknown { return require('../vendor/x.node') }",
    "export function loadLocal(): unknown { return require('../native/y.node') }",
    '',
  ].join('\n'))
  writeFile(join(pkg, 'vendor/x.node'), 'binary\n')
  const manifest = {
    name: '@probe/napi', version: '0.1.0', private: true, type: 'module',
    main: './src/index.ts',
    exports: { '.': { '@thyrox/source': './src/index.ts', default: './src/index.ts' } },
  }
  writeFileSync(join(pkg, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
  return pkg
}

describe('build con .node externos', () => {
  test('construye, conserva los require relativos y no copia .node a dist', async () => {
    const pkg = writeNapiPackage(tempDir('build-js-napi-'))
    const result = await buildPackage(pkg)
    expect(result.success).toBe(true)
    const js = readFileSync(join(pkg, 'dist/index.js'), 'utf8')
    expect(js).toContain("require(\"../vendor/x.node\")")
    expect(js).toContain("require(\"../native/y.node\")")
    expect(existsSync(join(pkg, 'dist/x.node'))).toBe(false)
    expect(existsSync(join(pkg, 'dist/y.node'))).toBe(false)
  })
})

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

/**
 * Un paquete `rootDir: src` cuyo módulo lee un dato junto a sí mismo
 * (`join(HERE, 'data.json')`), uno que referencia a otro módulo de código,
 * uno que sale del `rootDir` con `'..'`, y uno con un argumento no literal —
 * los cuatro reexportados desde `index.ts` para que `Bun.build` los alcance
 * y el plan, que lee del `.js` ya emitido, los vea.
 */
function writeResourcePackage(root: string): string {
  const pkg = join(root, 'respkg')
  writeFile(join(pkg, 'src/index.ts'), [
    "import { readFileSync } from 'node:fs'",
    "import { dirname, join } from 'node:path'",
    "import { fileURLToPath } from 'node:url'",
    "import { codePath } from './refCode.ts'",
    "import { outsidePath } from './refOutside.ts'",
    "import { templatePath } from './refTemplate.ts'",
    'const HERE = dirname(fileURLToPath(import.meta.url))',
    "export const data = readFileSync(join(HERE, 'data.json'), 'utf8')",
    'export { codePath, outsidePath, templatePath }',
    '',
  ].join('\n'))
  writeFile(join(pkg, 'src/data.json'), '{"ok":true}\n')
  writeFile(join(pkg, 'src/other.ts'), 'export const x = 1\n')
  writeFile(join(pkg, 'src/refCode.ts'), [
    "import { dirname, join } from 'node:path'",
    "import { fileURLToPath } from 'node:url'",
    'const HERE = dirname(fileURLToPath(import.meta.url))',
    "export const codePath = join(HERE, 'other.ts')",
    '',
  ].join('\n'))
  writeFile(join(pkg, 'src/refOutside.ts'), [
    "import { dirname, join } from 'node:path'",
    "import { fileURLToPath } from 'node:url'",
    'const HERE = dirname(fileURLToPath(import.meta.url))',
    "export const outsidePath = join(HERE, '..', '..', 'outside.txt')",
    '',
  ].join('\n'))
  writeFile(join(pkg, 'src/refTemplate.ts'), [
    "import { dirname, join } from 'node:path'",
    "import { fileURLToPath } from 'node:url'",
    'const HERE = dirname(fileURLToPath(import.meta.url))',
    "export const templatePath = join(HERE, `variant-${1}.json`)",
    '',
  ].join('\n'))
  const manifest = {
    name: '@probe/respkg', version: '0.1.0', private: true, type: 'module', main: './src/index.ts',
    exports: { '.': { '@thyrox/source': './src/index.ts', default: './src/index.ts' } },
  }
  writeFileSync(join(pkg, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
  return pkg
}

describe('recursos que un módulo resuelve relativos a sí mismo (H-THYROX-263, H-THYROX-264)', () => {
  test('copia el dato junto al .js, y el import compilado lo lee desde dist/', async () => {
    const pkg = writeResourcePackage(tempDir('build-js-res-'))
    const result = await buildPackage(pkg)
    expect(result.success).toBe(true)
    expect(existsSync(join(pkg, 'dist/data.json'))).toBe(true)
    const mod = await import(join(pkg, 'dist/index.js'))
    expect(JSON.parse(mod.data)).toEqual({ ok: true })
  })

  test('declara sin copiar una referencia a otro módulo de código, una que sale del '
    + 'rootDir y una con un argumento no literal', async () => {
    const pkg = writeResourcePackage(tempDir('build-js-res-declared-'))
    const result = await buildPackage(pkg)
    expect(result.success).toBe(true)
    const { declared } = result.resources
    expect(declared.find(d => d.source === './src/refCode.ts')?.reason)
      .toBe('referencia a otro módulo de código')
    expect(declared.find(d => d.source === './src/refOutside.ts')?.reason)
      .toBe('fuera del rootDir del paquete')
    expect(declared.find(d => d.source === './src/refTemplate.ts')?.reason)
      .toBe('argumento no literal')
    expect(existsSync(join(pkg, 'dist/other.ts'))).toBe(false)
    expect(existsSync(join(pkg, 'dist', 'outside.txt'))).toBe(false)
  })

  test('una referencia literal a un dato inexistente falla el build', async () => {
    const pkg = writeResourcePackage(tempDir('build-js-res-missing-'))
    rmSync(join(pkg, 'src/data.json'))
    const result = await buildPackage(pkg)
    expect(result.success).toBe(false)
    expect(result.resources.missing).toEqual([{ source: './src/index.ts', literal: 'data.json' }])
  })

  test('anulación: con la emisión desactivada el import cae con ENOENT, y nada más cambia', async () => {
    const pkg = writeResourcePackage(tempDir('build-js-res-off-'))
    const result = await buildPackage(pkg, { emitResources: false })
    expect(result.success).toBe(true)
    expect(result.resources.emit.length).toBe(1)
    expect(existsSync(join(pkg, 'dist/data.json'))).toBe(false)
    let threw: unknown
    try {
      await import(join(pkg, 'dist/index.js'))
    } catch (err) {
      threw = err
    }
    expect(String(threw)).toContain('ENOENT')
  })

  test('planModuleResources se puede llamar directo con los outputs de un build', async () => {
    const pkg = writeResourcePackage(tempDir('build-js-res-direct-'))
    const result = await buildPackage(pkg, { emitResources: false })
    const plan = await planModuleResources(pkg, 'src', result.outputs)
    expect(plan.emit).toEqual(result.resources.emit)
  })

  test('emitModuleResources con copy:false no toca disco', () => {
    const plan = {
      emit: [{ source: './src/index.ts', literal: 'data.json',
        sourceAbs: '/no/existe/data.json', targetAbs: '/no/existe/dist/data.json' }],
      declared: [], missing: [],
    }
    emitModuleResources(plan, { copy: false })
    expect(existsSync('/no/existe/dist/data.json')).toBe(false)
  })
})

/**
 * Un paquete cuyo único módulo lee un dato junto a sí mismo con
 * `import.meta.dir` (la forma que reemplaza a `__dirname` en
 * `bridgeClient.ts`, H-THYROX-265). Se instancia dos veces bajo raíces
 * absolutas distintas (`tempDir` sufija con un nombre aleatorio distinto en
 * cada llamada) para medir que el `dist` emitido no depende de esa ruta.
 */
function writeHerePackage(root: string): string {
  const pkg = join(root, 'herepkg')
  writeFile(join(pkg, 'src/index.ts'), [
    "import { readFileSync } from 'node:fs'",
    "import { join } from 'node:path'",
    'export const here = import.meta.dir',
    "export const data = readFileSync(join(here, 'data.json'), 'utf8')",
    '',
  ].join('\n'))
  writeFile(join(pkg, 'src/data.json'), '{"ok":true}\n')
  const manifest = {
    name: '@probe/herepkg', version: '0.1.0', private: true, type: 'module', main: './src/index.ts',
    exports: { '.': { '@thyrox/source': './src/index.ts', default: './src/index.ts' } },
  }
  writeFileSync(join(pkg, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
  return pkg
}

function distFilesSorted(pkg: string): string[] {
  return [...new Bun.Glob('**/*').scanSync({ cwd: join(pkg, 'dist'), onlyFiles: true })].sort()
}

describe('el dist emitido no depende de la ruta absoluta del árbol fuente (H-THYROX-265)', () => {
  test('el mismo paquete, construido desde dos raíces absolutas distintas por un '
    + 'packageDir relativo (el patrón real: cd a la raíz, build por ruta relativa), '
    + 'da un dist byte a byte igual', async () => {
    const rootA = tempDir('build-js-path-a-')
    const rootB = tempDir('build-js-path-b-')
    writeHerePackage(rootA)
    writeHerePackage(rootB)
    const cwd0 = process.cwd()
    let resultA: Awaited<ReturnType<typeof buildPackage>>
    let resultB: Awaited<ReturnType<typeof buildPackage>>
    try {
      process.chdir(rootA)
      resultA = await buildPackage('herepkg')
      process.chdir(rootB)
      resultB = await buildPackage('herepkg')
    } finally {
      process.chdir(cwd0)
    }
    expect(resultA.success).toBe(true)
    expect(resultB.success).toBe(true)
    const pkgA = join(rootA, 'herepkg')
    const pkgB = join(rootB, 'herepkg')
    const filesA = distFilesSorted(pkgA)
    const filesB = distFilesSorted(pkgB)
    expect(filesA).toEqual(filesB)
    for (const rel of filesA) {
      expect(readFileSync(join(pkgA, 'dist', rel))).toEqual(readFileSync(join(pkgB, 'dist', rel)))
    }
    expect(existsSync(join(pkgA, 'dist/data.json'))).toBe(true)
  })
})

describe('el build no hereda salidas de un build anterior (H-THYROX-266)', () => {
  test('un chunk centinela plantado en dist/ desaparece tras un segundo build', async () => {
    const pkg = writeHerePackage(tempDir('build-js-stale-'))
    const first = await buildPackage(pkg)
    expect(first.success).toBe(true)
    const sentinel = join(pkg, 'dist/chunk-stale0000.js')
    writeFileSync(sentinel, '// centinela\n')
    expect(existsSync(sentinel)).toBe(true)
    const second = await buildPackage(pkg)
    expect(second.success).toBe(true)
    expect(existsSync(sentinel)).toBe(false)
  })

  test('cleanOutputDir vacía dist/ del paquete sin tocar el resto del árbol', () => {
    const pkg = tempDir('build-js-clean-')
    writeFile(join(pkg, 'dist/sub/chunk-old.js'), '// viejo\n')
    writeFile(join(pkg, 'keep.txt'), 'keep\n')
    cleanOutputDir(pkg)
    expect(existsSync(join(pkg, 'dist'))).toBe(false)
    expect(existsSync(join(pkg, 'keep.txt'))).toBe(true)
  })
})
