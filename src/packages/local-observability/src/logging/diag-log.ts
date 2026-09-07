/**
 * Puerto de `ccnmt: packages/local-observability/src/logging/diag-log.ts`
 * (90 líneas fuente, 100 % portado). `logForDiagnosticsNoPII` +
 * `withDiagnosticsTiming` — escribe entradas de diagnóstico (sin PII) a
 * un archivo apuntado por `$CLAUDE_CODE_DIAGNOSTICS_FILE`, consumido por
 * el gestor de entorno para monitorear el contenedor.
 *
 * `getFsImplementation` — sustituto local en
 * `internal/pendingCrossPackageDeps.ts` (subpath no exportado por
 * `@thyrox/storage`).
 */

import { dirname } from 'path'

import { getFsImplementation } from '../internal/pendingCrossPackageDeps.js'
import { jsonStringify } from '../slowOperations.js'

type DiagnosticLogLevel = 'debug' | 'info' | 'warn' | 'error'

type DiagnosticLogEntry = {
  timestamp: string
  level: DiagnosticLogLevel
  event: string
  data: Record<string, unknown>
}

/**
 * Loguea información de diagnóstico a un archivo de log. Esta
 * información se envía vía el gestor de entorno a session-ingress para
 * monitorear problemas desde dentro del contenedor.
 *
 * *Importante* — esta función NUNCA debe llamarse con PII, incluyendo
 * rutas de archivo, nombres de proyecto, nombres de repo, prompts, etc.
 */
export function logForDiagnosticsNoPII(
  level: DiagnosticLogLevel,
  event: string,
  data?: Record<string, unknown>,
): void {
  const logFile = getDiagnosticLogFile()
  if (!logFile) return

  const entry: DiagnosticLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    data: data ?? {},
  }

  const fs = getFsImplementation()
  const line = jsonStringify(entry) + '\n'
  try {
    fs.appendFileSync(logFile, line)
  } catch {
    try {
      fs.mkdirSync(dirname(logFile))
      fs.appendFileSync(logFile, line)
    } catch {
      // Falla en silencio si loguear no es posible.
    }
  }
}

function getDiagnosticLogFile(): string | undefined {
  return process.env.CLAUDE_CODE_DIAGNOSTICS_FILE
}

/**
 * Envuelve una función async con logs de temporización de diagnóstico.
 * Loguea `{event}_started` antes de ejecutar y `{event}_completed`
 * después, con `duration_ms`.
 */
export async function withDiagnosticsTiming<T>(
  event: string,
  fn: () => Promise<T>,
  getData?: (result: T) => Record<string, unknown>,
): Promise<T> {
  const startTime = Date.now()
  logForDiagnosticsNoPII('info', `${event}_started`)

  try {
    const result = await fn()
    const additionalData = getData ? getData(result) : {}
    logForDiagnosticsNoPII('info', `${event}_completed`, {
      duration_ms: Date.now() - startTime,
      ...additionalData,
    })
    return result
  } catch (error) {
    logForDiagnosticsNoPII('error', `${event}_failed`, {
      duration_ms: Date.now() - startTime,
    })
    throw error
  }
}
