# Serie de variables únicas tras Branch A — repo-code-change@1

Una variable por corrida, n = 1 por corrida (varianza de muestreo no medida: las diferencias de calidad entre
corridas son indicios, no efectos). Cada fila enlaza su `experiments/<dir>/RECORD.md`.

| # | Variable | Modelo | Corrida válida | Resultado | Efecto medido |
|---|---|---|---|---|---|
| 0 | línea base post-Branch-A | qwen2.5-7b | `rcc-baseline-q25-8k-post-branch-a` | `sin-cambios` (Edit no literal) | — |
| 1 | contexto 8K → 16K | qwen2.5-7b | `rcc-q25-16k-var-context-b` | `sin-cambios`, 3710 tokens usados | ninguno: el contexto no limita |
| 2 | `Edit` muestra líneas cercanas | qwen2.5-7b | `rcc-q25-8k-var-edit-feedback-r3` | `detenido` (bucle), la línea exacta le llegó 3 veces | ninguno para este modelo |
| 3 | rechazo de NUL | qwen3-4b | `rcc-q3-4b-8k-var-nul` | `detenido`, 6 de 7 pruebas; ningún NUL | no ejercida |
| 4 | vigilante cuenta un cambio nuevo como progreso | qwen3-4b | `rcc-q3-4b-8k-var-workflow` | `detenido` por bucle real, 5 de 7 | correcto: deja iterar, sigue cortando bucles |

Corridas inválidas, con su causa corregida antes de repetir: `rcc-q25-8k-var-edit-feedback` (stream-json no
fluía, H-THYROX-475), `rcc-q25-8k-var-edit-feedback-r2` (la variable estaba en el `Edit` que el trabajador no usa).

## Defectos de infraestructura que la serie destapó y corrigió

| Defecto | Commit |
|---|---|
| `thyrox -p --output-format stream-json` sólo escribía al salir; el vigilante detenía trabajadores sanos | `3f4ac87a6` |
| el stream no traía `tool_result`: los rechazos de herramienta eran invisibles | `3f4ac87a6` |
| dos `Edit` distintos; el cambio había ido al que el trabajador no usa | `180b9c3d8` |
| una detención bajo `--local-only` salía `no-local` | `7b0632132` |
| el vigilante contaba como repetición una prueba tras un cambio nuevo | `55609b9b2` |

## Clasificación actual de H-THYROX-470

Las causas TOOL_PROTOCOL, WORKFLOW y RUNTIME_PROFILE medidas en la serie están corregidas o descartadas. Lo que
queda en las dos corridas válidas finales es MODEL_CAPABILITY: qwen2.5-7b escapa como regex y no usa la línea que
se le da; qwen3-4b importa dependencias inexistentes y no resuelve el corte en límite de palabra. No se
extrapola a modelos no probados.
