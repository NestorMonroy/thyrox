# Experimento — variable 2: `Edit` con líneas cercanas (inmutable) — INVÁLIDO

Lanzado 2026-10-04T00:25:42Z (`.claude/jobs/rcc-q25-edit-feedback-20261004T002542/`), base `3fcd39271`.

## OBSERVATION

- veredicto `no-local`, 0.0 tok/s; el vigilante detuvo el ítem: `no-progress 1800 s sin eventos en 1.live.jsonl`;
- `1.live.jsonl` y `1.stream.jsonl`: 0 bytes; `1.err`: la etapa `wait` de la unidad leyó una salida vacía;
- `1.patch` NO está vacío: el trabajador reescribió `textkit/slug.py` con el contenido envuelto en vallas
  ```` ```` ```` (archivo roto) y un cuerpo de `title_slug`;
- `src/packages/cli/src/entry/print.ts` (base `3fcd39271`, líneas 249-262): `stream-json` se reconstruía del
  transcript y se escribía sólo después de terminar el bucle.

## INTERPRETATION

El ítem estaba trabajando: su salida no existía hasta la salida del proceso, y el vigilante lo leyó como
«sin progreso». El veredicto `no-local` sale de un stream vacío, no de un servicio remoto. La variable no se
midió (H-THYROX-475).

## CURRENT VERDICT

Inválido como medida de la variable 2. Se repite tras corregir `stream-json` para que fluya.
