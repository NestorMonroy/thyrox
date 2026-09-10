/**
 * Porte fiel de `ccnmt: packages/shell/src/execFileNoThrow.ts` (paquete
 * `shell`, licencia UNLICENSED — reimplementación, no copia). Porte
 * COMPLETO: los tres símbolos exportados de la fuente —
 * `execFileNoThrow`, `execFileNoThrowWithCwd` y el re-export de
 * `execSyncWithDefaults`— están todos presentes.
 *
 * Divergencia medida y documentada: la fuente ejecuta el subproceso con
 * `execa` (paquete npm; no resuelve en este árbol —
 * `Bun.resolveSync('execa', <dir>)` falla, no hay `node_modules/execa`).
 * Se reimplementa con `node:child_process.execFile`, que sí resuelve y
 * ya soporta las piezas que este módulo necesita: `shell` (booleano,
 * igual semántica que en execa), `signal` (un `AbortSignal`, equivalente
 * al `cancelSignal` de execa), `timeout`, `maxBuffer`, `cwd`, `env`.
 *
 * Tres diferencias de forma con el objeto `result` de execa:
 *
 * 1. execa expone `result.failed`/`result.exitCode`/`result.stdout` en
 *    un solo objeto que SIEMPRE llega (con `reject: false`); `execFile`
 *    de Node pasa un `error` no nulo al callback cuando el proceso
 *    termina con código distinto de cero, fue matado por una señal, o no
 *    pudo lanzarse (ENOENT) — el código de salida se lee de
 *    `error.code` cuando es numérico.
 * 2. execa's `shortMessage` (un resumen legible) no tiene análogo en el
 *    `Error` plano de Node; se usa `error.message` (más verboso, mismo
 *    rol de "por qué falló" para quien lee `result.error`).
 * 3. `input`/`stdin: 'ignore'` no son opciones de `execFile` — se
 *    aplican escribiendo/cerrando `child.stdin` sobre el `ChildProcess`
 *    que `execFile` devuelve de forma síncrona (mismo proceso, antes de
 *    que el callback corra). `stdin: 'inherit'` no tiene traducción
 *    directa sin pasar a `child_process.spawn` con `stdio` completo — se
 *    deja como el valor por defecto de `execFile` (pipe) y se documenta
 *    aquí como la única omisión de comportamiento del porte.
 *
 * `getCwd` se reapunta a `@thyrox/app-host/bootstrap/cwd.js`; `logError`
 * a `@thyrox/local-observability/log.js`. Ambos paquetes existen y
 * exportan esos símbolos (confirmado leyendo su `package.json` y su
 * fuente), pero el especificador `@thyrox/*` no resuelve todavía en este
 * árbol — la raíz no declara `"workspaces"` (medido con
 * `Bun.resolveSync`, igual que en `execFileNoThrowPortable.ts`, hermano
 * de este módulo). `require()` diferido con respaldo — `getCwd` cae a
 * `process.cwd()`, `logError` cae a un no-op — mismo criterio que
 * `permission/src/filesystem.ts` fija con su `_b().foo?.() ?? respaldo`.
 */
import { execFile } from 'node:child_process'

export { execSyncWithDefaults } from './execFileNoThrowPortable.js'

const MS_IN_SECOND = 1000
const SECONDS_IN_MINUTE = 60

type ExecFileOptions = {
  abortSignal?: AbortSignal
  timeout?: number
  preserveOutputOnError?: boolean
  useCwd?: boolean
  env?: NodeJS.ProcessEnv
  stdin?: 'ignore' | 'inherit' | 'pipe'
  input?: string
}

type ExecFileResult = {
  stdout: string
  stderr: string
  code: number
  error?: string
}

function requireAppHostCwd(): { getCwd: () => string } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/app-host/bootstrap/cwd.js')
}

function getCwdDeferred(): string {
  try {
    return requireAppHostCwd().getCwd()
  } catch {
    return process.cwd()
  }
}

function requireLocalObservabilityLog(): { logError: (error: unknown) => void } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/local-observability/log.js')
}

function logErrorDeferred(error: unknown): void {
  try {
    requireLocalObservabilityLog().logError(error)
  } catch {
    // Sin sumidero de logging disponible en este árbol todavía: no hay
    // nada seguro que hacer salvo callar (la fuente tampoco propaga el
    // error de logging — sólo registra y sigue).
  }
}

export function execFileNoThrow(
  file: string,
  args: string[],
  options: ExecFileOptions = {
    timeout: 10 * SECONDS_IN_MINUTE * MS_IN_SECOND,
    preserveOutputOnError: true,
    useCwd: true,
  },
): Promise<ExecFileResult> {
  return execFileNoThrowWithCwd(file, args, {
    abortSignal: options.abortSignal,
    timeout: options.timeout,
    preserveOutputOnError: options.preserveOutputOnError,
    cwd: options.useCwd ? getCwdDeferred() : undefined,
    env: options.env,
    stdin: options.stdin,
    input: options.input,
  })
}

type ExecFileWithCwdOptions = {
  abortSignal?: AbortSignal
  timeout?: number
  preserveOutputOnError?: boolean
  maxBuffer?: number
  cwd?: string
  env?: NodeJS.ProcessEnv
  shell?: boolean | string | undefined
  stdin?: 'ignore' | 'inherit' | 'pipe'
  input?: string
}

function getErrorMessage(error: NodeJS.ErrnoException, errorCode: number): string {
  if (error.message) return error.message
  if (typeof error.signal === 'string') return error.signal
  return String(errorCode)
}

function getErrorCode(error: NodeJS.ErrnoException): number {
  return typeof error.code === 'number' ? error.code : 1
}

export function execFileNoThrowWithCwd(
  file: string,
  args: string[],
  {
    abortSignal,
    timeout: finalTimeout = 10 * SECONDS_IN_MINUTE * MS_IN_SECOND,
    preserveOutputOnError: finalPreserveOutput = true,
    cwd: finalCwd,
    env: finalEnv,
    maxBuffer,
    shell,
    stdin: finalStdin,
    input: finalInput,
  }: ExecFileWithCwdOptions = {
    timeout: 10 * SECONDS_IN_MINUTE * MS_IN_SECOND,
    preserveOutputOnError: true,
    maxBuffer: 1_000_000,
  },
): Promise<ExecFileResult> {
  return new Promise(resolve => {
    let settled = false
    const settle = (result: ExecFileResult): void => {
      if (settled) return
      settled = true
      resolve(result)
    }

    try {
      const child = execFile(
        file,
        args,
        {
          cwd: finalCwd,
          env: finalEnv,
          timeout: finalTimeout,
          maxBuffer: maxBuffer ?? 1_000_000,
          shell,
          signal: abortSignal,
          encoding: 'utf8',
        },
        (error, stdout, stderr) => {
          if (error) {
            const errorCode = getErrorCode(error as NodeJS.ErrnoException)
            if (finalPreserveOutput) {
              settle({
                stdout: stdout || '',
                stderr: stderr || '',
                code: errorCode,
                error: getErrorMessage(error as NodeJS.ErrnoException, errorCode),
              })
            } else {
              settle({ stdout: '', stderr: '', code: errorCode })
            }
            return
          }
          settle({ stdout, stderr, code: 0 })
        },
      )

      if (finalInput !== undefined) {
        child.stdin?.end(finalInput)
      } else if (finalStdin === 'ignore') {
        child.stdin?.end()
      }
    } catch (error) {
      logErrorDeferred(error)
      settle({ stdout: '', stderr: '', code: 1 })
    }
  })
}
