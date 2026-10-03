# persistence — capability assessment

Regenerado por `probes/assemble_report.py` desde `capabilities/assessments.json`; las transiciones conservan cada cambio de estado con su evidencia.

## PostgreSQL + pgvector

**current_state:** REAL_VERIFIED como servicio; no consumible

**gap:** corpus perdido (H-THYROX-464)

| timestamp | previous | new | evidence |
|---|---|---|---|
| 2026-10-03T21:11Z | — | REAL_VERIFIED | `snapshots/report-20261003T211141Z-eb9d035f2.md` |
| 2026-10-03T23:21Z | REAL_VERIFIED | no consumible: ninguna THYROX_*_DATABASE_URL en .env | `outputs/dims/01-batch.txt` |
