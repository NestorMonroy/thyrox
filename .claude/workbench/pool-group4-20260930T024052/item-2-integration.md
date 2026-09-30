# Ítem 2 — TASK-THYROX-0549, integrado a mano

Veredicto del pool: `con-stash`. Las 111 líneas de `2.stash-attempts` son todas
`git stash list` dentro de los repos que crea `test-headless-pool-worktree.sh`
bajo el worktree del ítem: lecturas de la línea base de `item_worktree.sh`, no
intentos del ítem. El guardián las rechazaba (corregido en TASK-THYROX-0632), y
esa precedencia tapó el resultado real.

El parche (`2.patch`: `src/session/item_worktree.sh`,
`tests/session/test-headless-pool-worktree.sh`) se aplicó con `git apply` y se
verificó en el árbol principal
(`.claude/jobs/g4-item2-verify-20260930T024940/`):

- `test-headless-pool-worktree`: 42/42 (caso 12 nuevo: el verify no escribe en
  THYROX_CACHE_DIR, THYROX_JOBS_DIR, THYROX_WORKBENCH_DIR ni
  THYROX_BACKGROUND_LOG_DIR del árbol principal);
- stash 28/28, sparse 11/11, disk 8/8;
- `check_lint_zero`: 0 hallazgos en los tres `.sh` tocados.

Control de anulación declarado por el ítem (`2.json`): sin el reemplazo de las
rutas caen exactamente las 4 aserciones del caso 12 (38/42).
