# shell-identifier-gate

## El encargo

«los nombres de archivos, clases, funciones, firmas de funciones e
identificadores son en inglés…», y después: «porque el gate
check_identifier_language solo cubre Python/TypeScript implementa el que
falta».

## La premisa, si se corrigio al primer comando

Medido con el léxico del gate: 34 identificadores en español en 9 de los 28
`.sh` que la sesión tocó. Python (8 archivos) y TypeScript (15) salen limpios
con el gate; shell no lo mide nadie. Este pool construye el gate
(TASK-THYROX-0664). La traducción de los 34 es TASK-THYROX-0665, en un pool
posterior, porque los dos tocan el baseline.

## Las piezas

| archivo | que hace |
|---|---|
| `source.md` | la fuente de verdad del ítem |
| `items.txt` | el ítem y sus archivos |
| `launch.sh` | el pool, en `inherit` por el proxy local |

## Los resultados

Se escriben al integrar.

*Metrica:* casos de la suite, anulaciones y entradas congeladas.
*Ciega a:* construcciones de shell que la extracción no reconozca.
