/**
 * Retira la extensión de configuración por árbol cuando ya no queda nadie que
 * la use.
 *
 * Procedencia: `ccnmt: packages/swarm/src/worktree/sparseConfigCleanup.ts`
 * (25 líneas, 1 símbolo exportado). Ese árbol declara `"license":
 * "UNLICENSED"`, así que el cuerpo se **reimplementa** y no se copia.
 *
 * QUÉ RESUELVE. Un compañero que trabaja en su propio worktree necesita
 * `extensions.worktreeConfig` activada para tener un checkout parcial propio.
 * Esa extensión es del repositorio, no del árbol: encenderla para uno la
 * enciende para todos. Al cerrar el último árbol auxiliar hay que apagarla, o
 * queda encendida para siempre sin que nadie sepa por qué.
 *
 * LAS DOS GUARDAS, y las dos protegen contra romper a otro:
 *
 * 1. **Queda más de un árbol** — apagarla con otro vivo le rompería SU
 *    configuración por árbol. La limpieza sólo es segura cuando no queda nadie.
 * 2. **El árbol principal usa checkout parcial** — apagarla rompería el
 *    recorte que el usuario configuró a mano, que no lo puso este código.
 *
 * DIVERGENCIA DECLARADA: ninguna.
 */
import { execFileNoThrowWithCwd, gitExe } from '../adapters/appRuntime.js'

export async function cleanupSparseWorktreeConfig(
  gitRoot: string,
): Promise<void> {
  const worktrees = await execFileNoThrowWithCwd(
    gitExe(),
    ['worktree', 'list', '--porcelain'],
    { cwd: gitRoot },
  )
  // El formato porcelain abre cada árbol con una línea `worktree <ruta>`, así
  // que contarlas cuenta árboles. Un fallo del comando se trata como «no sé
  // cuántos hay» y aborta: apagar la extensión a ciegas es lo caro.
  const count = worktrees.stdout
    .split('\n')
    .filter((line: string) => line.startsWith('worktree ')).length
  if (worktrees.code !== 0 || count > 1) return

  const mainSparse = await execFileNoThrowWithCwd(
    gitExe(),
    ['config', '--worktree', '--get', 'core.sparseCheckout'],
    { cwd: gitRoot },
  )
  if (mainSparse.stdout.trim() === 'true') return

  await execFileNoThrowWithCwd(
    gitExe(),
    ['config', '--unset', 'extensions.worktreeConfig'],
    { cwd: gitRoot },
  )
}
