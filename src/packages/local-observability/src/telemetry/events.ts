/**
 * Puerto de `ccnmt: packages/local-observability/src/telemetry/events.ts`
 * (137 líneas fuente, 100 % portado). Logging de eventos estructurados
 * OTel + redacción de privacidad.
 *
 * Reapuntado a `@thyrox/*` real: `isEnvTruthy` — `@thyrox/config` exporta
 * `./env/utils`.
 *
 * Sustituidos localmente (`internal/pendingCrossPackageDeps.ts`):
 * `getEventLogger`/`getPromptId` — de `app-host/bootstrap/state.js`,
 * subpath no exportado. El default `null` de `getEventLogger` reproduce
 * EXACTAMENTE la ruta real de "ningún exportador OTel configurado" (este
 * mismo archivo ya trata `null` como esa condición y emite su warning
 * una sola vez) — no es una reducción de fidelidad, es el mismo camino.
 */

import {
  getEventLogger,
  getPromptId,
} from '../internal/pendingCrossPackageDeps.js'
import { isEnvTruthy } from '@thyrox/config/env/utils'
import { logForDebugging } from '../debug.js'
import { getTelemetryAttributes } from './attributes.js'

// Puerto de `zn1()` — gatea el contenido del prompt en OTEL_LOG_USER_PROMPTS.
function userPromptLoggingEnabled(): boolean {
  return isEnvTruthy(process.env.OTEL_LOG_USER_PROMPTS)
}

// Puerto de `P$()` — gatea campos identificantes (nombres de servidor,
// nombres de plugin, detalle completo de error) en OTEL_LOG_TOOL_DETAILS.
// Apagado por defecto para que el stream de observabilidad se quede
// depurado para la mayoría de operadores.
export function toolDetailsLoggingEnabled(): boolean {
  return isEnvTruthy(process.env.OTEL_LOG_TOOL_DETAILS)
}

// Puerto de `uc_()` — gatea el contenido completo de herramienta (stdout
// de BashTool, etc.) en OTEL_LOG_TOOL_CONTENT.
export function toolContentLoggingEnabled(): boolean {
  return isEnvTruthy(process.env.OTEL_LOG_TOOL_CONTENT)
}

// Puerto de `YT_(H)`. El contenido libre del usuario se queda oculto a
// menos que el operador opte explícitamente; el resto del evento vuela
// igual (los dashboards ven el conteo/longitud del user_prompt, no el
// cuerpo).
export function redactIfDisabled(content: string): string {
  return userPromptLoggingEnabled() ? content : '<REDACTED>'
}

// Secuencia monotónica + warning de una sola vez (equivalente a An1 + ZF9).
let eventSequence = 0
let droppedWarningEmitted = false

export async function logOTelEvent(
  eventName: string,
  metadata: { [key: string]: string | undefined } = {},
): Promise<void> {
  const logger = getEventLogger()
  if (!logger) {
    // Refleja el comportamiento real: avisa UNA vez por proceso para que
    // el usuario sepa que el exportador OTEL no está inicializado. Los
    // descartes siguientes son silenciosos (si no, cada tool call
    // inundaría el log de debug).
    if (!droppedWarningEmitted) {
      droppedWarningEmitted = true
      logForDebugging(
        `[3P telemetry] Event dropped (no event logger initialized): ${eventName}`,
        { level: 'warn' },
      )
    }
    return
  }

  const now = new Date()
  const nowIso = now.toISOString()
  // getTelemetryAttributes() alcanza config + provider hosts; esos
  // lanzan si los bindings del host no están cableados (bun:test,
  // caminos pre-init). Se trata la bolsa de atributos como best-effort —
  // el evento vuela igual, sólo con event.* como metadata si el host no
  // está listo.
  let baseAttributes: Record<string, unknown> = {}
  try {
    baseAttributes = getTelemetryAttributes() as Record<string, unknown>
  } catch {
    // Faltan los bindings del host — se sigue con la base vacía.
  }
  const attributes: Record<string, unknown> = {
    ...baseAttributes,
    'event.name': eventName,
    'event.timestamp': nowIso,
    'event.sequence': eventSequence++,
  }

  // Correlación de prompt por turno. También defensivo: getPromptId lee
  // STATE que puede no estar inicializado en caminos de arranque temprano.
  try {
    const promptId = getPromptId()
    if (promptId) attributes['prompt.id'] = promptId
  } catch {
    // STATE no inicializado — está bien, el evento vuela sin prompt.id
  }

  // Setups multi-workspace pueden traer la lista de host-paths separada
  // por pipe. Se parte en '|' y se envía como array de cadenas (OTLP lo
  // soporta).
  const hostPaths = process.env.CLAUDE_CODE_WORKSPACE_HOST_PATHS
  if (hostPaths) attributes['workspace.host_paths'] = hostPaths.split('|')

  for (const [key, value] of Object.entries(metadata)) {
    if (value !== undefined) attributes[key] = value
  }

  logger.emit({
    timestamp: now,
    observedTimestamp: now,
    body: `claude_code.${eventName}`,
    attributes,
  })
}

// Escape hatch sólo para pruebas: bun:test importa este módulo una vez
// para toda la vida del runner, así que el estado de
// sequence/warning se filtra entre archivos de test. Los llamadores en
// __tests__ pueden resetear entre suites.
export function __resetOTelEventStateForTest(): void {
  eventSequence = 0
  droppedWarningEmitted = false
}
