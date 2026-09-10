// ══════════════════════════════════════════════════════════════════
// restored-src/src/utils/thinking.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 7 · líneas de código: 39
// ══════════════════════════════════════════════════════════════════

// ─── part6/ch21.md · líneas 10-13 ───
export type ThinkingConfig =
  | { type: 'adaptive' }
  | { type: 'enabled'; budgetTokens: number }
  | { type: 'disabled' }

// ─── ausente: líneas 14-18 (5 líneas sin fragmento en el corpus) ───

// ─── part6/ch21.md · líneas 19-24 ───
export function isUltrathinkEnabled(): boolean {
  if (!feature('ULTRATHINK')) {
    return false
  }
  return getFeatureValue_CACHED_MAY_BE_STALE('tengu_turtle_carbon', true)
}

// ─── ausente: líneas 25-28 (4 líneas sin fragmento en el corpus) ───

// ─── part6/ch21.md · líneas 29-31 ───
export function hasUltrathinkKeyword(text: string): boolean {
  return /\bultrathink\b/i.test(text)
}

// ─── ausente: líneas 32-59 (28 líneas sin fragmento en el corpus) ───

// ─── part6/ch21.md · líneas 60-68 ───
const RAINBOW_COLORS: Array<keyof Theme> = [
  'rainbow_red',
  'rainbow_orange',
  'rainbow_yellow',
  'rainbow_green',
  'rainbow_blue',
  'rainbow_indigo',
  'rainbow_violet',
]

// ─── ausente: líneas 69-104 (36 líneas sin fragmento en el corpus) ───

// ─── part6/ch21.md · líneas 105-109 ───
if (provider === 'foundry' || provider === 'firstParty') {
  return !canonical.includes('claude-3-')  // All Claude 4+ supported
}
return canonical.includes('sonnet-4') || canonical.includes('opus-4')

// ─── ausente: líneas 110-118 (9 líneas sin fragmento en el corpus) ───

// ─── part6/ch21.md · líneas 119-123 ───
if (canonical.includes('opus-4-6') || canonical.includes('sonnet-4-6')) {
  return true
}

// ─── ausente: líneas 124-145 (22 líneas sin fragmento en el corpus) ───

// ─── part6/ch21.md · líneas 146-162 ───
export function shouldEnableThinkingByDefault(): boolean {
  if (process.env.MAX_THINKING_TOKENS) {
    return parseInt(process.env.MAX_THINKING_TOKENS, 10) > 0
  }
  const { settings } = getSettingsWithErrors()
  if (settings.alwaysThinkingEnabled === false) {
    return false
  }
  return true
}
