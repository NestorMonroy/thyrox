/**
 * El `Io` real del selector de impacto y la lectura de cambios (T-050).
 *
 * Fuente: diseño nativo. El selector no toca disco a propósito (vive en
 * `impact.ts`); este archivo prueba el `Io` que sí lee git, con su lectura de
 * rutas cambiadas medida, no fabricada.
 */

import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { changedPaths, fsIo } from '../src/testing/io.ts'
import { selectTests, type ImpactConfig } from '../src/testing/impact.ts'

/** Un repo git de verdad: los cambios se leen de git, no de una lista fabricada. */
function repo(): string {
  const d = mkdtempSync(join(tmpdir(), 'impact-'))
  Bun.spawnSync(['git', 'init', '-q'], { cwd: d })
  Bun.spawnSync(['git', 'config', 'user.email', 't@t'], { cwd: d })
  Bun.spawnSync(['git', 'config', 'user.name', 't'], { cwd: d })
  mkdirSync(join(d, 'src'), { recursive: true })
  mkdirSync(join(d, '__tests__'), { recursive: true })
  writeFileSync(join(d, 'src', 'loop.ts'), 'export const a = 1\n')
  writeFileSync(join(d, 'src', 'types.ts'), 'export type T = 1\n')
  writeFileSync(join(d, '__tests__', 'loop.test.ts'), "import '../src/loop.ts'\n")
  writeFileSync(join(d, '__tests__', 'otro.test.ts'), "import '../src/nada.ts'\n")
  Bun.spawnSync(['git', 'add', '-A'], { cwd: d })
  Bun.spawnSync(['git', 'commit', '-qm', 'seed'], { cwd: d })
  return d
}

const conf: ImpactConfig = {
  strategy: 'text-reference',
  runner: (r) => `bun test ${r.join(' ')}`,
  fullRunner: 'bun test',
  crossCutting: ['src/types.ts'],
}

describe('changedPaths — los cambios salen de git, no de memoria (T-050)', () => {
  test('un repo limpio no reporta ningún cambio', () => {
    expect(changedPaths(repo())).toEqual([])
  })

  test('ve el archivo modificado', () => {
    const d = repo()
    writeFileSync(join(d, 'src', 'loop.ts'), 'export const a = 2\n')
    expect(changedPaths(d)).toEqual(['src/loop.ts'])
  })

  // El defecto medido de `git status --porcelain` sin `-uall`: un directorio
  // nuevo se reporta ENTERO como `?? dir/`, sin listar lo de adentro. Un
  // selector ciego a eso no correría ninguna prueba de un módulo recién
  // creado -- y su silencio se leería como "no hay impacto".
  test('ve un archivo dentro de un directorio NUEVO, no sólo el directorio', () => {
    const d = repo()
    mkdirSync(join(d, 'src', 'nuevo'), { recursive: true })
    writeFileSync(join(d, 'src', 'nuevo', 'loop.ts'), 'export const b = 1\n')
    expect(changedPaths(d)).toContain('src/nuevo/loop.ts')
    expect(changedPaths(d)).not.toContain('src/nuevo/')
  })

  test('ve también lo que ya está en staging', () => {
    const d = repo()
    writeFileSync(join(d, 'src', 'loop.ts'), 'export const a = 3\n')
    Bun.spawnSync(['git', 'add', '-A'], { cwd: d })
    expect(changedPaths(d)).toEqual(['src/loop.ts'])
  })
})

describe('fsIo — el denominador sale del disco', () => {
  test('lista las pruebas por el glob del proyecto y las lee', () => {
    const d = repo()
    const io = fsIo(d, '__tests__/**/*.test.ts')
    expect(io.listTests().sort()).toEqual(['__tests__/loop.test.ts', '__tests__/otro.test.ts'])
    expect(io.read('__tests__/loop.test.ts')).toContain('loop.ts')
  })

  test('un glob que no casa con nada da denominador 0, no un error', () => {
    expect(fsIo(repo(), 'pruebas/**/*.spec.ts').listTests()).toEqual([])
  })
})

describe('la vía completa: git → selector', () => {
  test('un cambio acotado selecciona su prueba y deja fuera la otra', () => {
    const d = repo()
    writeFileSync(join(d, 'src', 'loop.ts'), 'export const a = 9\n')
    const r = selectTests(changedPaths(d), conf, fsIo(d, '__tests__/**/*.test.ts'))
    expect(r.subset).toEqual(['__tests__/loop.test.ts'])
    expect(r.denominator).toEqual({ selected: 1, total: 2 })
  })

  test('un cambio transversal fuerza la completa y nombra la regla', () => {
    const d = repo()
    writeFileSync(join(d, 'src', 'types.ts'), 'export type T = 2\n')
    const r = selectTests(changedPaths(d), conf, fsIo(d, '__tests__/**/*.test.ts'))
    expect(r.crossCutting).toEqual({ triggered: true, byPath: 'src/types.ts', rule: 'src/types.ts' })
    expect(r.command).toBe('bun test')
  })
})

describe('bin/harness.ts --select-tests', () => {
  const BIN = join(import.meta.dir, '..', 'bin', 'harness.ts')
  const conSettings = (d: string) => {
    mkdirSync(join(d, '.claude'), { recursive: true })
    writeFileSync(join(d, '.claude', 'settings.json'), JSON.stringify({
      testImpact: { strategy: 'text-reference', testGlob: '__tests__/**/*.test.ts',
        runner: 'bun test', fullRunner: 'bun test', crossCutting: ['src/types.ts'] },
    }))
    return d
  }

  test('imprime el comando derivado SIN ejecutarlo, con denominador y ceguera', () => {
    const d = conSettings(repo())
    writeFileSync(join(d, 'src', 'loop.ts'), 'export const a = 4\n')
    const p = Bun.spawnSync(['bun', 'run', BIN, '--select-tests', '--cwd', d])
    expect(p.exitCode).toBe(0)
    const s = p.stdout.toString()
    expect(s).toContain('bun test __tests__/loop.test.ts')
    expect(s).toContain('1 de 2')
    expect(s).toMatch(/Ciega a:/)
    expect(s).toMatch(/Métrica:/)
  })

  test('sin cambios lo dice en vez de proponer un comando vacío', () => {
    const p = Bun.spawnSync(['bun', 'run', BIN, '--select-tests', '--cwd', conSettings(repo())])
    expect(p.exitCode).toBe(0)
    expect(p.stdout.toString()).toMatch(/sin cambios|nada que correr/i)
    expect(p.stdout.toString()).not.toContain('bun test __tests__')
  })

  test('un cambio transversal propone la suite completa y dice por qué', () => {
    const d = conSettings(repo())
    writeFileSync(join(d, 'src', 'types.ts'), 'export type T = 3\n')
    const s = Bun.spawnSync(['bun', 'run', BIN, '--select-tests', '--cwd', d]).stdout.toString()
    expect(s).toContain('src/types.ts')
    expect(s).toMatch(/transversal/i)
  })

  // Sin configuración NO adivina: un default inventado seleccionaría por una
  // convención que este repo puede no seguir, y su subconjunto se leería como
  // derivado cuando sería adivinado.
  test('sin testImpact en settings rehúsa y dice qué falta', () => {
    const p = Bun.spawnSync(['bun', 'run', BIN, '--select-tests', '--cwd', repo()])
    expect(p.exitCode).not.toBe(0)
    expect(p.stderr.toString()).toContain('testImpact')
  })
})
