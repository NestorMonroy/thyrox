# Experimento — repo-code-change@1, qwen2.5-7b, 8K, tras Branch A (inmutable)

Lanzado 2026-10-03T23:59:11Z, cerrado 2026-10-04T00:05:23Z (`.claude/jobs/rcc-baseline-q25-post-a-20261003T235911/`).
Variables: modelo `bb5d59e0` (blob `1875fb29`, montado desde la caché), ctx 8192, presupuesto de sistema 2048
(suite), herramientas Read/Write/Edit/Bash, timeout 5400 s. Cambio respecto de las corridas previas: sólo
Branch A (admisión en la frontera de la unidad, sin copia del artefacto).

## OBSERVATION

- veredicto `sin-cambios`; cualificación `suspendida` 0/1, 1.1 tok/s (contended);
- 5 turnos, 3790 tokens de entrada y 380 de salida (`title-slug/pool/1.stream.jsonl`, evento `result`);
- turnos: 1 `Read` de `textkit/slug.py`; 3 `Edit` con `old_string` `raise NotImplementedError\(` y dos veces
  `raise NotImplementedError('title_slug')`; el archivo dice `raise NotImplementedError("title_slug")`
  (línea 21): ninguno coincide;
- el `new_string` llama `_split_title`, que no existe en el archivo (`grep -c "def _split_title"` → 0);
- cierre: el modelo declara que no encuentra la cadena y pide la implementación;
- el stream del trabajador no registra los `tool_result`: el texto del rechazo de `Edit` no es observable.

## INTERPRETATION

Dos causas, separables: (1) TOOL_PROTOCOL — el `old_string` no es literal (escape de regex, comillas
cambiadas) y nada le devuelve al modelo el texto real a reemplazar; (2) MODEL_CAPABILITY — la implementación
propuesta referencia código inexistente. El contexto no fue limitante en esta corrida (3790 de 8192).

## CURRENT VERDICT

Branch A no cambió el resultado del flujo para qwen2.5-7b: sigue fallando, ahora en 6 min y por `Edit`, no
por desbordamiento de contexto. La siguiente variable con evidencia directa es el `Edit` literal; el
presupuesto de contexto se mide igualmente, una variable a la vez.
