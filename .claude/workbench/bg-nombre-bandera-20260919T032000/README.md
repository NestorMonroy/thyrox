# `bg.sh start` acepta una bandera como nombre de trabajo

Board #508 (ordinal; su cita durable no se pudo acuñar — ver «Cita» abajo).

## El defecto

`cmd_start` toma el nombre de `$1` **antes** del bucle de banderas
(`src/session/bg.sh:213` contra `:215`), asi que una bandera en esa posicion
se convierte en nombre sin que nadie lo note: el run queda como
`--label-<ISO>` y el resto de la linea se ejecuta como comando.

## Medido por conducta — DOS veces, no una

El informe del ejecutor nombraba un episodio. El arbol tiene **dos** runs
huerfanos versionados:

    .claude/jobs/--label-20260918T021702
    .claude/jobs/--label-20260919T015311

El segundo es el del informe: `thyrox-bg start --label tsc-final-jsx -- bunx
tsc --noEmit` ejecuto `tsc-final-jsx` como comando y murio con
`command not found`.

## El arreglo

Rehusar con exit 2 si el nombre empieza por `-`, nombrando las banderas que
`start` SI admite. **No se reinterpreta**: `start` no puede adivinar si quien
escribio `--label X` queria llamar al trabajo `X` o pasar `--label` al
comando. Y un nombre que empieza por guion es hostil aguas abajo — todo
consumidor que lo pase a un comando lo lee como bandera.

## Control de anulacion

| | resumen |
|---|---|
| sin la guarda (`rojo-antes.log`) | 4 ok, 4 fallo |
| con la guarda (`verde-despues.log`) | 8 ok, 0 fallo |

Caen **exactamente** las 4 aserciones que dependen de ella. El **caso 4** —un
nombre legitimo arranca, y su run NO empieza por guion— sobrevive en los dos,
y es lo que prueba que la guarda no esta rechazando todo.

## Cita

`task_ids cita 508` rehusa: el ordinal **colisiona** con `task_id 508` del
store (`TASK-API-0294`, otro sujeto). Es el defecto que el paso 4 de
`CLAUDE.md` describe, observado aqui. El commit cita el ordinal **y** el
sujeto verbatim, que es lo unico que resuelve sin cita durable.
