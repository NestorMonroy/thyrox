/**
 * Puerto de `ccnmt: packages/local-observability/src/logging/error-log.ts`
 * (225 líneas fuente). La familia `logError`/`logMCPError`/`logMCPDebug` +
 * el mecanismo de acople de sink + `captureAPIRequest`. Sin dependencias
 * pesadas propias — los eventos se encolan hasta que
 * `attachErrorLogSink()` conecta un sink real (`./error-log-sink.ts`).
 *
 * Reapuntado a `@thyrox/*` real:
 * - `isEnvTruthy` — `@thyrox/config` exporta `./env/utils`.
 *
 * Sustituidos localmente (`internal/pendingCrossPackageDeps.ts`):
 * - `callSetLastAPIRequest`/`callSetLastAPIRequestMessages` — de
 *   `app-host/bootstrap/state.js`. Los símbolos reales SÍ existen en
 *   `@thyrox/app-host: src/bootstrap/state.ts` (`setLastAPIRequest`,
 *   `setLastAPIRequestMessages`) pero `./bootstrap/*` no está en su
 *   `exports`.
 * - `isEssentialTrafficOnly` — de `config/env/privacy-level.js`, ese
 *   archivo no existe en `@thyrox/config`.
 *
 * NO PORTADO: la rama `feature('HARD_FAIL') && isHardFailMode()` de
 * `logError` — `feature('HARD_FAIL')` (macro `bun:bundle`, ausente en
 * este árbol) resuelve siempre `false` fuera de un build ant, así que
 * `process.exit(1)` nunca se alcanza. Mismo precedente que
 * `slowLoggingTag.ts`/`fsOperations.ts`: se omite la rama entera en vez
 * de mantener un `isHardFailMode()` que nadie llamaría.
 */

import type { BetaMessageStreamParams } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'

import {
  callSetLastAPIRequest,
  callSetLastAPIRequestMessages,
  isEssentialTrafficOnly,
} from '../internal/pendingCrossPackageDeps.js'
import { isEnvTruthy } from '@thyrox/config/env/utils'
import { toError } from '../errorHelpers.js'

// ---------------------------------------------------------------------------
// Tipos compartidos
// ---------------------------------------------------------------------------

/**
 * Interfaz del sink para el backend de logging de errores. La
 * implementación vive en `./error-log-sink.ts` y se acopla al arrancar
 * la app.
 */
export type ErrorLogSink = {
  logError: (error: Error) => void
  logMCPError: (serverName: string, error: unknown) => void
  logMCPDebug: (serverName: string, message: string) => void
  getErrorsPath: () => string
  getMCPLogsPath: (serverName: string) => string
}

type QueuedErrorEvent =
  | { type: 'error'; error: Error }
  | { type: 'mcpError'; serverName: string; error: unknown }
  | { type: 'mcpDebug'; serverName: string; message: string }

// ---------------------------------------------------------------------------
// Ring buffer de errores en memoria — siempre poblado, con o sin sink
// ---------------------------------------------------------------------------

const MAX_IN_MEMORY_ERRORS = 100
let inMemoryErrorLog: Array<{ error: string; timestamp: string }> = []

function addToInMemoryErrorLog(errorInfo: {
  error: string
  timestamp: string
}): void {
  if (inMemoryErrorLog.length >= MAX_IN_MEMORY_ERRORS) {
    inMemoryErrorLog.shift()
  }
  inMemoryErrorLog.push(errorInfo)
}

export function getInMemoryErrors(): { error: string; timestamp: string }[] {
  return [...inMemoryErrorLog]
}

// ---------------------------------------------------------------------------
// Acople de sink — idempotente; los eventos se encolan hasta que acopla
// ---------------------------------------------------------------------------

const errorQueue: QueuedErrorEvent[] = []
let errorLogSink: ErrorLogSink | null = null

