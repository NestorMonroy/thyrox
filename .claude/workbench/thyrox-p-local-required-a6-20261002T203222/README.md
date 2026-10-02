# thyrox-p-local-required-a6

## El encargo

<!-- verbatim, sin parafrasear -->
«E0 + A4-managed → A6 local-required E2E → bootstrap exception TERMINA», con la
cualificación de tarea pequeña antes de cerrar la excepción.

## La premisa, si se corrigio al primer comando

A6 se planteó como `thyrox -p` → recomendador → qwen3-4b. Medido: `thyrox -p`
no consulta el recomendador (`src/packages/cli/src/entry/` no lo nombra); quien
deriva el modelo es `headless-pool` (`--task-class` → `bin/agent-recommend`),
que luego lanza `thyrox -p --model <contractual>` en una unidad gestionada.

El primer intento (`.claude/jobs/a6-local-required-20261002T203257/`) salió 2:
el recomendador, bajo la política versionada (sin respaldo), rehusó por **no
haber cualificación de TAREA aprobada de la clase mecanica**:
`qualifiedModels` (`@thyrox/model-artifacts/modelQualification.ts`) exige
protocolo aprobado **y** `task:<clase>` aprobada. Las filas A4 son sólo de
protocolo. Rehusar fue lo correcto (falla cerrada, ningún respaldo a API).

Consecuencia de orden: la cualificación de tarea precede a A6, no lo sigue.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/prompt.md` | plantilla del ítem de A6 |
| `src/packages/local-models/suites/batch-worker-mecanica-1.json` | suite de tarea mecanica, promovida desde `embedding-route-and-local-workers-20261002T093053/w1/` (REUSE) |

## Los resultados

*Metrica:* salida del pool, veredicto por ítem, admisión registrada en el
coordinador, fila de la cualificación de tarea en el store.
*Ciega a:* la calidad de la respuesta más allá de las comprobaciones de la suite.

## Elegibilidad frente a prueba (directiva del ejecutor 2026-10-02)

La suite `batch-worker-mecanica@1` decide **elegibilidad** (`qualifiedModels`
exige `task:<clase>` aprobada); no prueba autoimplementación. Medir el cierre
del bootstrap con la misma suite que seleccionó al modelo mediría dos veces lo
mismo. La prueba de autoimplementación es una tarea de código **independiente**
—ni tomada de esa suite ni escrita a su imagen—, hecha por un worker gestionado
en su worktree, con tests en verde y la misma mutación negada al controlador.

| Etapa | Demuestra | No demuestra |
|---|---|---|
| `tool-calling@1` | protocolo de herramientas | trabajo real |
| `batch-worker-mecanica@1` | transformaciones pequeñas de la clase | autoimplementación |
| A6 (`17 + 25`) | la ruta local de extremo a extremo | modificar el repositorio |
| tarea de código independiente | trabajo local real verificado | generalidad sobre tareas grandes |

## El plazo de la petición (H-THYROX-417)

La primera cualificación `task:mecanica` murió a los 324 s con «The operation
timed out.»: el `fetch` de Bun corta a los 300 s sin plazo declarado (sonda
`probes/bun_fetch_timeout.ts`). `admittedChat` ya no hereda ese plazo; el
cualificador declara 30 min por caso. RED: los 2 casos que dependen del cambio;
GREEN 4/4; anulaciones exactas; typecheck de `local-models` con los mismos 7
errores previos en los mismos sitios que HEAD.
