# podman — capability assessment

Regenerado por `probes/assemble_report.py` desde `capabilities/assessments.json`; las transiciones conservan cada cambio de estado con su evidencia.

## autoridad de materialización

**current_state:** INTEGRATED

**gap:** 5 excepciones pendientes (0746, 0759×3) — src/verify/podman_*_pending.txt

| timestamp | previous | new | evidence |
|---|---|---|---|
| 2026-10-03T21:11Z | — | INTEGRATED | `gates check_podman_* (0 violaciones)` |

## observación (observe)

**current_state:** PARTIAL

**gap:** sin logs/stats/health (#20)

| timestamp | previous | new | evidence |
|---|---|---|---|
| 2026-10-03T21:11Z | — | PARTIAL | `outputs/03-podman-direct.txt` |

## volumen durable perdido

**current_state:** INTEGRATED

**gap:** no ejercido en real

| timestamp | previous | new | evidence |
|---|---|---|---|
| 2026-10-03T22:40Z | ABSENT | INTEGRATED | `outputs/annul-464-durable-volume.txt; commit 70ef69843` |

## ciclo de vida de imágenes

**current_state:** PARTIAL

**gap:** catálogo declara 1 imagen; defaults :dev (H-THYROX-469)

| timestamp | previous | new | evidence |
|---|---|---|---|
| 2026-10-03T21:11Z | — | PARTIAL | `outputs/04-artifacts.txt` |