/**
 * Acopla el sink de log de errores que recibirá todos los eventos de
 * error. Los eventos en cola se drenan de inmediato para no perder
 * ninguno.
 *
 * Idempotente: si ya hay un sink acoplado, esto es no-op. Permite
 * llamarlo tanto desde el hook preAction (para subcomandos) como desde
 * setup() (para el comando por defecto) sin coordinación.
 */
export function attachErrorLogSink(newSink: ErrorLogSink): void {
  if (errorLogSink !== null) return
  errorLogSink = newSink

  if (errorQueue.length > 0) {
    const queuedEvents = [...errorQueue]
    errorQueue.length = 0
    for (const event of queuedEvents) {
      switch (event.type) {
        case 'error':
          errorLogSink.logError(event.error)
          break
        case 'mcpError':
          errorLogSink.logMCPError(event.serverName, event.error)
          break
        case 'mcpDebug':
          errorLogSink.logMCPDebug(event.serverName, event.message)
          break
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helper de fecha (usado por error-log-sink para el timestamp del nombre)
// ---------------------------------------------------------------------------

export function dateToFilename(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-')
}

// ---------------------------------------------------------------------------
// API pública logError / logMCPError / logMCPDebug
// ---------------------------------------------------------------------------

export function logError(error: unknown): void {
  const err = toError(error)
  try {
    if (
      isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK) ||
      isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX) ||
      isEnvTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY) ||
      process.env.DISABLE_ERROR_REPORTING ||
      isEssentialTrafficOnly()
    ) {
      return
    }

    const errorStr = err.stack || err.message

    addToInMemoryErrorLog({
      error: errorStr,
      timestamp: new Date().toISOString(),
    })

    if (errorLogSink === null) {
      errorQueue.push({ type: 'error', error: err })
      return
    }

    errorLogSink.logError(err)
  } catch {
    // No pasa — loguear nunca debe lanzar.
  }
}

export function logMCPError(serverName: string, error: unknown): void {
  try {
    if (errorLogSink === null) {
      errorQueue.push({ type: 'mcpError', serverName, error })
      return
    }
    errorLogSink.logMCPError(serverName, error)
  } catch {
    // Falla en silencio.
  }
}

export function logMCPDebug(serverName: string, message: string): void {
  try {
    if (errorLogSink === null) {
      errorQueue.push({ type: 'mcpDebug', serverName, message })
      return
    }
    errorLogSink.logMCPDebug(serverName, message)
  } catch {
    // Falla en silencio.
  }
}

// ---------------------------------------------------------------------------
// captureAPIRequest — guarda los params del request (no los mensajes)
// para reportes de bug
// ---------------------------------------------------------------------------

/**
 * Captura el último request de API para incluirlo en reportes de bug.
 *
 * Acepta `querySource: unknown` porque el tipo `QuerySource` vive en
 * `src/constants/querySource.ts` y no se cruza esa frontera de import
 * desde aquí. Quien llama pasa la cadena; aquí se compara con
 * `startsWith`.
 */
export function captureAPIRequest(
  params: BetaMessageStreamParams,
  querySource?: unknown,
): void {
  // startsWith, no coincidencia exacta — usuarios con output styles no
  // default reciben variantes como
  // 'repl_main_thread:outputStyle:Explanatory' (querySource.ts).
  if (typeof querySource !== 'string') return
  if (!querySource.startsWith('repl_main_thread')) return

  // Guarda los params SIN los mensajes para no retener la conversación
  // entera de todos los usuarios. Los mensajes ya están persistidos en el
  // archivo de transcript y disponibles vía estado de React.
  const { messages, ...paramsWithoutMessages } = params
  callSetLastAPIRequest(paramsWithoutMessages)
  callSetLastAPIRequestMessages(
    process.env.USER_TYPE === 'ant' ? messages : null,
  )
}

// ---------------------------------------------------------------------------
// Utilidad de testing — resetea todo el estado del módulo
// ---------------------------------------------------------------------------

/**
 * Resetea el estado del log de errores, sólo para pruebas.
 * @internal
 */
export function _resetErrorLogForTesting(): void {
  errorLogSink = null
  errorQueue.length = 0
  inMemoryErrorLog = []
}
