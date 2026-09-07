/**
 * Porte COMPLETO de `ccnmt: packages/agent/worktreeModeEnabled.ts`.
 *
 * El modo worktree está habilitado incondicionalmente para todos los
 * usuarios. Antes se controlaba por la bandera de GrowthBook
 * `tengu_worktree_mode`, pero el patrón `CACHED_MAY_BE_STALE` devuelve el
 * default (`false`) en el primer arranque, antes de poblar la caché —
 * tragándose `--worktree` en silencio. Ver
 * https://github.com/anthropics/claude-code-how-works-how-works/issues/27044
 * (cita de la fuente).
 */
export function isWorktreeModeEnabled(): boolean {
  return true
}
