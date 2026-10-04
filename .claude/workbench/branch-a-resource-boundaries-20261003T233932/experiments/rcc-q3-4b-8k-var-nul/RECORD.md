# Experimento — variable 3: rechazo de NUL, qwen3-4b (inmutable) — VARIABLE NO EJERCIDA

Lanzado 2026-10-04T01:56:02Z (`.claude/jobs/rcc-q3-4b-nul-20261004T015602/`), base `65f129c89` + registros.
qwen3-4b `bc640142` (blob `7485fe6f`, montado desde la caché), ctx 8192.

## OBSERVATION

- ninguna llamada llevó un NUL (`\u0000`): el rechazo no se disparó;
- `ls -R`, `Read`, `grep` de la definición; después seis ciclos `Edit` → `Bash` (pruebas), cada `Edit` distinto y
  **aplicado** (`old_string` literal, con la sangría exacta);
- las pruebas pasaron de `.F.....` (6 de 7) a `.FF.FF.` y volvieron a `.F.....`; falla sólo
  `test_cuts_at_a_word_boundary` (el cuerpo es `slugify(title[:max_length])` con recortes de guiones);
- el vigilante lo detuvo: `repeated-tool-call 5 en total` (la orden de pruebas); veredicto `detenido`
  (correcto, tras `7b0632132`).

## INTERPRETATION

Variable 3 no ejercida: sin NUL no se mide su efecto. Lo que esta corrida sí mide: con el `Edit` literal y el
stream visible, qwen3-4b hace TDD real —edita, prueba, corrige— y el límite que lo corta es el del vigilante,
que contaba como repetición una orden de pruebas con un cambio nuevo aplicado entre cada ejecución (WORKFLOW /
RUNTIME_PROFILE, no MODEL_CAPABILITY). El caso que falla exige cortar en límite de palabra, que el modelo no
llegó a intentar.

## CURRENT VERDICT

Sin efecto medible de la variable 3. La siguiente, reglas del flujo del trabajador: el vigilante cuenta un
cambio nuevo aplicado como progreso.
