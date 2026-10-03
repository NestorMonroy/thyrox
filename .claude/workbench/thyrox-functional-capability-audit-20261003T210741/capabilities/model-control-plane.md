# model-control-plane — capability assessment

Regenerado por `probes/assemble_report.py` desde `capabilities/assessments.json`; las transiciones conservan cada cambio de estado con su evidencia.

## convergencia tras reciclado

**current_state:** REAL_VERIFIED

| timestamp | previous | new | evidence |
|---|---|---|---|
| 2026-10-03T21:11Z | — | PARTIAL | `snapshots/report-20261003T211141Z-eb9d035f2.md` |
| 2026-10-03T21:30Z | PARTIAL | REAL_VERIFIED | `outputs/real-0928-converge.log` |

## catálogo / import / validación

**current_state:** REAL_VERIFIED

**gap:** defaults inservibles aquí (H-THYROX-469)

| timestamp | previous | new | evidence |
|---|---|---|---|
| 2026-10-03T21:11Z | — | REAL_VERIFIED (sin entrada declarada) | `snapshots/report-20261003T211141Z-eb9d035f2.md` |
| 2026-10-03T22:28Z | sin entrada declarada | entrada declarada | `commit 3116cf25f` |

## materialización en la unidad

**current_state:** REAL_VERIFIED

**gap:** dos copias por modelo (H-THYROX-471)

| timestamp | previous | new | evidence |
|---|---|---|---|
| 2026-10-03T21:11Z | — | REAL_VERIFIED | `snapshots/report-20261003T211141Z-eb9d035f2.md` |

## selección de modelo

**current_state:** INTEGRATED (dos activas + una desconectada)

**gap:** #12

| timestamp | previous | new | evidence |
|---|---|---|---|
| 2026-10-03T21:11Z | — | INTEGRATED, tres autoridades | `outputs/05-selection-authorities.txt` |
| 2026-10-03T23:21Z | tres autoridades | dos activas + providerSelection sin consumidores | `outputs/dims/02-redis-selection.txt` |
