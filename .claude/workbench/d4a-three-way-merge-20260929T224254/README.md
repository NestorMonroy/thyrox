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
