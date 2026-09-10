/**
 * Puerto de `ccnmt: packages/storage/src/getWorktreePaths.ts` (61 líneas
 * fuente). Tres dependencias hermanas ausentes, reimplementadas
 * PRIVADAMENTE con inyección de dependencias (setter `setXFn`, mismo
 * patrón que ya usa `./internal/pendingCrossPackageDeps.ts`):
 *
 *  - `gitExe` (`./git.js` en la fuente) — el `git.ts` YA portado en este
 *    árbol es un porte PARCIAL (sólo `normalizeGitRemoteUrl`, ver su
 *    package.json) y no declara `gitExe`; no es uno de mis 14 módulos
 *    asignados, así que no se toca. Se reimplementa aquí como
 *    `() => 'git'` — la fuente resuelve el ejecutable configurado en
 *    settings (`tools.gitPath` o similar); sin ese subsistema, el
 *    binario `git` del `PATH` es el valor por defecto razonable. Setter
 *    `setGitExeFn` para test.
 *  - `execFileNoThrowWithCwd` (`@claude-code-how-works/shell/
 *    execFileNoThrow.js`) — la fuente usa `execa` (npm, no instalado) con
 *    ocho opciones (timeout, abortSignal, env, shell, stdin/input,
 *    maxBuffer). Se reimplementa con `child_process.execFile` nativo,
 *    aceptando sólo `cwd` y `preserveOutputOnError` — las dos únicas
 *    opciones que este archivo pasa. Mismo contrato observable: nunca
 *    lanza, siempre resuelve `{stdout, stderr, code}`, y con
 *    `preserveOutputOnError: false` blanquea stdout/stderr en fallo
 *    (verificado contra el cuerpo real de la fuente, que hace
 *    exactamente eso en su rama `result.failed`).
 *  - `logEvent` (`@claude-code-how-works/local-observability`, paquete
 *    ausente por completo) — no-op con setter `setLogEventFn`, para poder
 *    verificar en el test qué se intentó loguear sin el subsistema real
 *    de analytics.
 *
 * El resto —incluida la lógica de ordenar el worktree actual primero y el
 * resto alfabéticamente— es porte fiel.
 */
import { sep } from 'path'
import { execFile as execFileCb } from 'child_process'

// ---------------------------------------------------------------------------
// Sustitutos — ver docstring del archivo.
// ---------------------------------------------------------------------------

let _gitExe: () => string = () => 'git'
export function setGitExeFn(fn: () => string): void {
  _gitExe = fn
}

export type ExecFileNoThrowResult = {
  stdout: string
  stderr: string
  code: number
}

let _execFileNoThrowWithCwd: (
  file: string,
  args: string[],
  opts: { cwd: string; preserveOutputOnError?: boolean },
) => Promise<ExecFileNoThrowResult> = (file, args, opts) =>
  new Promise(resolve => {
    execFileCb(
      file,
      args,
      { cwd: opts.cwd, encoding: 'utf8' },
      (error, stdout, stderr) => {
        if (!error) {
          resolve({ stdout, stderr, code: 0 })
          return
        }
        const code =
          typeof (error as NodeJS.ErrnoException & { code?: unknown }).code ===
          'number'
            ? ((error as unknown as { code: number }).code as number)
            : 1
        if (opts.preserveOutputOnError === false) {
          resolve({ stdout: '', stderr: '', code })
        } else {
          resolve({ stdout: stdout ?? '', stderr: stderr ?? '', code })
        }
      },
    )
  })
export function setExecFileNoThrowWithCwdFn(
  fn: typeof _execFileNoThrowWithCwd,
): void {
  _execFileNoThrowWithCwd = fn
}

let _logEvent: (name: string, payload: Record<string, unknown>) => void =
  () => {}
export function setLogEventFn(
  fn: (name: string, payload: Record<string, unknown>) => void,
): void {
  _logEvent = fn
}

// ---------------------------------------------------------------------------
// El módulo real.
// ---------------------------------------------------------------------------

/**
 * Devuelve las rutas de todos los worktrees del repositorio git actual.
 * Si git no está disponible, no estamos en un repo git, o sólo hay un
 * worktree, devuelve un arreglo vacío.
 *
 * Esta versión incluye tracking de analytics y usa el resolver gitExe()
 * del CLI. Para una versión portable sin dependencias del CLI, usar
 * getWorktreePathsPortable().
 *
 * @param cwd Directorio desde el que correr el comando
 * @returns Arreglo de rutas absolutas de worktree
 */
export async function getWorktreePaths(cwd: string): Promise<string[]> {
  const startTime = Date.now()

  const { stdout, code } = await _execFileNoThrowWithCwd(
    _gitExe(),
    ['worktree', 'list', '--porcelain'],
    {
      cwd,
      preserveOutputOnError: false,
    },
  )

  const durationMs = Date.now() - startTime

  if (code !== 0) {
    _logEvent('tengu_worktree_detection', {
      duration_ms: durationMs,
      worktree_count: 0,
      success: false,
    })
    return []
  }

  const worktreePaths = stdout
    .split('\n')
    .filter(line => line.startsWith('worktree '))
    .map(line => line.slice('worktree '.length).normalize('NFC'))

  _logEvent('tengu_worktree_detection', {
    duration_ms: durationMs,
    worktree_count: worktreePaths.length,
    success: true,
  })

  // Ordena worktrees: el actual primero, luego alfabéticamente.
  const currentWorktree = worktreePaths.find(
    path => cwd === path || cwd.startsWith(path + sep),
  )
  const otherWorktrees = worktreePaths
    .filter(path => path !== currentWorktree)
    .sort((a, b) => a.localeCompare(b))

  return currentWorktree ? [currentWorktree, ...otherWorktrees] : otherWorktrees
}
