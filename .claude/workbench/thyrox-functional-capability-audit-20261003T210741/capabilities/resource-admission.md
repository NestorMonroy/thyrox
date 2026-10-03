# resource-admission — capability assessment

Regenerado por `probes/assemble_report.py` desde `capabilities/assessments.json`; las transiciones conservan cada cambio de estado con su evidencia.

Notas de evidencia textuales: [`evidence/snapshot-sections/resource-admission.md`](../evidence/snapshot-sections/resource-admission.md)

## admisión RAM

**current_state:** REAL_VERIFIED, mide el cgroup equivocado

**gap:** H-THYROX-471

| timestamp | previous | new | evidence |
|---|---|---|---|
| 2026-10-03T21:11Z | — | REAL_VERIFIED | `snapshots/report-20261003T211141Z-eb9d035f2.md` |
| 2026-10-03T23:18Z | REAL_VERIFIED | REAL_VERIFIED, mide el cgroup equivocado | `outputs/resources/ram.txt` |

## admisión CPU

**current_state:** INTEGRATED

| timestamp | previous | new | evidence |
|---|---|---|---|
| 2026-10-03T21:11Z | — | ABSENT | `snapshots/report-20261003T211141Z-eb9d035f2.md` |
| 2026-10-03T22:22Z | ABSENT | INTEGRATED | `outputs/annul-0932-cpu.txt; commit def5a0845` |

## admisión disco

**current_state:** REAL_VERIFIED

| timestamp | previous | new | evidence |
|---|---|---|---|
| 2026-10-03T21:11Z | — | REAL_VERIFIED | `snapshots/report-20261003T211141Z-eb9d035f2.md` |
