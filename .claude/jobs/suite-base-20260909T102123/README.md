# suite-base

## Qué se lanzó

```
bash tests/run.sh
```

## Qué se preguntaba

Cuál era el estado de partida de las tres lenguas antes de tocar nada — la
medición que el flujo de sesión exige al arrancar.

## Qué se recogió

```
== alcance ==
  TypeScript: 515 archivo(s), EN ROJO
  Python: 91 suite(s), 10 en rojo
  shell: 73 suite(s), 29 en rojo

FALLA: 3 lengua(s) en rojo
EXIT=1
```

*Métrica:* archivos y suites que el corredor alcanza, por lengua, con su
veredicto agregado.
*Ciega a:* qué falla dentro de cada rojo — el agregado no atribuye. Y ciega al
**alcance del propio corredor en esa fecha**: nueve horas después, el run
`suite-tras-guard-proveedor-20260909T193540` de este mismo día declara
`Python: 102 suite(s)`. El radio se ensanchó en 11 suites entre las dos
mediciones, así que «91» no es «todas las suites de Python» — es todas las que
el corredor alcanzaba a las 10:21.

## Por qué este run existe a posteriori

El log vivía **suelto** en `.claude/eventos/` de este árbol — un `.log` sin
manifiesto, sin README y en la forma del CONSUMIDOR (`eventos`) dentro del
PROVEEDOR. Es exactamente la clase de residuo que las tareas #201 y #264 ya
limpiaron dos veces; éste sobrevivió a ambas porque cada una midió una mitad
distinta (la de TypeScript, la de Python) y el log no es de ninguna.

Su hogar correcto es la familia `jobs`, que es la que `src/session/bg.sh`
produce para justo esto: la salida de un trabajo lanzado en segundo plano.
El `git mv` conserva su historia; el manifiesto y este README le dan la forma
que le faltaba.
