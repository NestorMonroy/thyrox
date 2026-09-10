// ══════════════════════════════════════════════════════════════════
// restored-src/src/state/AppState.tsx
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 1 · líneas de código: 5
// Mencionado en: part1/ch01.md
// ══════════════════════════════════════════════════════════════════

// ─── part1/ch01.md · líneas 142-163 ───
export function useAppState(selector) {
  const store = useAppStore();
  const get = () => selector(store.getState());
  return useSyncExternalStore(store.subscribe, get, get);
}
