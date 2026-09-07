/**
 * Puerto de `ccnmt: packages/local-observability/src/logging/error-log-sink.ts`
 * (279 líneas fuente). Implementación respaldada por archivo del
 * contrato `ErrorLogSink` declarado en `./error-log.ts`. Pesado (axios,
 * writers con buffer, registro de cleanup) e inicializado sólo al
 * arrancar la app — por eso separado de `./error-log.ts`, que debe
 * quedarse libre de dependencias para que los logs previos al arranque
 * se encolen sin riesgo.
 *
 * Reapuntado a `@thyrox/*` real: `CACHE_PATHS` — `@thyrox/storage`
 * exporta `./cache-paths`.
 *
 * Sustituidos localmente (`internal/pendingCrossPackageDeps.ts`):
 * `getSessionId`/`registerCleanup` (app-host/bootstrap, subpath no
 * exportado), `getFsImplementation` (storage/fsOperations, ídem).
 *
 * `MACRO.VERSION`: constante de build-time inyectada por
 * `Bun.build({ define })`, o el relleno de
 * `@thyrox/agent: internal/macroFallback.ts` bajo `bun:test` — ese
 * módulo no está exportado por `@thyrox/agent`, así que aquí se declara
 * el tipo ambiental mínimo en línea (mismo patrón que
 * `ccnmt: packages/local-observability/src/sentry.ts` declara
 * `BUILD_ENV` en línea: "so this package doesn't depend on
 * src/types/global.d.ts") y se lee con guarda `typeof MACRO !==
 * 'undefined'`, con `'0.0.0-dev'` como default fiel a la ausencia del
 * define.
 *
 * NOTA DE INCONSISTENCIA DE LA FUENTE (no de este porte): este archivo
 * inlinea su PROPIO `createBufferedWriter`/`createJsonlWriter`, más
 * simple que el de `output/buffers` que `../debug.ts` sí importa (sin
 * `immediateMode` ni desborde detached) — la propia fuente lo declara:
 * "Small enough to inline here so local-observability stays src/-free".
 * Se porta tal cual, sin unificar los dos writers por mi cuenta (sería
 * una decisión editorial, no un porte). Ver hallazgo.
 */

import axios from 'axios'
import { dirname, join } from 'path'

import {
  getFsImplementation,
  getSessionId,
  registerCleanup,
} from '../internal/pendingCrossPackageDeps.js'
import { CACHE_PATHS } from '@thyrox/storage/cache-paths'

import { captureException } from '../sentry.js'
import { logForDebugging } from '../debug.js'
import { jsonStringify } from '../slowOperations.js'
import { attachErrorLogSink, dateToFilename } from './error-log.js'

declare const MACRO: { VERSION: string } | undefined

// Shim local que envuelve CACHE_PATHS en la forma "lazy-call" que este
// módulo espera (los llamadores hacen `getCachePaths().errors()`, no
// `CACHE_PATHS.errors()` directo).
const getCachePaths = (): {
  errors(): string
  mcpLogs(serverName: string): string
} => ({
  errors: () => CACHE_PATHS.errors(),
  mcpLogs: (serverName: string) => CACHE_PATHS.mcpLogs(serverName),
})

const DATE = dateToFilename(new Date())

/** Obtiene la ruta al archivo de log de errores. */
export function getErrorsPath(): string {
  return join(getCachePaths().errors(), DATE + '.jsonl')
}

/** Obtiene la ruta a los logs MCP de un servidor. */
export function getMCPLogsPath(serverName: string): string {
  return join(getCachePaths().mcpLogs(serverName), DATE + '.jsonl')
}

// ---------------------------------------------------------------------------
// Writer JSONL con buffer (implementación mínima inlineada)
// ---------------------------------------------------------------------------

type JsonlWriter = {
  write: (obj: object) => void
  flush: () => void
  dispose: () => void
}

type BufferedWriterOptions = {
  writeFn: (content: string) => void
  flushIntervalMs?: number
  maxBufferSize?: number
}

/**
 * Writer con buffer mínimo — agrupa escrituras para reducir la sobrecarga
 * de syscalls. Suficientemente pequeño para inlinearlo aquí y que
 * local-observability se quede libre de dependencias de src/.
 */
function createBufferedWriter(options: BufferedWriterOptions): JsonlWriter {
  const { writeFn, flushIntervalMs = 1000, maxBufferSize = 50 } = options
  let buffer: string[] = []
  let timer: NodeJS.Timeout | null = null
  let disposed = false

  function flush(): void {
    if (buffer.length === 0) return
    const content = buffer.join('')
    buffer = []
    try {
      writeFn(content)
    } catch {
      // Falla en silencio — loguear nunca debe lanzar.
    }
  }

  function scheduleFlush(): void {
    if (timer !== null) return
    timer = setTimeout(() => {
      timer = null
      flush()
    }, flushIntervalMs)
  }

  return {
    write(obj: object): void {
      if (disposed) return
      buffer.push(jsonStringify(obj) + '\n')
      if (buffer.length >= maxBufferSize) {
        flush()
      } else {
        scheduleFlush()
      }
    },
    flush,
    dispose(): void {
      disposed = true
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      flush()
    },
  }
}

