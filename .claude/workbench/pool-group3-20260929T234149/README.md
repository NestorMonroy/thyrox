# Grupo 3 del Pool lifecycle

Cuatro ítems disjuntos por archivo, sin decisión pendiente (`launch.sh`):

| # | Tarea | Archivos |
|---|---|---|
| 1 | TASK-THYROX-0622 — snapshots periódicos en RUNNING (0601d) | `src/session/headless-pool.sh` (bucle de fotos), `snapshot_store.py`, `.env.example`, `tests/session/test-headless-pool-lifecycle.sh` |
| 2 | TASK-THYROX-0245 — sin rutas absolutas en el `.env` versionado | `.env`, `.env.example`, `src/session/generate_bin.py`, prueba nueva |
| 3 | TASK-THYROX-0437 — presupuesto de módulos por camino de arranque | gate nuevo en `src/verify/`, su envoltorio, baseline y prueba |
| 4 | TASK-THYROX-0438 — informe del perfilador fuera del REPL | `startupProfiler.ts`, `cli.tsx`, prueba nueva |

Los ítems 1 y 2 tocan los dos `.env.example`: el 1 sólo añade una línea y el 2
retira claves. `pool_integrate` declarará conflicto si los parches se
solapan; en ese caso el segundo se aplica a mano sobre el primero.

**Queda para el grupo siguiente** TASK-THYROX-0549 (el verify escribe en la
caché del árbol principal): toca `headless-pool.sh` igual que el ítem 1, y su
causa es la misma clase que el ítem 2 (una ruta absoluta del `.env`).

**Cambio en el verify** respecto del grupo anterior: además de ejecutar cada
prueba en su forma, corre `check_lint_zero` sobre los `.py` y `.sh` tocados y
`check_package_typecheck --strict` sobre los paquetes TS tocados. En el grupo
2 las pruebas pasaron y el pre-commit rechazó dos ítems por pyright y
shellcheck; ahora eso lo ve el pool.
