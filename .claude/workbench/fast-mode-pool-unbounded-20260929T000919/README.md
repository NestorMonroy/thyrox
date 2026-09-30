# Pool del modo rápido sin tope de turnos

Tres ítems de 2.1.283 con `headless-pool --isolation worktree`, runner por
defecto (`thyrox -p`, que en este entorno delega en `claude -p`), sin
`--max-turns` y con `--timeout 3600` (`launch.sh`).

| Ítem | Resultado | Turnos | Causa |
|---|---|---|---|
| 1 — R-2b-3 (`Yl`, `Ndn`, `oA`) | rechazado | 71 | no pudo escribir `fastModeSelection.ts`: el worktree bajo `.git/` es ruta sensible para `claude -p`; además lanzó `tests/run.sh` en segundo plano y cerró su turno esperando una reanudación que en -p no llega |
| 2 — R-2c (`vV`, alcance del respaldo) | verificado | 79 | integrado con `bin/pool_integrate` |
| 3 — R-2b-4 (`Rte`, `K$`) | no arrancó | — | `worktree add` chocó con el candado de git mientras un commit corría sus hooks |

Lo que el pool destapó y quedó corregido:
- **turnos:** 71 y 79 turnos sin corte. El tope fijo de 12/20 ya no existe.
- **ruta sensible:** worktrees en `.thyrox/pool-worktrees/`
  (`worktree-location-20260929T002337`).
- **candado de git:** reintentos con plazo y motivo de git en el `.err`
  (`worktree-retry-20260929T001844`).

Lo que queda abierto: el ítem 1 escribió su trabajo en el `.claude/jobs` del
árbol principal (`.claude/jobs/baseline-run-20260929T001912`), fuera de su
worktree. Es la tarea #250.

Correcciones al parche del ítem 2 al integrarlo:
- dos pruebas usaban `Claude-...` con mayúscula, y pasaron a `claude-OPUS-...`
  y `claude-PREVIEW-...` conservando la prueba de mayúsculas;
- se declaró `THYROX_CODE_MODEL_SCOPE_LISTED_MODELS` en `.env.example`.

*Métrica:* veredicto de `item_worktree finalize` por ítem y `num_turns` del
`result`.
*Ciega a:* si el porte del ítem 2 es completo frente a `vV` de 2.1.283; su
suite verifica lo que el propio ítem escribió.
