/**
 * Los modos ligeros no pasan por `main.tsx` (#180).
 *
 * Medido en el análisis de arranque (#130): `thyrox providers list` cargaba
 * 4627 módulos —el REPL, el agente, el MITM— para leer una tabla, cuando el
 * comando por sí solo carga 86. `cli.tsx` ya tiene caminos rápidos para
 * `--version` y los modos de puente; `providers` y `mitm` son autocontenidos
 * (un código de salida, sin preámbulo compartido) y reciben el mismo trato.
 *
 * Qué lo haría fallar: que `cli.tsx` deje de consultar `runLightMode` antes de
 * importar `main.tsx`. El caso de extremo a extremo lo ve por el número de
 * módulos cargados, no por la salida: el comando responde igual por los dos
 * caminos, y sólo el costo distingue cuál se tomó.
 */
import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'

import { lightModeFor, runLightMode } from '../src/entry/lightModes.ts'

const ENTRY = join(import.meta.dir, '..', 'src', 'entry', 'cli.tsx')
const PRELOAD = join(import.meta.dir, 'fixtures', 'countLoadedModules.ts')
/** Muy por encima de lo que un comando autocontenido carga; muy por debajo del arranque completo. */
const LIGHT_MODULE_BUDGET = 1000

function runEntry(args: string[]) {
  const done = Bun.spawnSync(['bun', '--preload', PRELOAD, ENTRY, ...args], {
    stdin: 'ignore',
    env: { ...process.env, THYROX_CODE_PROFILE_STARTUP: '' },
  })
  const stderr = done.stderr.toString()
  const loaded = Number(/LOADED_MODULES=(\d+)/.exec(stderr)?.[1] ?? Number.NaN)
  return { exitCode: done.exitCode, stdout: done.stdout.toString(), stderr, loaded }
}

describe('modos ligeros', () => {
  test('providers y mitm son ligeros; el resto no', () => {
    expect(lightModeFor(['providers', 'list'])).toBeDefined()
    expect(lightModeFor(['mitm', 'status'])).toBeDefined()
    expect(lightModeFor(['chat'])).toBeUndefined()
    expect(lightModeFor([])).toBeUndefined()
    expect(lightModeFor(['toString'])).toBeUndefined()
  })

  test('un modo que no es ligero no se ejecuta aquí', async () => {
    expect(await runLightMode(['chat'])).toBeUndefined()
  })

  test('cli.tsx resuelve providers sin cargar el arranque completo', () => {
    const run = runEntry(['providers', 'no-such-verb'])
    expect(run.exitCode).toBe(2)
    expect(run.stdout + run.stderr).toContain("unknown verb 'no-such-verb'")
    expect(run.loaded).toBeLessThan(LIGHT_MODULE_BUDGET)
  }, 60_000)
})
