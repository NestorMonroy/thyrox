# python-reds-2

## Que se lanzo

```
bash tests/run.sh --python-only
```

## Que se preguntaba

Cuantos de los diez rojos de Python que abrieron el pase siguen en rojo, y
—la mitad que el corredor no separaba hasta TASK-THYROX-0073— cuantos de
ellos rehusan con exit 2 en vez de fallar.

## Que se recogio

`158 suite(s) de Python, 5 en rojo, 0 sin medir`, exit 1. Son 158 y no 157
porque el pase anadio `tests/meta/test_runner_exit_two.py`, el control
sintetico de la simetria de exit 2.

**`0 sin medir` es el resultado que importa del corredor:** la mitad de
Python ya separa el rehuso del rojo, y hoy ninguna suite rehusa — los dos
rehusos falsos que el triaje destapo eran defectos y estan cerrados.

Los cinco:

```
tests/corpus/test_censar_scripts.py         TASK-THYROX-0077
tests/docs/test_unwrap_rst.py               cerrado DESPUES de este lanzamiento
tests/session/test_installed_hooks_resolve.py  TASK-THYROX-0076
tests/verify/test_config_precedence.py      precedencia por bucle con retorno
tests/verify/test_path_arithmetic.py        baseline declara 2, arbol tiene 35
```

*Metrica:* codigo de salida de cada suite descubierta, agregado por lengua,
con el rehuso contado aparte.
*Ciega a:* el momento. El veredicto se fija al LANZAR: `test_unwrap_rst`
figura en rojo porque su arreglo aterrizo mientras el trabajo corria. El
conteo al cerrar el pase es **4**, no 5 — y esa diferencia no se ve en el
log, hay que saberla de fuera.
