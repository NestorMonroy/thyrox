/**
 * Puerto de `ccnmt: packages/memory/src/projectGitInfo.ts` (verbatim — sin
 * dependencias).
 *
 * V7 §8.5 — `projectIsInGitRepo`: chequeo síncrono de presencia de repo git.
 *
 * Movido desde `src/utils/memory/versions.ts`. La lógica de `findGitRoot`
 * se inlineó para mantener a `memory` como hoja de Wave-2 sin dependencia
 * de `src/`. Deliberadamente NO reusa `@thyrox/storage`'s `findGitRoot.ts`
 * — la fuente ya declara esta duplicación como intencional (leaf src/-free).
 *
 * Para chequeos de git asíncronos, el host cablea una implementación más
 * rica vía `MemoryHostBindings`.
 */

import { existsSync, statSync } from 'node:fs'
import { dirname, parse, resolve } from 'node:path'

/**
 * Recorre los directorios padre buscando una entrada `.git` (archivo o
 * directorio). Devuelve el directorio que la contiene, o null si no
 * aparece ninguna.
 */
function findGitRoot(cwd: string): string | null {
  let current = resolve(cwd)
  const root = parse(current).root
  for (;;) {
    const candidate = `${current}/.git`
    try {
      if (existsSync(candidate)) {
        // Puede ser un archivo (puntero de worktree) o un directorio —
        // ambos indican un repo git.
        statSync(candidate)
        return current
      }
    } catch {
      // ignorar errores de stat
    }
    if (current === root) return null
    const parent = dirname(current)
    if (parent === current) return null
    current = parent
  }
}

/**
 * Nota: usado para verificar el estado de repo git de forma síncrona.
 * Recorre el filesystem (sin subproceso). Preferir chequeos asíncronos vía
 * `MemoryHostBindings.getGithubRepo` o similar para código de producción.
 */
export function projectIsInGitRepo(cwd: string): boolean {
  return findGitRoot(cwd) !== null
}
