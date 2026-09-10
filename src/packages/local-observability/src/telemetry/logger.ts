/**
 * Puerto de `ccnmt: packages/local-observability/src/telemetry/logger.ts`
 * (29 líneas fuente, 100 % portado). Adaptador `DiagLogger` de
 * OpenTelemetry — conecta las emisiones diagnósticas internas de OTel a
 * la superficie de error-log de local-observability. Única dependencia
 * externa: `@opentelemetry/api` (instalada como dependencia real de este
 * paquete).
 */

import type { DiagLogger } from '@opentelemetry/api'

import { logForDebugging } from '../debug.js'
import { logError } from '../logging/error-log.js'

export class ClaudeCodeDiagLogger implements DiagLogger {
  error(message: string, ..._: unknown[]) {
    logError(new Error(message))
    logForDebugging(`[3P telemetry] OTEL diag error: ${message}`, {
      level: 'error',
    })
  }
  warn(message: string, ..._: unknown[]) {
    logError(new Error(message))
    logForDebugging(`[3P telemetry] OTEL diag warn: ${message}`, {
      level: 'warn',
    })
  }
  info(_message: string, ..._args: unknown[]) {}
  debug(_message: string, ..._args: unknown[]) {}
  verbose(_message: string, ..._args: unknown[]) {}
}
