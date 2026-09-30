/**
 * `projectShape` (TS) y `emit_declarations._project_shape` (Python) derivan
 * el mismo `rootDir` e `include` de cada manifiesto real. Las dos existen
 * mientras `emit_declarations` siga en Python; esta prueba impide que
 * diverjan: si el build JS emitiera bajo otro `rootDir` que las
 * declaraciones, `dist/x.js` y `dist/x.d.ts` quedarían separados.
 *
 * Métrica: `[rootDir, include]` por paquete de `src/packages`, en las dos
 * implementaciones.
 * Ciega a: un manifiesto de forma que ningún paquete real tenga hoy.
 */
import { expect, test } from 'bun:test'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { projectShape } from '../../src/typescript/packageShape.ts'

const ROOT = join(import.meta.dir, '../..')
const PACKAGES = join(ROOT, 'src/packages')

test('projectShape coincide con _project_shape en cada paquete real', () => {
  const dirs = readdirSync(PACKAGES).map(d => join(PACKAGES, d))
    .filter(d => existsSync(join(d, 'package.json'))).sort()
  const python = Bun.spawnSync(['python3', '-c', `
import json, sys
from pathlib import Path
from typescript import emit_declarations as emit
print(json.dumps({d: list(emit._project_shape(Path(d))) for d in sys.argv[1:]}))
`, ...dirs], { cwd: ROOT, env: { ...process.env, PYTHONPATH: join(ROOT, 'src') } })
  expect(python.exitCode).toBe(0)
  const expected = JSON.parse(python.stdout.toString()) as Record<string, [string, string[]]>
  expect(Object.keys(expected).length).toBeGreaterThan(0)
  const mismatches = dirs.filter(d => JSON.stringify(projectShape(d)) !== JSON.stringify(expected[d]))
    .map(d => `${d}: ts=${JSON.stringify(projectShape(d))} py=${JSON.stringify(expected[d])}`)
  expect(mismatches).toEqual([])
})
