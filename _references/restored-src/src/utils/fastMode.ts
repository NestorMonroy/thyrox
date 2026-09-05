// ══════════════════════════════════════════════════════════════════
// restored-src/src/utils/fastMode.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 5 · líneas de código: 40
// ══════════════════════════════════════════════════════════════════

// ─── part6/ch21.md · líneas 38-40 ───
export function isFastModeEnabled(): boolean {
  return !isEnvTruthy(process.env.CLAUDE_CODE_DISABLE_FAST_MODE)
}

// ─── ausente: líneas 41-142 (102 líneas sin fragmento en el corpus) ───

// ─── part6/ch21.md · líneas 143-147 ───
export const FAST_MODE_MODEL_DISPLAY = 'Opus 4.6'

export function getFastModeModel(): string {
  return 'opus' + (isOpus1mMergeEnabled() ? '[1m]' : '')
}

// ─── ausente: líneas 148-182 (35 líneas sin fragmento en el corpus) ───

// ─── part6/ch21.md · líneas 183-186 ───
export type FastModeRuntimeState =
  | { status: 'active' }
  | { status: 'cooldown'; resetAt: number; reason: CooldownReason }

// ─── ausente: líneas 187-213 (27 líneas sin fragmento en el corpus) ───

// ─── part6/ch21.md · líneas 214-233 ───
export function triggerFastModeCooldown(
  resetTimestamp: number,
  reason: CooldownReason,
): void {
  runtimeState = { status: 'cooldown', resetAt: resetTimestamp, reason }
  hasLoggedCooldownExpiry = false
  logEvent('tengu_fast_mode_fallback_triggered', {
    cooldown_duration_ms: cooldownDurationMs,
    cooldown_reason: reason,
  })
  cooldownTriggered.emit(resetTimestamp, reason)
}

// ─── ausente: líneas 234-318 (85 líneas sin fragmento en el corpus) ───

// ─── part6/ch21.md · líneas 319-335 ───
export function getFastModeState(
  model: ModelSetting,
  fastModeUserEnabled: boolean | undefined,
): 'off' | 'cooldown' | 'on' {
  const enabled =
    isFastModeEnabled() &&
    isFastModeAvailable() &&
    !!fastModeUserEnabled &&
    isFastModeSupportedByModel(model)
  if (enabled && isFastModeCooldown()) {
    return 'cooldown'
  }
  if (enabled) {
    return 'on'
  }
  return 'off'
}
