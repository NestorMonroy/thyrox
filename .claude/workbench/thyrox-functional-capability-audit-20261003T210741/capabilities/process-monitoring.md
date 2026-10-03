# process-monitoring — capability assessment

Regenerado por `probes/assemble_report.py` desde `capabilities/assessments.json`; las transiciones conservan cada cambio de estado con su evidencia.

## trabajos y procesos

**current_state:** REAL_VERIFIED

**gap:** 2 trabajos A6 SIN-RECOGER (outputs/dims/04-images-jobs.txt)

| timestamp | previous | new | evidence |
|---|---|---|---|
| 2026-10-03T21:11Z | — | REAL_VERIFIED | `snapshots/report-20261003T211141Z-eb9d035f2.md` |

## vigilante del ítem

**current_state:** REAL_VERIFIED (pruebas host y unidad)

**gap:** no disparó en una corrida real

| timestamp | previous | new | evidence |
|---|---|---|---|
| 2026-10-03T21:11Z | — | ABSENT (bloqueante 5) | `snapshots/report-20261003T211141Z-eb9d035f2.md` |
| 2026-10-03T22:00Z | ABSENT | INTEGRATED (host) | `outputs/annul-f7-watchdog.txt` |
| 2026-10-03T22:16Z | INTEGRATED (host) | INTEGRATED (host y unidad) | `outputs/annul-f7-unit-live.txt; H-THYROX-467` |
