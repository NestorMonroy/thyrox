// ══════════════════════════════════════════════════════════════════
// restored-src/src/state/AppStateStore.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 1 · líneas de código: 11
// Mencionado en: part1/ch01.md, part6/ch20c.md
// ══════════════════════════════════════════════════════════════════

// ─── part6/ch20c.md · líneas sin rango declarado ───
ultraplanLaunching?: boolean         // Launching (prevents duplicate launches, ~5s window)
ultraplanSessionUrl?: string         // Active session URL (disables keyword trigger when present)
ultraplanPendingChoice?: {           // Approved plan awaiting user's execution location choice
  plan: string
  sessionId: string
  taskId: string
}
ultraplanLaunchPending?: {           // Pre-launch confirmation dialog state
  blurb: string
}
isUltraplanMode?: boolean            // Remote-side flag (set via set_permission_mode)
