/**
 * Puerto de `ccnmt: packages/local-observability/src/debug.ts` (270
 * líneas fuente, 100 % portado). El subsistema real de debug-log — con
 * `logForDebugging` como el símbolo más importado por futuros
 * consumidores (100 líneas hacia `debug.js`, sólo detrás del barrel).
 *
 * Dependencias de paquete hermano sustituidas localmente (ninguna
 * exportada por el sibling real, verificado contra su `package.json`
 * `exports`):
 *
 * - `getSessionId`/`registerCleanup` — de `app-host/bootstrap/*`, subpath
 *   no exportado por `@thyrox/app-host`. Puntos de inyección en
 *   `internal/pendingCrossPackageDeps.ts`.
 * - `createBufferedWriter`/`BufferedWriter` — de `output/buffers`.
 *   `output` está en porte concurrente (otro agente, esta misma sesión);
 *   se sustituye localmente en `internal/bufferedWriter.ts` en vez de
 *   depender de un paquete en vuelo.
 * - `parseDebugFilter`/`shouldShowDebugMessage`/`DebugFilter` — de
 *   `repl/diagnostics/debugFilter.js`. El paquete `repl` no existe en
 *   este árbol; reimplementación fiel en `internal/debugFilter.ts`.
 * - `getFsImplementation` — de `storage/fsOperations.js`, subpath no
 *   exportado por `@thyrox/storage`. Sustituto mínimo en
 *   `internal/pendingCrossPackageDeps.ts`.
 * - `writeToStderr` — de `shell/process.js`. `@thyrox/shell` SÍ exporta
 *   `./process.js` pero el archivo real no declara ese símbolo todavía
 *   (0 hits de `export function writeToStderr`); sustituto fiel en
 *   `internal/pendingCrossPackageDeps.ts`.
 * - `getClaudeConfigHomeDir`/`isEnvTruthy` — `isEnvTruthy` SÍ está en
 *   `@thyrox/config: env/utils.ts` (reapuntado); `getClaudeConfigHomeDir`
 *   no está ahí y se sustituye en `pendingCrossPackageDeps.ts`.
 */

import { appendFile, mkdir, symlink, unlink } from 'fs/promises'
import memoize from 'lodash-es/memoize.js'
import { dirname, join } from 'path'
import { isEnvTruthy } from '@thyrox/config/env/utils'
import {
  getClaudeConfigHomeDir,
  getFsImplementation,
  getSessionId,
  registerCleanup,
  writeToStderr,
} from './internal/pendingCrossPackageDeps.js'
import { type BufferedWriter, createBufferedWriter } from './internal/bufferedWriter.js'
import {
  type DebugFilter,
  parseDebugFilter,
  shouldShowDebugMessage,
} from './internal/debugFilter.js'
// JSON.stringify plano — debug sólo lo usa para escapar saltos de línea en
// cadenas simples. Importar slowOperations.jsonStringify cerraría un ciclo
// de 3 archivos (slowOperations ↔ debug ↔ fsOperations ↔ slowOperations).

export type DebugLogLevel = 'verbose' | 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<DebugLogLevel, number> = {
  verbose: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
}

/**
 * Nivel mínimo de log a incluir en la salida de debug. Por defecto
 * `'debug'`, que filtra los mensajes `'verbose'`. Fijar
 * `CLAUDE_CODE_DEBUG_LOG_LEVEL=verbose` para incluir diagnósticos de alto
 * volumen (comando completo de statusLine, shell, cwd, stdout/stderr) que
 * de otro modo ahogarían la salida de debug útil.
 */
export const getMinDebugLogLevel = memoize((): DebugLogLevel => {
  const raw = process.env.CLAUDE_CODE_DEBUG_LOG_LEVEL?.toLowerCase().trim()
  if (raw && Object.hasOwn(LEVEL_ORDER, raw)) {
    return raw as DebugLogLevel
  }
  return 'debug'
})

let runtimeDebugEnabled = false

export const isDebugMode = memoize((): boolean => {
  return (
    runtimeDebugEnabled ||
    isEnvTruthy(process.env.DEBUG) ||
    isEnvTruthy(process.env.DEBUG_SDK) ||
    process.argv.includes('--debug') ||
    process.argv.includes('-d') ||
    isDebugToStdErr() ||
    process.argv.some(arg => arg.startsWith('--debug=')) ||
    getDebugFilePath() !== null
  )
})

/**
 * Habilita el logging de debug a mitad de sesión (p. ej. vía `/debug`).
 * Quienes no son ants no escriben logs de debug por defecto, así que esto
 * les permite empezar a capturar sin reiniciar con `--debug`. Devuelve
 * `true` si el logging ya estaba activo.
 */
export function enableDebugLogging(): boolean {
  const wasActive = isDebugMode() || process.env.USER_TYPE === 'ant'
  runtimeDebugEnabled = true
  isDebugMode.cache.clear?.()
  return wasActive
}

// Extrae y parsea el filtro de debug de los argumentos de línea de
// comandos. Exportado para pruebas.
export const getDebugFilter = memoize((): DebugFilter | null => {
  const debugArg = process.argv.find(arg => arg.startsWith('--debug='))
  if (!debugArg) {
    return null
  }
  const filterPattern = debugArg.substring('--debug='.length)
  return parseDebugFilter(filterPattern)
})

export const isDebugToStdErr = memoize((): boolean => {
  return process.argv.includes('--debug-to-stderr')
})

