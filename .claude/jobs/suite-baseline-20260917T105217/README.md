# suite-baseline

## Que se lanzo

```
bash tests/run.sh
```

## Que se preguntaba

Cual es el estado de partida de las tres lenguas del arbol antes de tocar
nada — el paso 2 del flujo de sesion, que manda medir en vez de asumir.

## Que se recogio

El tramo de shell publico `87 suite(s) de shell, 18 en rojo, 0 sin medir`.
El agregado final **no se emitio**: el proceso murio con

```
tests/run.sh: line 204: syntax error near unexpected token `;;'
```

y `__BG_EXIT__=2`.

No es un defecto del corredor. `tests/run.sh` se **edito mientras este job lo
estaba ejecutando** (la simetria de exit 2 de la mitad de Python), y bash lee
un guion **incrementalmente**, no de una vez: el interprete siguio leyendo
desde el offset que llevaba y aterrizo en medio del bloque nuevo. Verificado
por conducta despues: `bash -n tests/run.sh` pasa.

La leccion operativa es del ledger, no del guion: **un trabajo en segundo
plano fija su sujeto al lanzarse, no al terminar**. Editar el guion que un job
esta corriendo corrompe esa ejecucion sin dejar rastro en el diff.

*Metrica:* `bash tests/run.sh` completo — conteo de suites y de rojos por
lengua.
*Ciega a:* su propia integridad mientras corre. El tramo de TypeScript y el de
shell si se midieron; el agregado final no existe. El conteo de Python lo
reemplazo el job hermano `python-reds-20260917T110108`, lanzado despues.
