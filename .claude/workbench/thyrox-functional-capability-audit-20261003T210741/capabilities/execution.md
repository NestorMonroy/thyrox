# execution — capability assessment

Regenerado por `probes/assemble_report.py` desde `capabilities/assessments.json`; las transiciones conservan cada cambio de estado con su evidencia.

## ejecución en unidad gestionada

**current_state:** REAL_VERIFIED

**gap:** imagen por defecto :dev ausente; funciona sólo con THYROX_EXEC_IMAGE al digest publicado (H-THYROX-469)

| timestamp | previous | new | evidence |
|---|---|---|---|
| 2026-10-03T21:11Z | — | REAL_VERIFIED | `snapshots/report-20261003T211141Z-eb9d035f2.md` |

## worktree aislado + verify + integración

**current_state:** REAL_VERIFIED

**gap:** huérfanos: item_worktree sweep-orphans con rescate (usado hoy, outputs/salvaged/)

| timestamp | previous | new | evidence |
|---|---|---|---|
| 2026-10-03T21:11Z | — | REAL_VERIFIED | `snapshots/report-20261003T211141Z-eb9d035f2.md` |

## localidad (thyrox-* nunca own)

**current_state:** REAL_VERIFIED

| timestamp | previous | new | evidence |
|---|---|---|---|
| 2026-10-03T21:11Z | — | ABSENT (bloqueante 3) | `snapshots/report-20261003T211141Z-eb9d035f2.md` |
| 2026-10-03T23:21Z | ABSENT | REAL_VERIFIED | `experiments/repo-code-change-*/evidence.json (served-by local:true)` |

## fallback de selección y local→local

**current_state:** IMPLEMENTED

**gap:** ningún salto real ejercido

| timestamp | previous | new | evidence |
|---|---|---|---|
| 2026-10-03T21:11Z | — | IMPLEMENTED (dobles) | `snapshots/report-20261003T211141Z-eb9d035f2.md` |
