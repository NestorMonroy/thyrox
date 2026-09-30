# roster-entrega-no-aplica-a-bash

## El encargo

> «¿ya se arregló de los roster?»

La respuesta medida era: sus dos ejes sí —#285 (seguir el symlink) y #288 (eje
de producción)—, pero su suite seguía en **16 ok, 2 fallas**, declaradas
preexistentes por el commit `48167a58` y sin cerrar por nadie desde entonces.
Este run las cierra.

## La premisa, corregida al medir

La premisa cómoda era «expectativas rancias: el reporte cambió de forma y el
control no». Es falsa. Las dos aserciones apuntaban a un defecto real:

```
  terminado      0        <- la cabecera negando a su propio detalle
    entrego      1
    cortado      0
  indecidible    3        <- dos de esas tres SÍ traían marcador terminal
```

Dos causas, independientes entre sí:

1. **La entrega es un eje de subagente y se preguntaba también al Bash.**
   `delivery_verdict` delega en `roster/delivery.classify`, que lee los
   bloques del último mensaje `assistant`. El `.output` de una tarea de
   `Bash` es un log plano: no tiene ninguno, así que devuelve
   `undecidable`. Eso borraba lo único que sí se sabía de `harness.output`
   (`[exited with code 0]`) y de `propio.output` (`EXIT=0`): que
   terminaron. El eje de **producción**, un tramo más abajo en el mismo guion,
   ya tenía escrito el guard correcto —`if [[ ! -L "$entry" ]]` → «no
   aplica»— y al eje de entrega le faltaba.
2. **La cabecera `terminado` se publicaba como cubo hermano.** Ningún
   veredicto de subagente devuelve ya el literal `terminado`: se parte en
   `entrego`/`cortado`. Así que su cifra era un 0 estructural.

Y la consecuencia que no se veía en el conteo: con el veredicto en
`indecidible`, `--confirmar-muerte` sobre un Bash terminado hacía BAIL con
el motivo equivocado —«sin marcador terminal»— cuando el marcador estaba ahí.

## Las piezas

| archivo | qué hace |
|---|---|
| `probes/report.sh` | monta el fixture de 8 entradas y publica la tabla cruda del reporte, que es donde se ve el defecto (la suite mide aserciones, no la tabla) |
| `outputs/red-suite-before.out.txt` | la mitad ROJA persistida antes de tocar el guion: 16 ok, 2 fallas |
| `outputs/red-report-before.out.txt` | la tabla con `terminado 0` / `indecidible 3` |
| `outputs/anulacion-1-sin-guard.out.txt` | retirado el guard `[[ ! -L ]]`: caen **exactamente 2**, con `terminado=1` e `indecidible=3` |
| `outputs/anulacion-2-cabecera-sin-suma.out.txt` | la cabecera vuelve a su cubo propio, guard puesto: cae **exactamente 1**, con `terminado=2` |
| `outputs/green-suite-after.out.txt` | 18 ok, 0 fallas, EXIT=0 |
| `outputs/green-report-after.out.txt` | la tabla con `terminado 3` (entrego 1 · cortado 0 · no aplica 2) e `indecidible 1` |

Las dos anulaciones se corrieron por separado a propósito: una sola no separa
las dos causas. Con el guard fuera caen las dos aserciones; con la suma fuera
cae sólo la de `terminado`. Eso prueba que cada mitad mide lo suyo y que
ninguna de las dos sobra. El guion se restauró y se verificó con `cmp` byte a
byte antes de la corrida verde.

## Los resultados

```
  terminado      3
    entrego      1
    cortado      0
    no aplica    2
  ...
  indecidible    1
  TOTAL          8
```

*Métrica:* aserciones verdes de `tests/agents/test-reconciliar-agentes.sh`
sobre su fixture de 8 entradas, y los cubos del reporte con su TOTAL.

*Ciega a:* si el veredicto por entrada es el correcto sobre un roster **real**
—el fixture es sintético salvo la forma del subagente cortado, copiada de una
medición de 2026-08-13—; al eje de producción, que no se toca; y a si «no
aplica» es el rótulo que un lector espera bajo la cabecera, que se eligió por
simetría con `production_line` y no se midió contra ningún lector.

Fecha de este run: 2026-09-09T18:37:19
