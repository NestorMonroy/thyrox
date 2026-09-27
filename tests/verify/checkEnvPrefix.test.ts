/**
 * `checkEnvPrefix`: la configuración de thyrox se lee como THYROX_*, y cada
 * variable propia tiene una prueba que la nombra.
 *
 * Directivas del ejecutor 2026-09-27: thyrox es el único cliente, así que lo
 * que lee como su configuración lleva su prefijo —como OmniRoute lee
 * OMNIROUTE_*—; y «necesitamos pruebas de que nuestras variables usan el
 * prefijo THYROX_* y de que cada una tiene sus pruebas».
 *
 * Tres familias no cuentan como deuda: THYROX_* (propia), ANTHROPIC_* (la
 * convención del SDK del proveedor, que OmniRoute también conserva) y las
 * que no llevan prefijo de producto (HOME, PATH, NODE_ENV…). Una CLAUDE_*
 * es del cliente ajeno: se renombra, o se marca `thyrox-rename: keep` donde
 * thyrox trata a propósito el entorno de ese cliente.
 */
import { afterAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  classifyName,
  compareBaseline,
  extractEnvReads,
  isProductionPath,
  isTestPath,
  uncoveredNames,
} from '../../src/verify/checkEnvPrefix.ts'

const REPO = join(import.meta.dir, '..', '..')
const GATE = join(REPO, 'src/verify/checkEnvPrefix.ts')

describe('extractEnvReads — las formas de leer el entorno', () => {
  test('TypeScript: process.env con punto y con corchete, readEnv y Bun.env', () => {
    const src = [
      'const a = process.env.THYROX_A',
      "const b = process.env['CLAUDE_CODE_B']",
      "if (isEnvTruthy(readEnv('ANTHROPIC_C'))) go()",
      'const d = Bun.env.HOME',
    ].join('\n')
    expect(extractEnvReads(src, 'ts').map(r => [r.line, r.name])).toEqual([
      [1, 'THYROX_A'],
      [2, 'CLAUDE_CODE_B'],
      [3, 'ANTHROPIC_C'],
      [4, 'HOME'],
    ])
  })

  test('Python: environ[...], environ.get, getenv', () => {
    const src = [
      "x = os.environ['THYROX_A']",
      "y = os.environ.get('CLAUDE_B', '')",
      "z = os.getenv('PATH')",
    ].join('\n')
    expect(extractEnvReads(src, 'py').map(r => r.name)).toEqual(['THYROX_A', 'CLAUDE_B', 'PATH'])
  })

  test('shell: sólo las formas que hacen del nombre un contrato de entorno', () => {
    const src = [
      'WIDTH="${THYROX_A:-$(nproc)}"', // valor por defecto: lo configura el entorno
      'export THYROX_B', // lo exporta a los hijos
      'unset CLAUDE_CODE_C', // lo retira del entorno
      'v=$(THYROX_D="$R" python3 - <<EOF', // prefijo de entorno de un comando
      'echo "${ANTHROPIC_E:?falta}"',
      '[[ -n "${THYROX_GUARD_LOADED:-}" ]] && return 0', // guarda: por defecto vacío
      'THYROX_LOCAL=0', // asignación local
      'declare -ga THYROX_ARRAY=(', // arreglo local
      '# THYROX_FAMILY_<CLONE> en un comentario', // prosa
      'echo "$THYROX_PLAIN"', // lectura suelta: no se distingue de una local
    ].join('\n')
    expect(extractEnvReads(src, 'sh').map(r => r.name)).toEqual([
      'THYROX_A',
      'THYROX_B',
      'CLAUDE_CODE_C',
      'THYROX_D',
      'ANTHROPIC_E',
    ])
  })

  test('un prefijo de familia (termina en _) no es una variable', () => {
    expect(extractEnvReads("x = os.environ['THYROX_CACHE_']", 'py')).toEqual([])
  })

  test('la marca keep en la línea o en la anterior se registra', () => {
    const src = [
      '# thyrox-rename: keep — credencial del cliente ajeno',
      'unset CLAUDE_CODE_OAUTH_TOKEN',
      'export CLAUDE_CODE_X=1',
    ].join('\n')
    expect(extractEnvReads(src, 'sh').map(r => [r.name, r.keep])).toEqual([
      ['CLAUDE_CODE_OAUTH_TOKEN', true],
      ['CLAUDE_CODE_X', false],
    ])
  })
})

describe('classifyName', () => {
  test('propia, proveedor, cliente ajeno y sin prefijo de producto', () => {
    expect(['THYROX_CODE_X', 'ANTHROPIC_API_KEY', 'CLAUDE_CODE_X', 'CLAUDE_CONFIG_DIR', 'NODE_ENV'].map(classifyName))
      .toEqual(['own', 'provider', 'foreign', 'foreign', 'other'])
  })
})

