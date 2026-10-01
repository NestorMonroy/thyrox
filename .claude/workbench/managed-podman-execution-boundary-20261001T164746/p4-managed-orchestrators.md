# P4 — Los orquestadores restantes por la misma frontera

Tarea: TASK-THYROX-0743. Paso 6 de `template.md`.

## Objetivo

`run-task-pool`, `parallel_map`, `wait-jobs register --run`/`dispatch` y los lanzamientos de
`tsc_cycle` ejecutan su payload en unidades por `managed_execution.sh`; `thyrox-bg` ya lo hace
(`9429f0984`).

## Estado inicial medido

`outputs/p4-initial.txt` (al abrir): qué argv ejecuta cada orquestador en el host. Medido antes de
este banco: `tsc_cycle` lanza `bash -c "...bash bin/headless-pool ... < items"` y
`env PYTHONPATH=... python pool_pipeline.py ...`, que `thyrox-bg` ya rehúsa sin `--task`.

## Archivos que puede modificar

`src/session/{run-task-pool,parallel_map,wait-jobs}.sh` y módulos que invocan; `src/verify/tsc_cycle.py`;
`src/session/headless-pool.sh` sólo para `--items FILE` y `--memfree-reserve SIZE`; sus suites.

## Mecanismos que reutiliza

`managed_execution.sh`, `control_plane_entries.tsv`, `thyrox-bg --task`, `job_ledger`, `task_pool`,
GNU Parallel vía `parallel_map`.

## Invariantes

1. Cada payload ejecutado por un orquestador lleva `--task` y `--kind` y corre en una unidad.
2. Un payload sin tarea sólo pasa si el orquestador es una entrada declarada del plano de control y
   el payload es de observación (esperar, estado, reconciliar), no de construcción.
3. Ningún `bash -c <payload>` construido por un orquestador corre en el host.

## Prueba RED

`outputs/p4-red.log`: cada orquestador con el doble de runner exige la envoltura; `tsc_cycle` exige
`--task`, `--items`, `--memfree-reserve` y argv absoluto de `bin/headless-pool` sin `bash -c`.

## Implementación mínima

Envolver el payload de cada orquestador; `--items`/`--memfree-reserve` en headless-pool; `task` en
los lanzamientos de `tsc_cycle`.

## Prueba GREEN

`outputs/p4-green.log`: suites de cada orquestador y `tests/verify/test_tsc_cycle.py`, cada una con
su código de salida.

## Control de anulación

`outputs/p4-annulment.log`: quitar la envoltura de un orquestador → caen exactamente sus aserciones.

## Evidencia que guarda

`outputs/p4-initial.txt`, `p4-red.log`, `p4-green.log`, `p4-annulment.log`, `p4-diff.txt`.

## Criterio de cierre

GREEN y anulación; la prueba de arquitectura de p2 no tiene excepciones para ningún orquestador.

## Qué NO pertenece a p4

headless-pool como ejecutor (p3), el e2e (p5), política de modelos.
