/**
 * Porte fiel de `ccnmt: packages/permission/src/autoModeState.ts`
 * (41 líneas, 8 exports, licencia UNLICENSED — reimplementación, no
 * copia). Porte COMPLETO: los tres flags de módulo (`autoModeActive`,
 * `autoModeFlagCli`, `autoModeCircuitBroken`) y sus siete
 * getters/setters más `_resetForTesting` están presentes, con el mismo
 * comportamiento.
 *
 * Vive en su propio módulo para que los callers puedan hacer
 * `require()` condicional bajo `feature('TRANSCRIPT_CLASSIFIER')` — el
 * paquete `permission` es dueño de este estado (movido de
 * `src/utils/permissions/` en la fuente original).
 *
 * Sin divergencias.
 */

let autoModeActive = false
let autoModeFlagCli = false
// Lo fija la comprobación asíncrona de verifyAutoModeGateAccess cuando lee
// un `tengu_auto_mode_config.enabled === 'disabled'` fresco desde
// GrowthBook. Lo consume isAutoModeGateEnabled() para bloquear el
// re-ingreso por SDK/explícito tras un kick-out.
let autoModeCircuitBroken = false

export function setAutoModeActive(active: boolean): void {
  autoModeActive = active
}

export function isAutoModeActive(): boolean {
  return autoModeActive
}

export function setAutoModeFlagCli(passed: boolean): void {
  autoModeFlagCli = passed
}

export function getAutoModeFlagCli(): boolean {
  return autoModeFlagCli
}

export function setAutoModeCircuitBroken(broken: boolean): void {
  autoModeCircuitBroken = broken
}

export function isAutoModeCircuitBroken(): boolean {
  return autoModeCircuitBroken
}

export function _resetForTesting(): void {
  autoModeActive = false
  autoModeFlagCli = false
  autoModeCircuitBroken = false
}
