# corpus-del-consumidor-desde-el-proveedor

## Que se pregunta

`tests/docs/test_unwrap_rst.py` publica «el corpus de hallazgos no se
encontro», 0 no es mayor que 20, con **1476** archivos de hallazgo en el
arbol. Por que.

## Que se midio

La suite componia un solo `REPO` por aritmetica de ruta
—`dirname(dirname(abspath(__file__)))`, o sea `thyrox`— y colgaba de el las
DOS cosas: el modulo bajo prueba (`src/docs/unwrap_rst.py`, del PROVEEDOR) y
el corpus de hallazgos (del CONSUMIDOR). El glob resolvia
`thyrox/source/gestion/pm/...`, que no existe ni debe existir.

Es el mismo defecto que `tests/verify/test_error_catalog.py` cerro antes en
este mismo pase, y el arreglo es el mismo: separar los dos nombres.
`CONSUMER = reach.root('docs')`.

## El segundo eje: el reloj

El contraste que hace visible lo que el conteo escondia:

| | aserciones | reloj |
|---|---|---|
| antes | 14 ok, 1 FAIL | **0.001 s** |
| despues | 15 ok | **31.4 s** |

Una suite de 15 casos que termina en un milisegundo no esta parseando 1476
documentos RST. `test_hay_corpus_que_medir` SI discriminaba —falla con 0—
pero su hermana `test_preserva_el_parseo_y_es_idempotente` pasaba **sobre una
lista vacia**: un verde que no distingue «la transformacion preserva el
parseo» de «no habia nada que transformar». El sub-patron D escondido detras
del unico control que si funcionaba.

## El control de anulacion

Restaurada la version pristine: vuelve **exactamente** una asercion
(`test_hay_corpus_que_medir`) y el reloj vuelve a **0.001 s**. Ni una mas.
El reloj es la segunda mitad del control — sin el, la anulacion solo probaria
que el conteo cambia, no que la suite habia dejado de medir.

## Que mas se corrigio en el mismo archivo

El bloque «Ejecucion» del docstring mandaba `cd /home/user/kaupamex-docs` y
`unittest discover -s scripts`. Las dos mitades caducaron con la mudanza: el
modulo vive en `thyrox: src/docs/unwrap_rst.py` y el corredor invoca cada
suite con `python3` pelado.

*Metrica:* aserciones en verde de las 15, y el reloj que la propia suite
declara.
*Ciega a:* si la transformacion es CORRECTA sobre un archivo concreto — mide
preservacion del parseo e idempotencia, no que el resultado sea el deseado; y
a un archivo de hallazgo fuera del glob `pm/*/iniciativas/*/hallazgos/*.rst`.

## Estado de la familia tras este tramo

De los diez rojos de Python que abrieron el pase quedan **cuatro**, todos con
cita:

- `test_censar_scripts` — TASK-THYROX-0077 (hogar del baseline de huerfanos)
- `test_installed_hooks_resolve` — TASK-THYROX-0076
- `test_config_precedence` — la precedencia por bucle con retorno
- `test_path_arithmetic` — su baseline declara 2 y el arbol tiene 35, de los
  cuales 9 son copias pristine de bancos (TASK-THYROX-0075)
