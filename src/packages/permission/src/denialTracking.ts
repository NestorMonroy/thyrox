/**
 * Porte fiel de `ccnmt: packages/permission/src/denialTracking.ts`
 * (45 líneas, 6 exports, licencia UNLICENSED — reimplementación, no
 * copia). Porte COMPLETO: el tipo `DenialTrackingState`, la constante
 * `DENIAL_LIMITS` y las cuatro funciones (`createDenialTrackingState`,
 * `recordDenial`, `recordSuccess`, `shouldFallbackToPrompting`) están
 * presentes, con el mismo comportamiento.
 *
 * Infraestructura de conteo de denegaciones para clasificadores de
 * permiso: rastrea denegaciones consecutivas y totales para decidir
 * cuándo caer de vuelta al prompt interactivo en vez de seguir
 * clasificando de forma automática.
 *
 * Sin divergencias.
 */

export type DenialTrackingState = {
  consecutiveDenials: number
  totalDenials: number
}

export const DENIAL_LIMITS = {
  maxConsecutive: 3,
  maxTotal: 20,
} as const

export function createDenialTrackingState(): DenialTrackingState {
  return {
    consecutiveDenials: 0,
    totalDenials: 0,
  }
}

export function recordDenial(state: DenialTrackingState): DenialTrackingState {
  return {
    ...state,
    consecutiveDenials: state.consecutiveDenials + 1,
    totalDenials: state.totalDenials + 1,
  }
}

export function recordSuccess(state: DenialTrackingState): DenialTrackingState {
  if (state.consecutiveDenials === 0) return state // Sin cambios necesarios
  return {
    ...state,
    consecutiveDenials: 0,
  }
}

export function shouldFallbackToPrompting(state: DenialTrackingState): boolean {
  return (
    state.consecutiveDenials >= DENIAL_LIMITS.maxConsecutive ||
    state.totalDenials >= DENIAL_LIMITS.maxTotal
  )
}
