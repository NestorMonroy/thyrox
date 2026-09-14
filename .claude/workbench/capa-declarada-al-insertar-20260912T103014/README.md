# capa-declarada-al-insertar

## La pregunta

Una fila de `tasks` que nace del volcado del board, ¿declara su capa, o entra
con `submodule` en `NULL`? Y si alguien ya la clasificó a mano, ¿ese trabajo
sobrevive al siguiente volcado?

## La premisa, medida

El camino de inserción compartido de `agent_store.py` escribía **quince**
columnas y `submodule` no era una de ellas: sólo `task_ids ingerir-board` la
poblaba. Medido sobre el store vivo el 2026-09-12:

```
total                     1636
submodule NULL             404
NULL con cita TASK-GEN-    404
```

Las 404 son exactamente las de cita `TASK-GEN-`, y **402 de ellas son
indecidibles por evidencia de commit** — nadie puede reconstruir hoy a qué capa
pertenecían.

## `gen` NO es lo mismo que `NULL`, y ése es el fondo

Las dos se leen igual bajo `WHERE submodule IS NULL`, y significan lo contrario:

| Valor | Qué declara |
|---|---|
| `gen` | **cruza repos** — alguien decidió que la tarea no es de una capa |
| `NULL` | **nadie decidió** — no hay declaración de ninguna clase |

Colapsarlas repite un nivel más abajo el defecto que `usage_source` cierra en
`agent_sessions`: la columna guarda la **procedencia** del dato, no el dato, y
por eso puede declarar que no hay dato. Por eso la fila nueva nace con
`UNKNOWN_LAYER` **y** con `submodule_source = "respaldo al volcar el board:
nadie declaro la capa"`: el valor dice la capa de respaldo, la procedencia dice
que es un respaldo y no una clasificación.

**El valor se IMPORTA, no se copia.** `UNKNOWN_LAYER` viene de
`src/task/task_ids.py`, que es el dueño canónico del vocabulario de capas. Un
literal `"gen"` en `agent_store.py` sería la segunda fuente de verdad que
`calibration-verified-numbers.md` prohíbe para una cifra, y vale igual para un
valor de dominio.

## Lo que la medición da

| Corrida | Salida | Archivo |
|---|---|---|
| **rojo**, antes del arreglo | `31 ok, 2 fallos` — caen las dos aserciones del bloque 15 | `outputs/rojo-antes-del-arreglo.out` |
| **verde**, tras el arreglo | `33 ok, 0 fallos` | `outputs/verde-tras-el-arreglo.out` |
| **anulación** — `submodule = excluded.submodule` añadido al `ON CONFLICT` | `32 ok, 1 fallos`, y el que cae es exactamente `la capa clasificada no se pisa` (`esperado=[docs] obtenido=[gen]`) | `outputs/anulacion-el-conflicto-pisa-la-capa.out` |

La tercera es la que hace del bloque 16 un control y no un adorno. Sin ella, un
verde no distinguiría *«el conflicto preserva la capa»* de *«el test no
pregunta»* — el sub-patrón D de `metrica-decide-la-conclusion.md`. Con ella
queda medido que cae **una** aserción y **sólo** una: las otras dos del mismo
bloque —la procedencia y que el contenido sí se actualiza— sobreviven, porque no
dependen de esa causa.

Tras restaurar el fuente, `git diff --stat src/agents/agent_store.py` da
`1 file changed, 28 insertions(+), 2 deletions(-)`: el cambio intencional y nada
más.

## Lo que NO cierra

Las **404 filas heredadas se quedan en `NULL`**. Esta medición cierra el grifo
—una fila nueva ya no puede nacer sin declaración— y no barre lo anterior, con
el mismo criterio prospectivo que `identificadores-en-ingles.md` y el resto de
los baselines del árbol. Su clasificación, cuando alguien pueda hacerla, es
trabajo aparte: 402 de las 404 no tienen evidencia de commit con que decidir.

*Métrica:* las columnas `submodule` y `submodule_source` de una fila volcada por
`agent_store.py`, leídas del store después del primer insert y después de un
segundo volcado sobre una fila clasificada a mano.
*Ciega a:* si `UNKNOWN_LAYER` es el valor de respaldo correcto — el instrumento
verifica que **se escribe**, no que clasifique bien; y a las 404 heredadas, que
quedan fuera por la regla prospectiva.
