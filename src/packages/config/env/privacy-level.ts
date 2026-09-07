/**
 * Puerto de `ccnmt: packages/config/env/privacy-level.ts` (56 líneas
 * fuente). Reimplementación fiel VERBATIM.
 *
 * El nivel de privacidad controla cuánto tráfico de red no esencial y
 * telemetría genera Claude Code.
 *
 * Los niveles están ordenados por restrictividad:
 *   default < no-telemetry < essential-traffic
 *
 * - default:            todo habilitado.
 * - no-telemetry:       analytics/telemetría deshabilitados (Datadog,
 *                       eventos 1P, encuesta de feedback).
 * - essential-traffic:  TODO el tráfico de red no esencial deshabilitado
 *                       (telemetría + auto-updates, grove, notas de
 *                       release, capacidades de modelo, etc.).
 *
 * El nivel resuelto es la señal más restrictiva entre:
 *   CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC  →  essential-traffic
 *   DISABLE_TELEMETRY                         →  no-telemetry
 */
import { readEnv } from './utils.ts'

type PrivacyLevel = 'default' | 'no-telemetry' | 'essential-traffic'

export function getPrivacyLevel(): PrivacyLevel {
  if (readEnv('CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC')) {
    return 'essential-traffic'
  }
  if (readEnv('DISABLE_TELEMETRY')) {
    return 'no-telemetry'
  }
  return 'default'
}

/** Verdadero cuando todo el tráfico de red no esencial debe suprimirse. */
export function isEssentialTrafficOnly(): boolean {
  return getPrivacyLevel() === 'essential-traffic'
}

/**
 * Verdadero cuando telemetría/analytics debe suprimirse. Verdadero tanto en
 * `no-telemetry` como en `essential-traffic`.
 */
export function isTelemetryDisabled(): boolean {
  return getPrivacyLevel() !== 'default'
}

/**
 * Devuelve el nombre de la variable de entorno responsable de la
 * restricción essential-traffic actual, o `null` si no hay restricción.
 * Se usa para mensajes de cara al usuario tipo "desmarca X para
 * reactivar".
 */
export function getEssentialTrafficOnlyReason(): string | null {
  if (readEnv('CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC')) {
    return 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC'
  }
  return null
}
