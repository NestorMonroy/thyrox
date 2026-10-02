# Referencia de trabajo de un consumidor en ExecutionAuthorization (TASK-THYROX-0756)

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
