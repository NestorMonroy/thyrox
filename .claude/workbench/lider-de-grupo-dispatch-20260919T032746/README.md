# El control que separa «lanzo» de «sobrevivio»

**TASK-THYROX-0193** (board #502). La cita durable se resolvio **por el
sujeto**, no por el ordinal: `task_ids cita 502` rehusa porque el numero
nombra a la vez una fila del store (`TASK-GEN-0083`) y una tarjeta del
board, con sujetos distintos.

## El defecto del INSTRUMENTO, no del codigo

`setsid` ya estaba en `src/session/wait-jobs.sh:562`. Lo que faltaba era el
control: la suite de dependencia **paso con el defecto presente**, porque su
caso 5 mide que `dispatch` **LANZA**, no que lo lanzado **SOBREVIVA**.

Un trabajo lanzado sin `setsid` queda en el grupo de procesos del lanzador.
`disown` lo retira de la tabla de jobs del shell, no del grupo: una senal
dirigida al grupo —lo que hace el harness al terminar una llamada de
herramienta— lo alcanza igual, y el sintoma es **mudo** (log vacio, BAIL).

## Que se mide, y que NO

Se mide **`pgid == pid`** sobre el propio trabajo, que es lo que «lider de su
grupo» significa. NO se mide `pgid != pgid del lanzador`: eso es cierto
tambien de un nieto cualquiera y no discriminaria.

## Control de anulacion

`wait-jobs.sh:562`, `nohup setsid bash` -> `nohup bash`:

| | resumen | evidencia |
|---|---|---|
| sin `setsid` | 10 ok, 1 fallo | `rojo-sin-setsid.log` |
| con `setsid` | 11 ok, 0 fallo | `verde-con-setsid.log` |

Cae **exactamente** la asercion de liderazgo, y el valor obtenido es el pgid
del lanzador. La asercion «el dependiente arranco y dejo su medicion»
**SOBREVIVE** en las dos — que es justo la separacion entre lanzar y
sobrevivir que faltaba.

Restaurado: `git diff --stat src/session/wait-jobs.sh` vacio.

*Metrica:* `ps -o pid=,pgid= -p $$` dentro del propio comando despachado.
*Ciega a:* si una senal real al grupo lo alcanzaria — mide la **condicion**
(liderazgo), no el desenlace ante la senal.
