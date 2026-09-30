/**
 * Los interruptores de un corte de seguridad y qué implica cada uno.
 * Reimplementación del contrato de 2.1.275 (`Yt`, `so`, `ZRe`, `bq` de
 * `chunk-q8sknw7e.js`), no copia.
 *
 *   - `bypassImmune`: ni el modo bypass lo salta.
 *   - `classifierRouted`: lo resuelve el clasificador de auto mode.
 *   - `hostPersonOnly`: sólo una persona del anfitrión puede aprobarlo.
 *   - `localProjectionOnly`: sólo se proyecta a la interfaz local.
 */
export type CircuitBreaker =
  | 'dangerousRemoval'
  | 'backgroundOperator'
  | 'suspiciousWindowsPath'
  | 'isolatePeerMachines'
  | 'restrictedMode'
  | 'outsideReadsBlocked'
  | 'claudeSettingsFile'

type BreakerTraits = { bypassImmune: boolean; classifierRouted: boolean; hostPersonOnly: boolean; localProjectionOnly: boolean }

export const CIRCUIT_BREAKERS: Readonly<Record<CircuitBreaker, BreakerTraits>> = {
  dangerousRemoval: { bypassImmune: true, classifierRouted: true, hostPersonOnly: false, localProjectionOnly: false },
  backgroundOperator: { bypassImmune: false, classifierRouted: true, hostPersonOnly: false, localProjectionOnly: false },
  suspiciousWindowsPath: { bypassImmune: false, classifierRouted: true, hostPersonOnly: false, localProjectionOnly: false },
  isolatePeerMachines: { bypassImmune: true, classifierRouted: false, hostPersonOnly: false, localProjectionOnly: false },
  restrictedMode: { bypassImmune: true, classifierRouted: false, hostPersonOnly: false, localProjectionOnly: false },
  outsideReadsBlocked: { bypassImmune: true, classifierRouted: false, hostPersonOnly: false, localProjectionOnly: false },
  claudeSettingsFile: { bypassImmune: false, classifierRouted: false, hostPersonOnly: true, localProjectionOnly: false },
}

export type SafetyCheckReason = { circuitBreaker?: string; also?: readonly string[] }

function traits(name: string): BreakerTraits | undefined {
  return Object.hasOwn(CIRCUIT_BREAKERS, name) ? CIRCUIT_BREAKERS[name as CircuitBreaker] : undefined
}

/** El interruptor principal y los acompañantes (≙ `so`). */
export function breakersOf(reason: SafetyCheckReason): string[] {
  return [...(reason.circuitBreaker !== undefined ? [reason.circuitBreaker] : []), ...(reason.also ?? [])]
}

/** ¿Resiste alguno al modo bypass? (≙ `ZRe`). */
export function isBypassImmune(reason: SafetyCheckReason): boolean {
  return breakersOf(reason).some(name => traits(name)?.bypassImmune === true)
}

/** ¿Lo resuelve el clasificador de auto mode? (≙ `bq`). */
export function isClassifierRouted(reason: SafetyCheckReason): boolean {
  return reason.circuitBreaker !== undefined && traits(reason.circuitBreaker)?.classifierRouted === true
}

/** ¿Sólo se proyecta a la interfaz local? (≙ `yir`). */
export function isLocalProjectionOnly(reason: SafetyCheckReason): boolean {
  return breakersOf(reason).some(name => traits(name)?.localProjectionOnly === true)
}
