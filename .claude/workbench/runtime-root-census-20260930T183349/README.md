# runtime-root-census

## El encargo

«si tienes documentado cómo se usa el .thyrox/runtime, inspecciona lo que
tenemos implementado».

## La premisa, si se corrigio al primer comando

`.env.example` describe `THYROX_RUNTIME_DIR` como el runtime de los
lanzadores «(`headless-pool`, más adelante `thyrox-bg`)». Es falso por
defecto: hoy lo usan seis escritores, `thyrox-bg` incluido.

## La raíz

Dos funciones con la misma resolución: `THYROX_RUNTIME_DIR`, o
`<THYROX_ROOT>/.thyrox/runtime`. `src/lib/launcher_freeze.sh::thyrox_runtime_dir`
(shell) y `src/session/pool_lifecycle.py::runtime_root` (Python). Ignorada por
git (`.gitignore:189`).

## Quién escribe en cada subdirectorio y quién lo retira

| subdirectorio | escritor | se retira | hoy (2026-09-30T18:3x) |
|---|---|---|---|
| `launchers/<nombre>-<ts>-<pid>/` | `launcher_freeze.sh` (la copia congelada de la capa de shell de `headless-pool`) | al salir el lanzador | 1: el pool en curso |
| `jobs/<run>/salida.log` | `bg.sh` (`_family_logs`): el log vivo de `thyrox-bg` | al terminar, el trabajo lo publica en `.claude/jobs/<run>/outputs/` y lo borra; si muere sin publicar, queda | 2: el pool en curso y `impl-pool-a-20260930T073552` |
| `pool/<run-id>/` | `pool_lifecycle.py` (`open-run`, estado por ítem) | `close_run`; con ítems sin cerrar se conserva para `reconcile` | 2 runs + `locks/` |
| `pool/locks/` | `pool_lifecycle.py` | no | presente |
| `snapshots/<run>/<item>/<gen>.json` | `snapshot_store.py` (el manifiesto de cada foto) | nunca (TASK-THYROX-0650) | 9 runs |
| `recovery/<run>-<item>-g<gen>/` | `recovery_controller.py` | `recover` lo retira al terminar | 0 |
| `docs-publisher/locks/` | `documentation_publisher.py` | al soltar el lock | 0 |

Aparte, en otra raíz: los worktrees de los ítems viven en
`<raíz del repo>/.thyrox/pool-worktrees/` o bajo `THYROX_POOL_WORKTREES_DIR`
(`src/session/item_worktree.sh:29-45`), no bajo `THYROX_RUNTIME_DIR`.

## Lo que el inventario muestra

- **El run de las 07:35 no es un fallo: es un run superado que nadie
  retira.** `pool/683a1e95cfc3-20260930T073553-11106` (salida
  `task-census-20260930T064202/impl-pool-a/outputs`) tiene sus 5 ítems en
  `ABANDONED_RECOVERABLE`: el pool murió, y el ciclo de vida conservó el
  runtime para `reconcile`, como está diseñado. Sus worktrees 1 y 3 siguen en
  `.thyrox/pool-worktrees/683a1e95cfc3/`, y su log vivo en
  `jobs/impl-pool-a-20260930T073552/`. El pool se relanzó en `outputs-2`,
  que terminó bien. Ningún mecanismo retira un run abandonado cuyo trabajo
  ya rehízo otro. Las fotos no caducan (TASK-THYROX-0650), y un run
  abandonado tampoco: TASK-THYROX-0660, decisión del ejecutor porque retira
  worktrees.
- **La documentación no enumera el runtime.** `README.md` y `.claude/rules/`:
  0 menciones. kaupamex-docs: 9 menciones sueltas en 7 archivos, ninguna con
  la tabla de arriba. `.env.example` describe sólo los lanzadores.

*Metrica:* escritores que pasan por `thyrox_runtime_dir` o `runtime_root`,
entradas del runtime real y menciones en la documentación.
*Ciega a:* un escritor que componga la ruta a mano sin esas dos funciones.
