/**
 * Cada punto de entrada del paquete carga en un grafo de módulos NUEVO.
 *
 * Un ciclo de importación con un `const` de nivel de módulo no falla siempre:
 * falla según por dónde se entra. `internalPaths` lee `SENSITIVE_FILES` al
 * evaluarse; si la carga empieza por `pathSafety`, el ciclo
 * `pathSafety → ruleMatching → permissions → … → internalPaths` evalúa
 * `internalPaths` antes de que `pathSafety` haya inicializado esa constante.
 * Dentro de un mismo proceso el caché de módulos esconde el orden, así que
 * cada entrada se importa en un subproceso propio.
 */
import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'

const SRC = join(import.meta.dir, '..', 'src')
const ENTRIES = ['pathSafety', 'filesystem', 'internalPaths', 'ruleMatching', 'permission']

function loadInFreshProcess(module: string): { exitCode: number; stderr: string } {
  const run = Bun.spawnSync([process.execPath, '-e', `await import(${JSON.stringify(join(SRC, `${module}.ts`))})`], {
    stderr: 'pipe',
  })
  return { exitCode: run.exitCode, stderr: run.stderr.toString() }
}

describe('carga de cada entrada en un grafo nuevo', () => {
  for (const module of ENTRIES) {
    test(`${module}.ts carga sin error de inicialización`, () => {
      const { exitCode, stderr } = loadInFreshProcess(module)
      expect(stderr).not.toContain('before initialization')
      expect(exitCode).toBe(0)
    })
  }
})
