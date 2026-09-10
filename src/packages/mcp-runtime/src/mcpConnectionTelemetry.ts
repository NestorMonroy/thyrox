/**
 * Porte COMPLETO de
 * `ccnmt: packages/mcp-runtime/src/mcpConnectionTelemetry.ts` — su única
 * exportación, ninguna omitida.
 *
 * Reapuntados a `@thyrox/local-observability` (pasan el filtro de dos
 * pasos — subpath declarado y símbolo verificado en runtime con
 * `import()`): `./telemetry` (`logMcpServerConnectionEvent`,
 * `toolDetailsLoggingEnabled`) y `./errorHelpers.js` (`errorMessage`).
 *
 * Puerto del helper de evento OTel estructurado
 * `mcp_server_connection` (ant v2.1.136 QN8, `4054.js` en la numeración
 * de la fuente). Extraído de `clientRuntime.ts` (no portado en este pase)
 * para que el cableado en sus dos sitios de llamada sea de una línea y
 * `clientRuntime.ts` se mantenga bajo su presupuesto de líneas heredado.
 *
 * `server_name` y el detalle del error se cierran tras
 * `OTEL_LOG_TOOL_DETAILS`, para que los dashboards de cliente queden
 * depurados por defecto.
 */

import {
  logMcpServerConnectionEvent,
  toolDetailsLoggingEnabled,
} from '@thyrox/local-observability/telemetry'
import { errorMessage } from '@thyrox/local-observability/errorHelpers.js'

export function emitMcpConnectionEvent(
  name: string,
  serverRef: { type?: string; scope?: string },
  status: 'success' | 'failure',
  durationMs: number,
  error?: unknown,
): void {
  const errCode = (error as { code?: unknown } | undefined)?.code
  void logMcpServerConnectionEvent({
    serverName: name,
    transportType: serverRef.type ?? 'stdio',
    serverScope: serverRef.scope ?? 'unknown',
    status,
    durationMs,
    errorCode: typeof errCode === 'string' ? errCode : undefined,
    errorDetail: error !== undefined ? errorMessage(error) : undefined,
    includeIdentifyingFields: toolDetailsLoggingEnabled(),
  })
}
