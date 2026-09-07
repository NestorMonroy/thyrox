/**
 * Porte fiel de `ccnmt: packages/shell/src/execFileNoThrowPortable.ts`
 * (paquete `shell`, licencia UNLICENSED — reimplementación, no copia).
 * Único símbolo exportado: `execSyncWithDefaults`, re-exportado desde
 * `execFileNoThrow.ts` tal como la fuente lo re-exporta desde su propio
 * `execFileNoThrow.ts`.
 *
 * Divergencia medida y documentada: la fuente usa `execaSync` de `execa`
 * (paquete npm; `Bun.resolveSync('execa', <dir>)` falla en este árbol —
 * no hay `node_modules/execa`). Se reimplementa con
 * `node:child_process.execSync`, que sí resuelve. `execaSync` siempre
 * ejecuta a través de un shell cuando se le pasa una única cadena de
 * comando con `shell: true`; `execSync` de Node YA ejecuta siempre por
 * shell (usa `/bin/sh -c` en POSIX, `cmd.exe` en Windows), así que no
 * existe un `shell` que pasar — se omite esa clave de opciones, el
 * comportamiento final (comando corrido vía shell) es el mismo.
 *
 * `execaSync` devuelve `{ stdout, stderr, exitCode }`; `execSync` de Node
 * devuelve directamente el `Buffer`/`string` de stdout (o lanza si el
 * proceso termina con código distinto de cero). Por eso el chequeo de "sin
 * stdout" de la fuente (`if (!result.stdout) return null`) se traduce aquí
 * a comprobar el texto convertido, no la verdad de un objeto — un Buffer
 * vacío sigue siendo un objeto truthy.
 *
 * `getCwd` (`@claude-code-how-works/app-host/bootstrap/cwd.js`) y
 * `slowLogging` (`@claude-code-how-works/local-observability/
 * slowOperations.js`) se reapuntan a sus hermanos `@thyrox/*` — ambos
 * paquetes existen y exportan los símbolos (confirmado leyendo su
 * `package.json` y su fuente). El `require()` es diferido porque el
 * especificador `@thyrox/*` no resuelve TODAVÍA en este árbol: la raíz
 * `/home/user/thyrox/package.json` no declara `"workspaces"`, así que no
 * hay symlinks en `node_modules` que lo satisfagan (medido:
 * `Bun.resolveSync('@thyrox/app-host/bootstrap/cwd.js', <dir>)` →
 * `Cannot find module`). Un `import` estático haría fallar la carga del
 * módulo entero; el `require()` diferido sólo falla si de verdad se llama
 * a la función, y ambos casos caen a un respaldo fiel al de la fuente
 * (`_b().getCwd?.() ?? process.cwd()` en `permission/src/filesystem.ts`,
 * mismo criterio — mismo patrón que `mcp-runtime/headersHelper.ts` en
 * este árbol usa para su propio require diferido).
 */
import { execSync } from 'node:child_process'

const MS_IN_SECOND = 1000
const SECONDS_IN_MINUTE = 60
const DEFAULT_TIMEOUT_MS = 10 * SECONDS_IN_MINUTE * MS_IN_SECOND

type ExecSyncOptions = {
  abortSignal?: AbortSignal
  timeout?: number
  input?: string
  stdio?: 'pipe' | 'ignore' | 'inherit' | Array<'pipe' | 'ignore' | 'inherit'>
}

type Disposer = Disposable

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

type SlowLoggingTag = (strings: TemplateStringsArray, ...values: unknown[]) => Disposer

function requireSlowOperations(): { slowLogging: SlowLoggingTag } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@thyrox/local-observability/slowOperations.js')
}

function noopDisposable(): Disposer {
  return { [Symbol.dispose]() {} }
}

function slowLoggingDeferred(): SlowLoggingTag {
  try {
    return requireSlowOperations().slowLogging
  } catch {
    return noopDisposable
  }
}

/**
 * @todo Migrar a los llamadores a `node:child_process.exec`/`execFile`
 * de forma directa (asíncrona) — la ejecución síncrona bloquea el event
 * loop.
 */
export function execSyncWithDefaults(command: string): string | null
export function execSyncWithDefaults(
  command: string,
  options: ExecSyncOptions,
): string | null
export function execSyncWithDefaults(
  command: string,
  abortSignal: AbortSignal,
  timeout?: number,
): string | null
export function execSyncWithDefaults(
  command: string,
  optionsOrAbortSignal?: ExecSyncOptions | AbortSignal,
  timeout = DEFAULT_TIMEOUT_MS,
): string | null {
  let options: ExecSyncOptions

  if (optionsOrAbortSignal === undefined) {
    options = {}
  } else if (optionsOrAbortSignal instanceof AbortSignal) {
    options = { abortSignal: optionsOrAbortSignal, timeout }
  } else {
    options = optionsOrAbortSignal
  }

  const {
    abortSignal,
    timeout: finalTimeout = DEFAULT_TIMEOUT_MS,
    input,
    stdio = ['ignore', 'pipe', 'pipe'],
  } = options

  abortSignal?.throwIfAborted()
  using _slowSpan = slowLoggingDeferred()`exec: ${command.slice(0, 200)}`
  try {
    const result = execSync(command, {
      env: process.env,
      maxBuffer: 1_000_000,
      timeout: finalTimeout,
      cwd: getCwdDeferred(),
      stdio,
      input,
    })
    const stdout = result.toString()
    return stdout.trim() || null
  } catch {
    return null
  }
}
