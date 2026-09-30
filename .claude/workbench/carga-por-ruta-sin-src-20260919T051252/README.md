# Cargar por ruta no pone el árbol en `sys.path` — TASK-THYROX-0217

Décimo archivo de la familia de `TASK-THYROX-0214`, y el censo AST de aquel
pase **no podía verlo**.

## La pregunta — CORREGIDA 2026-09-19 (TASK-THYROX-0218)

**La premisa que se escribió aquí era mi invocación, no el árbol.** Decía que
`tests/agents/test_final_message_closing.py` «moría con
`ModuleNotFoundError: No module named 'hooks'` antes de ejecutar una sola
aserción». Eso es cierto con `python3 tests/xxx.py` **pelado** y falso bajo el
corredor, que exporta el árbol (`tests/run.sh:38`):

```
export PYTHONPATH="$PWD/src${PYTHONPATH:+:$PYTHONPATH}"
```

Medido en el baseline del pase —corredor real, antes de tocar nada— el archivo
aparece **verde**, en la línea 5359 de su log, sin marca `-- ROJO`.

**Qué sigue siendo cierto, y qué cambia de clase:**

- El bootstrap **sí** omite insertar `src/` en `sys.path`: eso es un hecho del
  archivo, no de la invocación, y es lo que el censo mide.
- La reparación **sí** es hardening real — hace el archivo ejecutable por sí
  solo, sin depender de que quien lo invoque exporte el árbol.
- Lo que **no** es: la reparación de un rojo visible bajo el corredor. No había
  tal rojo. `TASK-THYROX-0217` queda `completed`, con su afirmación reclasificada
  de «repara un fallo» a «cierra una dependencia implícita del invocador».

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

## Atribución — CORREGIDA 2026-09-19 (TASK-THYROX-0218)

La reparación es de UNA línea y su efecto está acotado a este archivo. Lo que
esta sección afirmaba de más: que `test_error_log.py` y `test_user_wiring.py`
eran «pre-existentes» medidas en el banco de `TASK-THYROX-0216`. Las dos se
midieron **peladas** allí, y bajo el corredor no son lo que se publicó —
`test_error_log.py` estaba **verde** en el baseline, y `test_user_wiring.py`
estaba roja por la familia de `TASK-THYROX-0214`, no por esto. La tabla corregida,
con sus tres poblaciones, vive en el README de aquel banco.

*Métrica:* veredicto del archivo en el baseline del corredor (log :5359), con la
invocación pelada, y con el corredor de hoy.
*Ciega a:* si el archivo tendría otro fallo bajo un invocador que exporte un
`PYTHONPATH` distinto del que el corredor exporta.
