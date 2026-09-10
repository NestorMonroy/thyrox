// ══════════════════════════════════════════════════════════════════
// restored-src/src/bridge/bridgePermissionCallbacks.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 1 · líneas de código: 6
// Mencionado en: part6/ch20.md
// ══════════════════════════════════════════════════════════════════

// ─── part6/ch20.md · líneas 3-8 ───
type BridgePermissionResponse = {
  behavior: 'allow' | 'deny'
  updatedInput?: Record<string, unknown>
  updatedPermissions?: PermissionUpdate[]
  message?: string
}
