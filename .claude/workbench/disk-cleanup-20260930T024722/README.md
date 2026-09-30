# Limpieza de disco del 2026-09-30

Por directiva del ejecutor se retiraron, verificando antes que ningún proceso
los usaba:

| Qué | Tamaño | Verificación |
|---|---|---|
| `/home/user/thyrox-lifecycle` (worktree de `feature/thyrox-l6-pool-lifecycle`) | 2.0 GB | 0 cambios; sus 6 commits ya están en `feature/thyrox-l6` como parches equivalentes (`git cherry`); retirado con `git worktree remove` sin `--force` |
| `/home/user/kaupamex-api` | 105 MB | 0 cambios; HEAD `39d5bde` publicado en `origin/feature/tool-use-preflight-rename` (`git ls-remote`) |
| `/home/user/cwd-de-prueba-plans` | 8 KB | sólo un directorio vacío |
| worktree de scratchpad `…5e7e7dba9691-1/…/work-1` | 1.8 GB | 2 cambios (`src/session/item_worktree.sh`, `tests/session/test-headless-pool-worktree.sh`) guardados en `work-1.patch` sobre la base de `work-1.base` |
| `/tmp/tmp.*` y `/tmp/thyrox-tests-*` | ~450 MB, 68 directorios | ninguno abierto por un proceso ni posterior al lanzamiento del grupo 4 |

Disco libre: 880 MiB antes, 5.4 GB después.

Causa del crecimiento: cada copia completa de thyrox ocupa ~1.9 GB porque el
repositorio versiona `.claude/workbench`, `.claude/jobs` y
`_references/claude-code-bin`; se acumularon siete copias (pools muertos,
sondas y worktrees de pruebas). TASK-THYROX-0631 evita esto para los ítems del
Pool (checkout disperso).
