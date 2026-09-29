# D4-A: merge de tres vías del store y gate de completitud de hallazgos

Banco del pool que implementa, en dos ítems disjuntos por archivo:

| Ítem | Tarea | Archivos |
|---|---|---|
| 1 | TASK-THYROX-0626 — merge de tres vías con conflictos explícitos | `src/agents/merge_sqlite_union.py`, `src/agents/store_field_classes.py` (nuevo), `tests/agents/test_merge_sqlite_union.py` (nuevo), `tests/agents/test_store_field_classes.py` (nuevo), `tests/agents/test-merge-sqlite-union.sh` |
| 2 | TASK-THYROX-0629 — gate de completitud por sesión y `pre-push` | `src/verify/check_finding_id_unique.py`, `tests/verify/test_finding_id_unique.py`, `.githooks/pre-push` (nuevo), `tests/verify/test_pre_push_finding_gate.sh` (nuevo) |

El contrato lo gobierna `.claude/workbench/datos-d4-inventario-20260929T221846/README.md`,
§8 (decisión del cierre) y §10 (merge de tres vías). Fuera del pool, con tarea
propia: el cableado del cierre limpio de sesión (TASK-THYROX-0630), porque hoy
no existe un evento de cierre que pueda rechazarse, y el relleno de los 78
hallazgos sin `.rst` (TASK-THYROX-0628), que escribe en `kaupamex-docs`.

Antes de lanzar, la deuda heredada del gate quedó congelada en el baseline del
consumidor (`kaupamex-docs@eb39a749f`), para que `pre-push` bloquee sólo
huecos nuevos.

## Resultado

El pool terminó en 1030.88 s, con los 2 ítems cerrados (`outputs/run.closed`).

| Ítem | Veredicto del pool | Veredicto tras revisión | Commit |
|---|---|---|---|
| 1 | `verificado` | 28 pruebas y 19 aserciones en verde | `7df04d6e` |
| 2 | `rechazado` | 19 de 19 del gate y 9 de 9 del `pre-push` | `9899d091` |

**El rechazo del ítem 2 lo produjo el `--verify` de `launch.sh`, no el código.**
El verify corría con `pytest` todo `tests/**/test_*.py` tocado, y
`tests/verify/test_finding_id_unique.py` es un guion con `main()`: pytest trató
como fixture el parámetro `tree` de sus funciones y dio 10 errores de
preparación (`outputs/2.verify.log`). Ejecutado como guion, desde un worktree
dentro de thyrox, pasa entero. Se integró a mano porque `pool_integrate` sólo
aplica los `verificado`.

**Correcciones al ítem 1 antes del commit**, que el verify no podía ver:

- sus dos pruebas importaban `pytest`, que ninguna otra prueba de `tests/`
  usa y que el pyright del árbol no resuelve; se reescribieron como guion con
  `main()`, sin cambiar lo que miden;
- tenían imports dentro de funciones; se subieron al módulo;
- una variable sin uso en `test-merge-sqlite-union.sh` (SC2034).

**Control de anulación** del merge: con `decide_row` ignorando el ancestro
caen exactamente los 8 casos que dependen de él y siguen verdes los 13 que no
(inserciones, `resolve_target_row` y los dos controles sin ancestro).

**Contra el store real** (`probes/real-store-smoke.sh`: HEAD~6 como base, HEAD
como nuestro, HEAD~3 como suyo): 0 conflictos, `integrity_check` = `ok`. Las 7
tablas reales del store están declaradas en `store_field_classes`, así que el
driver no aborta sobre él.

*Métrica:* veredicto de cada prueba derivada ejecutada sobre el árbol
integrado (`probes/derived-tests.sh`) más el smoke sobre tres versiones reales.
*Ciega a:* un conflicto real entre dos sesiones concurrentes: las tres
versiones del smoke son lineales en la historia de una sola rama.
