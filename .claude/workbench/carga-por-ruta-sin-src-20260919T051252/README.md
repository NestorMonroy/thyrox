# Cargar por ruta no pone el árbol en `sys.path` — TASK-THYROX-0217

Décimo archivo de la familia de `TASK-THYROX-0214`, y el censo AST de aquel
pase **no podía verlo**.

## La pregunta

`tests/agents/test_final_message_closing.py` moría con
`ModuleNotFoundError: No module named 'hooks'` antes de ejecutar una sola
aserción. Su bootstrap es correcto en lo que sí hace —resuelve la raíz por
**marcador**, no por `parents[N]`, con su propia `_thyrox_root()` y el
docstring que explica por qué repite el marcador— y omite la otra mitad:
**nunca inserta `src/` en `sys.path`**.

## El mecanismo, que no es obvio

`spec_from_file_location` resuelve **ese archivo**. Los `import` del cuerpo
del módulo cargado siguen pasando por `sys.path` como cualquier otro. Así que
cargar `src/agents/register_session.py` por su ruta no hace importables a sus
paquetes hermanos, y ese módulo importa `hooks.error_log` y
`agents.agents_paths`.

Es la misma frontera que `TASK-THYROX-0216` cerró un nivel más abajo:
allí `sys.path` no cruzaba a un **subproceso**; aquí no cruza a los
**imports del módulo cargado**. En los dos casos el estado del proceso se leyó
como si alcanzara más lejos de lo que alcanza.

## Por qué el censo anterior era ciego POR CONSTRUCCIÓN

El instrumento de `TASK-THYROX-0214` mide **uso-antes-de-import dentro del
módulo**: un `ast.Name` en contexto Load, en el cuerpo, en una línea anterior
al `import` que lo liga. Un cargador dinámico **no importa el árbol en ninguna
línea** — no hay `import` que adelantar, así que no hay nada que ese recorrido
pueda marcar. No fue un descuido del censo: fue su métrica.

## El instrumento que sí lo ve

`census_dynamic_loader_bootstrap.py`, en este banco.

```
cargan por ruta: 38 | SIN poner src/ en sys.path: 2
   tests/agents/test_balanced_block.py
   tests/verify/test_commit_message.py
```

*Métrica:* archivos de `tests/` cuyo AST contiene una llamada a
`spec_from_file_location` o `exec_module`, y cuyo texto no inserta `src`
en `sys.path`.
*Ciega a:* un archivo que inserte la raíz a través de un ayudante cuyo nombre
no reconoce; y al **falso positivo legítimo** — un módulo cargado por ruta que
no importa ningún hermano no necesita el árbol y aparece igual. Por eso el
veredicto de cada candidato se cierra **por conducta**, no por este conteo:
los dos que quedan corren en verde.

## Los dos controles

**Anulación del arreglo.** Retirado el `sys.path.insert`, la suite vuelve al
`ModuleNotFoundError` exacto; restaurada, 14 ok, 0 fallos, y `diff` contra
la copia da idéntico.

**Control positivo del censo, real y no fabricado.** Con la anulación puesta,
el censo pasa de **2 a 3** candidatos y nombra el archivo. Un censo que no
cambiara ahí no estaría midiendo el fenómeno.

Los dos, verbatim, en `outputs/control-de-anulacion.txt`.

## Atribución

La reparación es de UNA línea y su efecto está acotado a este archivo: el
subconjunto derivado de `register_session|hooks.error_log` no cambia de
veredicto en ninguna otra suite (las otras dos rojas —`test_error_log.py` y
`test_user_wiring.py`— son pre-existentes y se midieron en el banco de
`TASK-THYROX-0216`).
