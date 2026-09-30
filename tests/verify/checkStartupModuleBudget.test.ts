/**
 * `checkStartupModuleBudget`: cada camino de arranque carga a lo sumo los
 * módulos que su baseline declara (TASK-THYROX-0437).
 *
 * Los módulos se miden en un proceso aparte por camino: `require.cache` de un
 * proceso que ya importó otro camino contaría los dos.
 *
 * Control de anulación: con `compareBudget` devolviendo siempre cero
 * violaciones caen exactamente los casos 2 y 5, los que exigen que un camino
 * por encima de su tope se reporte.
 */
import { afterAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { compareBudget, measureModuleCount } from '../../src/verify/checkStartupModuleBudget.ts'

const GATE = resolve(import.meta.dir, '../../src/verify/checkStartupModuleBudget.ts')
const work = mkdtempSync(join(tmpdir(), 'module-budget-'))
afterAll(() => rmSync(work, { recursive: true, force: true }))

// Un camino de arranque diminuto: la entrada importa dos módulos propios.
const fixture = join(work, 'fixture')
mkdirSync(fixture)
writeFileSync(join(fixture, 'a.ts'), 'export const a = 1\n')
writeFileSync(join(fixture, 'b.ts'), 'export const b = 2\n')
writeFileSync(join(fixture, 'entry.ts'), "import { a } from './a.ts'\nimport { b } from './b.ts'\nexport const sum = a + b\n")
const entry = join(fixture, 'entry.ts')

function writeBaseline(name: string, budget: number, path = entry): string {
  const file = join(work, `${name}.json`)
  writeFileSync(file, JSON.stringify({ paths: { fixture: { entry: path, budget } } }))
  return file
}

function runGate(...args: string[]) {
  const result = Bun.spawnSync([process.execPath, GATE, '--root', work, ...args])
  return { exit: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() }
}

describe('medir y comparar', () => {
  test('1. un camino dentro de su tope no es una violación', () => {
    expect(compareBudget({ fixture: 10 }, { fixture: { entry, budget: 10 } })).toEqual([])
  })

  test('2. un camino por encima de su tope se reporta con su cifra y su tope', () => {
    expect(compareBudget({ fixture: 11 }, { fixture: { entry, budget: 10 } }))
      .toEqual([{ path: 'fixture', measured: 11, budget: 10 }])
  })

  test('3. la medición cuenta la entrada y los módulos que importa', () => {
    const count = measureModuleCount(entry)
    expect(count).not.toBeNull()
    expect(count!).toBeGreaterThanOrEqual(3)
  })

  test('4. una entrada que no se puede importar no tiene cifra', () => {
    expect(measureModuleCount(join(fixture, 'missing.ts'))).toBeNull()
  })
})

describe('el gate', () => {
  test('5. --strict sale 1 si un camino supera su tope, y lo nombra', () => {
    const result = runGate('--baseline', writeBaseline('tight', 1), '--strict')
    expect(result.exit).toBe(1)
    expect(result.stdout).toContain('fixture')
  })

  test('6. dentro del tope sale 0 y publica la cifra con su tope', () => {
    const result = runGate('--baseline', writeBaseline('loose', 1000), '--strict')
    expect(result.exit).toBe(0)
    expect(result.stdout).toMatch(/fixture\s+\d+ de 1000/)
  })

  test('7. si un camino no se puede medir, rehúsa con exit 2 y sin cifra', () => {
    const result = runGate('--baseline', writeBaseline('broken', 10, join(fixture, 'missing.ts')), '--strict')
    expect(result.exit).toBe(2)
    expect(result.stdout).not.toMatch(/\d+ de 10/)
    expect(result.stderr).toContain('fixture')
  })
})
