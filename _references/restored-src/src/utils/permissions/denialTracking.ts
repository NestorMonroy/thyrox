// ══════════════════════════════════════════════════════════════════
// restored-src/src/utils/permissions/denialTracking.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 4 · líneas de código: 29
// Mencionado en: part7/ch25.md, part7/ch27.md
// ══════════════════════════════════════════════════════════════════

// ─── part5/ch17.md · líneas 7-10 ───
export type DenialTrackingState = {
  consecutiveDenials: number
  totalDenials: number
}

// ─── ausente: líneas 11-11 (1 líneas sin fragmento en el corpus) ───

// ─── part7/ch27.md · líneas 12-15 ───
export const DENIAL_LIMITS = {
  maxConsecutive: 3,
  maxTotal: 20,
} as const

// restored-src/src/utils/permissions/denialTracking.ts:40-44
export function shouldFallbackToPrompting(
  state: DenialTrackingState
): boolean {
  return (
    state.consecutiveDenials >= DENIAL_LIMITS.maxConsecutive ||
    state.totalDenials >= DENIAL_LIMITS.maxTotal
  )
}

// ─── part5/ch17.md · líneas 12-15 ───
export const DENIAL_LIMITS = {
  maxConsecutive: 3,
  maxTotal: 20,
} as const

// ─── ausente: líneas 16-39 (24 líneas sin fragmento en el corpus) ───

// ─── part5/ch17.md · líneas 40-45 ───
export function shouldFallbackToPrompting(state: DenialTrackingState): boolean {
  return (
    state.consecutiveDenials >= DENIAL_LIMITS.maxConsecutive ||
    state.totalDenials >= DENIAL_LIMITS.maxTotal
  )
}