describe('universos', () => {
  test('producción excluye pruebas, dist, node_modules y referencias', () => {
    expect(isProductionPath('src/packages/x/src/a.ts')).toBe(true)
    expect(isProductionPath('src/session/bg.sh')).toBe(true)
    expect(isProductionPath('src/packages/x/__tests__/a.test.ts')).toBe(false)
    expect(isProductionPath('src/packages/x/dist/a.js')).toBe(false)
    expect(isProductionPath('_references/ccb/a.ts')).toBe(false)
    expect(isProductionPath('tests/verify/a.test.ts')).toBe(false)
  })

  test('pruebas: tests/, __tests__/ y *.test.*', () => {
    expect(isTestPath('tests/session/test-x.sh')).toBe(true)
    expect(isTestPath('src/packages/x/__tests__/y.ts')).toBe(true)
    expect(isTestPath('src/packages/x/src/y.test.ts')).toBe(true)
    expect(isTestPath('src/packages/x/src/y.ts')).toBe(false)
  })
})

describe('uncoveredNames — cada variable propia tiene una prueba que la nombra', () => {
  test('una variable nombrada en una prueba cuenta; una que sólo contiene el nombre, no', () => {
    const tests = ['process.env.THYROX_A = "1"', 'const THYROX_BX = 2']
    expect(uncoveredNames(new Set(['THYROX_A', 'THYROX_B']), tests)).toEqual(['THYROX_B'])
  })
})

describe('compareBaseline', () => {
  test('separa lo nuevo de lo congelado y de lo que ya no existe', () => {
    const r = compareBaseline(new Set(['a', 'b']), new Set(['b', 'c']))
    expect(r).toEqual({ fresh: ['a'], frozen: ['b'], stale: ['c'] })
  })
})

describe('el gate sobre un repositorio', () => {
  const root = mkdtempSync(join(tmpdir(), 'env-prefix-'))
  afterAll(() => rmSync(root, { recursive: true, force: true }))
  const write = (rel: string, text: string) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true })
    writeFileSync(join(root, rel), text)
  }
  const git = (...args: string[]) => Bun.spawnSync(['git', '-C', root, ...args])
  const run = (...args: string[]) => {
    const p = Bun.spawnSync(['bun', GATE, '--root', root, ...args])
    return { code: p.exitCode, out: new TextDecoder().decode(p.stdout) + new TextDecoder().decode(p.stderr) }
  }

  git('init', '-q')
  write('src/a.ts', "const x = process.env.THYROX_OWN\nconst y = process.env.CLAUDE_CODE_OLD\n")
  write('tests/a.test.ts', 'process.env.THYROX_OWN = "1"\n')
  write('src/verify/env_prefix_baseline.tsv', '')
  write('src/verify/env_test_coverage_baseline.tsv', '')
  git('add', '-A')

  test('sin baseline, una lectura CLAUDE_* nueva bloquea y se nombra', () => {
    const r = run('--strict')
    expect(r.code).toBe(1)
    expect(r.out).toContain('src/a.ts\tCLAUDE_CODE_OLD')
  })

  test('congelada, pasa; y una propia sin prueba bloquea', () => {
    expect(run('--write-baseline').code).toBe(0)
    expect(run('--strict').code).toBe(0)
    write('src/b.ts', 'const z = process.env.THYROX_UNTESTED\n')
    git('add', 'src/b.ts')
    const r = run('--strict')
    expect(r.code).toBe(1)
    expect(r.out).toContain('THYROX_UNTESTED')
  })

  test('una entrada del baseline que ya no existe bloquea: el baseline no puede mentir', () => {
    write('tests/b.test.ts', 'process.env.THYROX_UNTESTED = "1"\n')
    write('src/a.ts', 'const x = process.env.THYROX_OWN\n')
    git('add', '-A')
    const r = run('--strict')
    expect(r.code).toBe(1)
    expect(r.out).toContain('obsoleta')
  })

  test('una raíz que no es un repositorio rehúsa con exit 2 y sin cifra', () => {
    const r = Bun.spawnSync(['bun', GATE, '--root', join(root, 'no-existe'), '--strict'])
    expect(r.exitCode).toBe(2)
    expect(new TextDecoder().decode(r.stdout)).not.toMatch(/\d+ lectura/)
  })
})

describe('el propio thyrox', () => {
  test('ninguna lectura de entorno nueva fuera de THYROX_* y ninguna variable propia sin prueba', () => {
    const p = Bun.spawnSync(['bun', GATE, '--root', REPO, '--strict'])
    const out = new TextDecoder().decode(p.stdout) + new TextDecoder().decode(p.stderr)
    expect({ code: p.exitCode, out }).toEqual({ code: 0, out: expect.any(String) })
  })
})