export const getDebugFilePath = memoize((): string | null => {
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i]!
    if (arg.startsWith('--debug-file=')) {
      return arg.substring('--debug-file='.length)
    }
    if (arg === '--debug-file' && i + 1 < process.argv.length) {
      return process.argv[i + 1]!
    }
  }
  return null
})

function shouldLogDebugMessage(message: string): boolean {
  if (process.env.NODE_ENV === 'test' && !isDebugToStdErr()) {
    return false
  }

  // Quienes no son ants sólo escriben logs de debug cuando el modo debug
  // está activo (vía --debug al arranque o /debug a mitad de sesión). Los
  // ants siempre loguean, para /share y reportes de bug.
  if (process.env.USER_TYPE !== 'ant' && !isDebugMode()) {
    return false
  }

  if (
    typeof process === 'undefined' ||
    typeof process.versions === 'undefined' ||
    typeof process.versions.node === 'undefined'
  ) {
    return false
  }

  const filter = getDebugFilter()
  return shouldShowDebugMessage(message, filter)
}

let hasFormattedOutput = false
export function setHasFormattedOutput(value: boolean): void {
  hasFormattedOutput = value
}
export function getHasFormattedOutput(): boolean {
  return hasFormattedOutput
}

let debugWriter: BufferedWriter | null = null
let pendingWrite: Promise<void> = Promise.resolve()

// A nivel de módulo para que .bind capture sólo sus args explícitos, no
// el scope padre del closure de writeFn (Jarred, #22257).
async function appendAsync(
  needMkdir: boolean,
  dir: string,
  path: string,
  content: string,
): Promise<void> {
  if (needMkdir) {
    await mkdir(dir, { recursive: true }).catch(() => {})
  }
  await appendFile(path, content)
  void updateLatestDebugLogSymlink()
}

function noop(): void {}

function getDebugWriter(): BufferedWriter {
  if (!debugWriter) {
    let ensuredDir: string | null = null
    debugWriter = createBufferedWriter({
      writeFn: content => {
        const path = getDebugLogPath()
        const dir = dirname(path)
        const needMkdir = ensuredDir !== dir
        ensuredDir = dir
        if (isDebugMode()) {
          // modo inmediato: debe quedarse sync. Las escrituras async se
          // pierden en un process.exit() directo y mantienen vivo el
          // event loop en handlers beforeExit (bucle infinito con
          // Perfetto tracing). Ver #22257.
          if (needMkdir) {
            try {
              getFsImplementation().mkdirSync(dir)
            } catch {
              // El directorio ya existe
            }
          }
          getFsImplementation().appendFileSync(path, content)
          void updateLatestDebugLogSymlink()
          return
        }
        // Camino con buffer (ants sin --debug): flushea ~1/seg para que
        // la profundidad de la cadena se quede en ~1. .bind sobre un
        // closure para retener sólo los args ligados, no este scope.
        pendingWrite = pendingWrite
          .then(appendAsync.bind(null, needMkdir, dir, path, content))
          .catch(noop)
      },
      flushIntervalMs: 1000,
      maxBufferSize: 100,
      immediateMode: isDebugMode(),
    })
    registerCleanup(async () => {
      debugWriter?.dispose()
      await pendingWrite
    })
  }
  return debugWriter
}

export async function flushDebugLogs(): Promise<void> {
  debugWriter?.flush()
  await pendingWrite
}

export function logForDebugging(
  message: string,
  { level }: { level: DebugLogLevel } = {
    level: 'debug',
  },
): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[getMinDebugLogLevel()]) {
    return
  }
  if (!shouldLogDebugMessage(message)) {
    return
  }

  // Los mensajes multilínea rompen el formato de salida jsonl, así que
  // cualquier mensaje multilínea se convierte a JSON.
  if (hasFormattedOutput && message.includes('\n')) {
    message = JSON.stringify(message)
  }
  const timestamp = new Date().toISOString()
  const output = `${timestamp} [${level.toUpperCase()}] ${message.trim()}\n`
  if (isDebugToStdErr()) {
    writeToStderr(output)
    return
  }

  getDebugWriter().write(output)
}

export function getDebugLogPath(): string {
  return (
    getDebugFilePath() ??
    process.env.CLAUDE_CODE_DEBUG_LOGS_DIR ??
    join(getClaudeConfigHomeDir(), 'debug', `${getSessionId()}.txt`)
  )
}

/**
 * Actualiza el symlink `latest` del log de debug para que apunte al
 * archivo de log de debug actual. Crea o actualiza un symlink en
 * `~/.claude/debug/latest`.
 */
const updateLatestDebugLogSymlink = memoize(async (): Promise<void> => {
  try {
    const debugLogPath = getDebugLogPath()
    const debugLogsDir = dirname(debugLogPath)
    const latestSymlinkPath = join(debugLogsDir, 'latest')

    await unlink(latestSymlinkPath).catch(() => {})
    await symlink(debugLogPath, latestSymlinkPath)
  } catch {
    // Falla en silencio si la creación del symlink falla.
  }
})

/**
 * Loguea errores sólo para Ants, siempre visibles en producción.
 */
export function logAntError(context: string, error: unknown): void {
  if (process.env.USER_TYPE !== 'ant') {
    return
  }

  if (error instanceof Error && error.stack) {
    logForDebugging(`[ANT-ONLY] ${context} stack trace:\n${error.stack}`, {
      level: 'error',
    })
  }
}
