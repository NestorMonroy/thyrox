# Experimento — variable 2, tercera: `Edit` con líneas cercanas en las dos herramientas (inmutable)

Lanzado 2026-10-04T01:26:19Z (`.claude/jobs/rcc-q25-edit-feedback-r3-20261004T012619/`), base `180b9c3d8`.
Única variable respecto de la línea base post-Branch-A: el rechazo de `Edit` muestra las líneas cercanas, ahora
en `@thyrox/tools` (el `Edit` del trabajador).

## OBSERVATION

- la variable llegó: los tres rechazos dicen `la cadena no aparece …` + `21:     raise NotImplementedError("title_slug")`;
- el modelo reenvió las tres veces el mismo `old_string` escapado como regex,
  `raise NotImplementedError\("title_slug"\)`, sin usar la línea ofrecida;
- antes y después, `Bash` con las pruebas (`.EEEEEE`, 6 errores) cuatro veces, sin cambio entre medias;
- el vigilante lo detuvo: `identical-tool-call 3 consecutivas` (la orden de pruebas);
- veredicto registrado `no-local` con 0 tok/s: `finalize` comprobaba `--local-only` antes que el vigilante, y una
  unidad detenida no escribe su línea served-by (`1.live.jsonl` 34 281 bytes; `1.stream.jsonl` 0).

## INTERPRETATION

La variable 2 se midió y no basta para qwen2.5-7b: el texto exacto estuvo delante y no lo usó. Lo que impide
el avance aquí es MODEL_CAPABILITY (escape de regex persistente, repetición sin cambio), no información del
protocolo. El veredicto `no-local` era un defecto de clasificación, corregido aparte: con el vigilante primero,
esta corrida habría salido `detenido`.

## CURRENT VERDICT

Variable 2 medida: sin efecto en el resultado para este modelo. La mejora del rechazo se conserva (es correcta
y barata); no se presenta como causa de éxito. Siguiente variable: rechazo de NUL.
