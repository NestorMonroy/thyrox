// ══════════════════════════════════════════════════════════════════
// restored-src/src/types/permissions.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 6 · líneas de código: 26
// Mencionado en: part7/ch30.md
// ══════════════════════════════════════════════════════════════════

// ─── part5/ch16.md · líneas 16-22 ───
export const EXTERNAL_PERMISSION_MODES = [
  'acceptEdits',
  'bypassPermissions',
  'default',
  'dontAsk',
  'plan',
] as const

// ─── part7/ch30.md · líneas 16-22 ───
export const EXTERNAL_PERMISSION_MODES = [
  'acceptEdits',
  'bypassPermissions',
  'default',
  'dontAsk',
  'plan',
] as const

// ─── ausente: líneas 23-27 (5 líneas sin fragmento en el corpus) ───

// ─── part5/ch16.md · líneas 28-29 ───
export type InternalPermissionMode = ExternalPermissionMode | 'auto' | 'bubble'
export type PermissionMode = InternalPermissionMode

// ─── ausente: líneas 30-34 (5 líneas sin fragmento en el corpus) ───

// ─── part6/ch23.md · líneas 35 ───
...(feature('TRANSCRIPT_CLASSIFIER') ? (['auto'] as const) : ([] as const))

// ─── ausente: líneas 36-66 (31 líneas sin fragmento en el corpus) ───

// ─── part5/ch16.md · líneas 67-70 ───
export type PermissionRuleValue = {
  toolName: string
  ruleContent?: string    // e.g., "npm install", "git:*"
}

// ─── ausente: líneas 71-74 (4 líneas sin fragmento en el corpus) ───

// ─── part5/ch16.md · líneas 75-79 ───
export type PermissionRule = {
  source: PermissionRuleSource
  ruleBehavior: PermissionBehavior    // 'allow' | 'deny' | 'ask'
  ruleValue: PermissionRuleValue
}
