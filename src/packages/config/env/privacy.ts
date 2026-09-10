/**
 * Puerto de `ccnmt: packages/config/env/privacy.ts` (37 líneas fuente).
 * Reimplementación fiel VERBATIM.
 *
 * Puertas de entorno relacionadas con privacidad (deshabilitar analytics /
 * encuesta de feedback). Devuelve booleanos derivados de flags de entorno
 * de proveedor cloud y de la política de telemetría instalada.
 *
 * `isTelemetryDisabledForPrivacyConfig` consulta una función inyectada por
 * el host (`../privacy-level.ts`, del mismo pase); por defecto es `false`.
 */
import { isEnvTruthy } from './utils.ts'

/**
 * Sonda de "telemetría deshabilitada" inyectada por el host. Por defecto
 * `false`. La fija el módulo `privacy-level` del host.
 */
let _isTelemetryDisabled: () => boolean = () => false

export function setIsTelemetryDisabledFn(fn: () => boolean): void {
  _isTelemetryDisabled = fn
}

export function isTelemetryDisabledForPrivacyConfig(): boolean {
  return _isTelemetryDisabled()
}

export function isAnalyticsDisabled(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK) ||
    isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX) ||
    isEnvTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY) ||
    _isTelemetryDisabled()
  )
}
