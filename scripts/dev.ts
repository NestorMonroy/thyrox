/**
 * El arranque de desarrollo de la CLI: `bun run scripts/dev.ts <args>`.
 *
 * Es el punto de entrada que los smoke tests invocan (`tests/smoke/`),
 * portado con ellos de la fuente. La entrada real de la CLI lee sus
 * argumentos de `process.argv` y rellena `MACRO` en tiempo de ejecución
 * cuando ninguna definición de build lo inyectó.
 *
 * Por qué relanza en vez de importar: `feature()` de `bun:bundle` se resuelve
 * con la bandera `--feature` del propio `bun`, que sólo se da en su línea de
 * comando. Importada desde aquí, la entrada ve todas las banderas apagadas y
 * las rutas rápidas que dependen de ellas (`--bg-detached`, `ps`, `rm`)
 * desaparecen: `--bg-detached` salía con «unknown option».
 */
import { spawn } from 'node:child_process'
import { join } from 'node:path'

// Las banderas de build que una sesión de desarrollo necesita encendidas.
const DEV_FEATURES = ['BG_SESSIONS']

const CLI_ENTRY = join(import.meta.dirname, '..', 'src/packages/cli/src/entry/cli.tsx')

// Se espera la SALIDA del hijo, no el cierre de sus descriptores: `--bg`
// deja un nieto desprendido que hereda stdio, y `spawnSync` esperaba a que
// ése también terminara.
const child = spawn(
  process.execPath,
  [...DEV_FEATURES.map(name => `--feature=${name}`), 'run', CLI_ENTRY, ...process.argv.slice(2)],
  { stdio: 'inherit' },
)
child.on('error', error => {
  throw error
})
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)))
