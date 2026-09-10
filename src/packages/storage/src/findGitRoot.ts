/**
 * Puerto COMPLETO de `ccnmt: packages/storage/src/findGitRoot.ts` (88
 * líneas fuente). Una dependencia hermana se resuelve reusando lo que ya
 * existe en este árbol, ninguna se reimplementa a mano:
 *
 *   - `memoizeWithLRU` (`@claude-code-how-works/config/memoize.js` en la
 *     fuente) — se importa de `./internal/pendingCrossPackageDeps.js`
 *     (sustituto ya presente en este mismo paquete, con Map-LRU, ver su
 *     docstring). NO se duplica esa lógica aquí.
 *   - `logForDiagnosticsNoPII` (`@claude-code-how-works/local-observability
 *     /logging`) — paquete ausente por completo del árbol. Se reimplementa
 *     PRIVADAMENTE como no-op con un setter de inyección de dependencias
 *     (mismo patrón `setXFn` que ya usa `pendingCrossPackageDeps.ts` para
 *     `setGetCwdFn`), para poder verificar en el test qué se intentó
 *     loguear sin necesitar el subsistema de diagnóstico real.
 *
 * Reconciliación (tarea #208): este archivo YA estaba reimplementado como
 * una función PRIVADA dentro de `./projectPurge.ts` — fiel al algoritmo,
 * SIN el memoize-LRU ni el logging de diagnóstico (ver su docstring: "sin
 * el memoize-LRU ni el logging de diagnóstico de la fuente, ningún test
 * los ejercita, y ninguno de los dos cambia el resultado"). Con el módulo
 * real aquí, `projectPurge.ts` pasa a IMPORTAR desde este archivo y su
 * copia privada se retira — ver el commit de reconciliación.
 */
import { statSync } from 'fs'
import { dirname, join, resolve, sep } from 'path'
import { memoizeWithLRU } from './internal/pendingCrossPackageDeps.js'

export type FindGitRootLogPayload = {
  duration_ms: number
  stat_count: number
  found: boolean
}

let _logDiagnostics: (event: string, payload?: FindGitRootLogPayload) => void =
  () => {}

/** Inyección de dependencias para test — ver docstring del archivo. */
export function setFindGitRootDiagnosticsFn(
  fn: (event: string, payload?: FindGitRootLogPayload) => void,
): void {
  _logDiagnostics = fn
}

const GIT_ROOT_NOT_FOUND = Symbol('git-root-not-found')

const findGitRootImpl = memoizeWithLRU(
  (startPath: string): string | typeof GIT_ROOT_NOT_FOUND => {
    const startTime = Date.now()
    _logDiagnostics('find_git_root_started')

    let current = resolve(startPath)
    const root = current.substring(0, current.indexOf(sep) + 1) || sep
    let statCount = 0

    while (current !== root) {
      try {
        const gitPath = join(current, '.git')
        statCount++
        const stat = statSync(gitPath)
        if (stat.isDirectory() || stat.isFile()) {
          _logDiagnostics('find_git_root_completed', {
            duration_ms: Date.now() - startTime,
            stat_count: statCount,
            found: true,
          })
          return current.normalize('NFC')
        }
      } catch {
        // .git no existe en este nivel, seguir subiendo
      }
      const parent = dirname(current)
      if (parent === current) {
        break
      }
      current = parent
    }

    try {
      const gitPath = join(root, '.git')
      statCount++
      const stat = statSync(gitPath)
      if (stat.isDirectory() || stat.isFile()) {
        _logDiagnostics('find_git_root_completed', {
          duration_ms: Date.now() - startTime,
          stat_count: statCount,
          found: true,
        })
        return root.normalize('NFC')
      }
    } catch {
      // .git no existe en la raíz
    }

    _logDiagnostics('find_git_root_completed', {
      duration_ms: Date.now() - startTime,
      stat_count: statCount,
      found: false,
    })
    return GIT_ROOT_NOT_FOUND
  },
  path => path,
  50,
)

/**
 * Encuentra la raíz de git subiendo por el árbol de directorios. Busca un
 * directorio o archivo `.git` (los worktrees/submódulos usan un archivo).
 * Devuelve el directorio que contiene `.git`, o `null` si no lo encuentra.
 *
 * Divergencia declarada: la fuente expone `findGitRoot.cache` (el caché LRU
 * de la librería real) porque `cli/setup.ts` lo menciona en un comentario —
 * ningún código lo LEE ni lo LLAMA (`grep` sobre el árbol fuente, 0 hits de
 * uso real). El sustituto `memoizeWithLRU` de este paquete no expone
 * `.cache` (ver su docstring en `internal/pendingCrossPackageDeps.ts`), así
 * que aquí `findGitRoot` es una función simple, sin esa propiedad.
 */
export function findGitRoot(startPath: string): string | null {
  const result = findGitRootImpl(startPath)
  return result === GIT_ROOT_NOT_FOUND ? null : result
}