function createJsonlWriter(options: BufferedWriterOptions): JsonlWriter {
  return createBufferedWriter(options)
}

// ---------------------------------------------------------------------------
// Pool de writers de log
// ---------------------------------------------------------------------------

const logWriters = new Map<string, JsonlWriter>()

/**
 * Flushea todos los writers de log con buffer. Usado para pruebas.
 * @internal
 */
export function _flushLogWritersForTesting(): void {
  for (const writer of logWriters.values()) {
    writer.flush()
  }
}

/**
 * Limpia todos los writers de log con buffer. Usado para pruebas.
 * @internal
 */
export function _clearLogWritersForTesting(): void {
  for (const writer of logWriters.values()) {
    writer.dispose()
  }
  logWriters.clear()
}

function getLogWriter(path: string): JsonlWriter {
  let writer = logWriters.get(path)
  if (!writer) {
    const dir = dirname(path)
    writer = createJsonlWriter({
      writeFn: (content: string) => {
        try {
          getFsImplementation().appendFileSync(path, content)
        } catch {
          getFsImplementation().mkdirSync(dir)
          getFsImplementation().appendFileSync(path, content)
        }
      },
      flushIntervalMs: 1000,
      maxBufferSize: 50,
    })
    logWriters.set(path, writer)
    registerCleanup(async () => writer?.dispose())
  }
  return writer
}

function appendToLog(path: string, message: object): void {
  if (process.env.USER_TYPE !== 'ant') return

  const messageWithTimestamp = {
    timestamp: new Date().toISOString(),
    ...message,
    cwd: process.cwd(),
    userType: process.env.USER_TYPE,
    sessionId: getSessionId(),
    version: typeof MACRO !== 'undefined' ? MACRO.VERSION : '0.0.0-dev',
  }

  getLogWriter(path).write(messageWithTimestamp)
}

function extractServerMessage(data: unknown): string | undefined {
  if (typeof data === 'string') return data
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (typeof obj.message === 'string') return obj.message
    if (
      typeof obj.error === 'object' &&
      obj.error &&
      'message' in obj.error &&
      typeof (obj.error as Record<string, unknown>).message === 'string'
    ) {
      return (obj.error as Record<string, unknown>).message as string
    }
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Implementaciones del sink
// ---------------------------------------------------------------------------

function logErrorImpl(error: Error): void {
  const errorStr = error.stack || error.message

  let context = ''
  if (axios.isAxiosError(error) && error.config?.url) {
    const parts = [`url=${error.config.url}`]
    if (error.response?.status !== undefined) {
      parts.push(`status=${error.response.status}`)
    }
    const serverMessage = extractServerMessage(error.response?.data)
    if (serverMessage) {
      parts.push(`body=${serverMessage}`)
    }
    context = `[${parts.join(',')}] `
  }

  logForDebugging(`${error.name}: ${context}${errorStr}`, { level: 'error' })

  appendToLog(getErrorsPath(), {
    error: `${context}${errorStr}`,
  })

  captureException(error)
}

function logMCPErrorImpl(serverName: string, error: unknown): void {
  logForDebugging(`MCP server "${serverName}" ${error}`, { level: 'error' })

  const logFile = getMCPLogsPath(serverName)
  const errorStr =
    error instanceof Error ? error.stack || error.message : String(error)

  getLogWriter(logFile).write({
    error: errorStr,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    cwd: process.cwd(),
  })
}

function logMCPDebugImpl(serverName: string, message: string): void {
  logForDebugging(`MCP server "${serverName}": ${message}`)

  getLogWriter(getMCPLogsPath(serverName)).write({
    debug: message,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    cwd: process.cwd(),
  })
}

/**
 * Inicializa el sink de log de errores.
 *
 * Llamar durante el arranque de la app para acoplar el backend de
 * logging de errores. Cualquier error logueado antes de esto se encola y
 * se drena.
 *
 * Debe llamarse ANTES que `initializeAnalyticsSink()` en la secuencia de
 * arranque.
 *
 * Idempotente: seguro de llamar varias veces (las llamadas subsecuentes
 * son no-op).
 */
export function initializeErrorLogSink(): void {
  attachErrorLogSink({
    logError: logErrorImpl,
    logMCPError: logMCPErrorImpl,
    logMCPDebug: logMCPDebugImpl,
    getErrorsPath,
    getMCPLogsPath,
  })

  logForDebugging('Error log sink initialized')
}
