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
