/**
 * Control del paquete `@thyrox/task` en `src/packages/task/`.
 *
 * Historia, porque el control cambió de sujeto dos veces y conviene que se
 * lea:
 *
 * 1. Controlaba una EXTRACCIÓN: que `tasks` saliera del bucle a un paquete.
 * 2. Pasó a controlar su DISOLUCIÓN en `src/task/`. El análisis de la
 *    referencia (`analisis-flujo-de-tareas-en-ccnmt.rst`) midió cero paquetes
 *    con el nombre del sujeto, y la forma elegida fue una raíz por rol, con los
 *    módulos TypeScript junto a sus hermanos Python.
 * 3. Directiva del ejecutor 2026-09-27: *«lo que está dentro de
 *    thyrox/src/packages/ se tiene que quedar»*, precisada como mudar los
 *    cinco sueltos (`paths`, `store`, `task`, `coordination`, `workbench`) a
 *    `src/packages/`, y confirmada frente a la decisión anterior: *«son
 *    paquetes»*. La cara TypeScript es el paquete `@thyrox/task`; la cara
 *    Python se queda en `src/task/`, porque es un paquete Python importado por
 *    nombre (`from task import …`).
 *
 * Qué haría fallar este control:
 *
 * 1. Que la mudanza fuera una COPIA: un `.ts` que sobreviviera en `src/task/`
 *    divergiría en silencio de su gemelo en el paquete (H-DOCS-1119).
 * 2. Que el paquete no tuviera frontera: sin manifiesto ni `exports`, sus
 *    consumidores volverían a entrar por ruta.
 * 3. Que el agregador de `src/packages/` no lo enumerara.
 * 4. Que un consumidor siguiera importando por ruta en vez de por el nombre.
 * 5. Que la conducta cambiara. Se ejercita `parseRstTasks` con una entrada
 *    real, no con un doble.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('../..', import.meta.url).pathname
const PACKAGE_DIR = join(ROOT, 'src', 'packages', 'task')
const PYTHON_TWIN = join(ROOT, 'src', 'task')
const CLI = join(ROOT, 'src', 'packages', 'cli')

describe('the move is a move, not a copy', () => {
  test('the old plural name did not come back', () => {
    expect(existsSync(join(ROOT, 'src', 'packages', 'tasks'))).toBe(false)
  })

  test('the TypeScript modules live in the package', () => {
    const entries = readdirSync(PACKAGE_DIR)
    // Presencia de los que la mudanza movió, no igualdad exacta: el paquete
    // crece y una igualdad convertiría cada incorporación en un rojo.
    for (const moduleName of ['index.ts', 'io.ts', 'premises.ts', 'rst.ts', 'schema.ts']) {
      expect(entries).toContain(moduleName)
    }
  })

  test('no .ts file stayed next to the Python twin', () => {
    const entries = readdirSync(PYTHON_TWIN)
    expect(entries.filter((f) => f.endsWith('.ts'))).toEqual([])
    // No puede pasar en vacío: el gemelo Python sigue ahí.
    expect(entries.filter((f) => f.endsWith('.py')).length).toBeGreaterThan(0)
  })

  test('no module of the package imports the harness', () => {
    const offenders = readdirSync(PACKAGE_DIR)
      .filter((f) => f.endsWith('.ts'))
      .filter((f) => /@thyrox\/harness|packages\/harness/.test(readFileSync(join(PACKAGE_DIR, f), 'utf8')))
    expect(offenders).toEqual([])
  })
})

describe('the package has a boundary', () => {
  test('declares its name and its exports', () => {
    const m = JSON.parse(readFileSync(join(PACKAGE_DIR, 'package.json'), 'utf8'))
    expect(m.name).toBe('@thyrox/task')
    expect(Object.keys(m.exports ?? {}).length).toBeGreaterThan(0)
  })

  test('the src/packages aggregator lists it', () => {
    const m = JSON.parse(readFileSync(join(ROOT, 'src', 'packages', 'package.json'), 'utf8'))
    expect(m.workspaces).toContain('task')
    expect(m.workspaces).not.toContain('tasks')
  })

  test('the real consumer imports by package name', () => {
    // `checkPremises.ts` es el comando de premisas desde que la tarea #205
    // repartió los comandos del viejo `bin/harness.ts` en `cli/src/commands/`.
    const command = readFileSync(join(CLI, 'src', 'commands', 'checkPremises.ts'), 'utf8')
    expect(command).toContain("from '@thyrox/task/premises.ts'")
    expect(command).not.toMatch(/from '(\.\.\/)+task\//)
  })

  test('the cli does not declare the old name', () => {
    const m = JSON.parse(readFileSync(join(CLI, 'package.json'), 'utf8'))
    expect(Object.keys(m.dependencies ?? {})).not.toContain('@thyrox/tasks')
  })
})

describe('behaviour is preserved', () => {
  test('parseRstTasks still reads a checked box', async () => {
    const { parseRstTasks } = await import('../../src/packages/task/rst.ts')
    const rows = parseRstTasks('- [x] T-001 hecho\n- [ ] T-002 pendiente\n')
    expect(rows.length).toBe(2)
    expect(rows[0]!.done).toBe(true)
    expect(rows[1]!.done).toBe(false)
  })
})
