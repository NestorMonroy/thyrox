# Referencia de trabajo de un consumidor en ExecutionAuthorization (TASK-THYROX-0756)

## El encargo

<!-- verbatim, sin parafrasear -->

> No debe convertirse en el identificador de una traducción, una ola o un lote de `ai-course-notes`.
> Si el consumidor tiene, por ejemplo:
>
> ```
> TRANSLATION-...
> ISSUE-...
> WAVE-...
> PHASE-...
> ```
>
> esa es su identidad.
> Thyrox debe poder referenciarla sin apropiársela.
> Si `ExecutionAuthorization` hoy sólo admite:
>
> ```
> TASK-[A-Z]+-\d{4}
> ```
>
> y el consumidor usa otra identidad durable, eso es una limitación del contrato de Thyrox.
> En ese caso implementa una solución de proveedor para aceptar una referencia externa/consumer-neutral, con TDD.
> No conviertas artificialmente los IDs del consumidor a `TASK-THYROX-*`.
> 4. Lo más importante de tu medición es C, D y E
> Has confirmado que hoy faltan tres propiedades que este trabajo necesita:

## La premisa, si se corrigio al primer comando

Ninguna: el encargo se ejecutó tal como se pidió.

## Las piezas

| archivo | que hace |
|---|---|
| `probes/p1b/bg-case.sh` | borrador del cambio, tal como se aplicó |
| `probes/p1b/bg-impl.py` | borrador del cambio, tal como se aplicó |
| `probes/p1b/finish.sh` | borrador del cambio, tal como se aplicó |
| `probes/p1b/impl.py` | borrador del cambio, tal como se aplicó |
| `probes/p1b/tests-auth.ts` | borrador del cambio, tal como se aplicó |
| `probes/p1b/tests-cmd.ts` | borrador del cambio, tal como se aplicó |
| `outputs/` | 8 salidas: rojos, verdes y anulaciones |

## Los resultados

El consumidor `ai-course-notes` versiona su propia identidad de trabajo
(lote, `iterations/NN`, unidad `<nota>/<NNN>` de `units.tsv`) y no usa
`TASK-*`. `ExecutionAuthorization` sólo aceptaba `TASK-[A-Z]+-\d{4}`, así que
su trabajo acababa citado como `TASK-THYROX-*` (el barrido de `db1af34`).

- `ExecutionReference` gana `{ kind: 'work'; consumer; workId }`, etiqueta
  `work:<consumidor>:<id>`; autoriza sólo ejecuciones de tipo tarea.
- `podman-execution-execute run --work CONSUMIDOR:ID [--owner pool:ID]`,
  excluyente con `--task`; por línea de orden sólo se declara un dueño `pool`.
- `thyrox-bg start --work …` lo pasa al runner.

Todo se escribió y probó dentro de ExecutionUnits (`kind=test`).

| Anulación | Cae |
|---|---|
| `work` aceptado para tipos de tarea | autoriza con identidad · `--work` en la CLI |
| forma de consumidor e id | «fuera de su forma» |
| sólo tipos de tarea | «un runtime de modelo no se autoriza por work» |
| una sola referencia (CLI) | «--task y --work juntos» |
| dueño sólo `pool` | «un dueño que no es de pool» |
| una sola referencia (bg.sh) | caso 8 |

Mitad roja: `outputs/red.txt` (4 fallos), `outputs/red-bg.txt` (2 fallos).

*Metrica:* aserciones rojas antes del cambio y las que caen al retirar cada guarda.
*Ciega a:* si el consumidor conserva la identidad en sus propios registros: se mide sólo la etiqueta y la autorización de thyrox.
