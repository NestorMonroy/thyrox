# suite-full-t9

## Qué se lanzó

```
bash tests/run.sh
```

Corrido al cerrar el bloque de T-9 ("Fix incomplete per-package exports
maps"), por `alcance-de-la-suite.md`: la suite entera es obligatoria al
cerrar un bloque, no solo el subconjunto derivado. Lanzado con
`src/session/bg.sh start` — el propio `bg.sh` promovio a segundo plano tras
su ventana interna de 120 s (ver commit `74386266`, ya pusheado sin
esperar este resultado); recogido despues con `bg.sh wait`.

## Qué se preguntaba

Ver `manifest.jsonl` -- ¿sigue en verde la suite completa de thyrox tras el
fix de exports maps en 12 paquetes hermanos (commits `74386266`, `a303ac90`)?

## Qué se recogió

**TypeScript: 549 archivos, en verde.** Cero regresiones de los cambios de
T-9 -- confirma lo que `tests/package/` (el subconjunto derivado) y las 12
suites por paquete ya habian mostrado, esta vez sobre el arbol TypeScript
completo, no solo los paquetes tocados.

**Python: 123 suites, 18 en rojo. shell: 82 suites, 22 en rojo.**
Preexistentes -- **cero** superposicion con T-9: ningun rojo nombra ninguno
de los 12 paquetes tocados (`app-host`, `command-runtime`,
`context-compression`, `ide`, `provider`, `shell`, `storage`, `swarm`,
`teleport`, `tool-registry`, `updater`, `voice`) ni el mecanismo de
`exports`/`sibling_exports` (grep sobre la salida completa, cero
coincidencias). Es exactamente el alcance ya trackeado por la tarea #5
("Workbench: diagnosticar y arreglar todos los tests en RED de thyrox"),
que sigue abierta y no se absorbe aqui.

`exit=1` del guion es el veredicto agregado de las dos lenguas rojas
(Python + shell) -- no de TypeScript, que es la unica lengua que T-9 tocaba.

*Metrica:* recuento de suites ROJO por lenguaje, y si alguna nombra un
paquete o mecanismo de T-9.
*Ciega a:* un rojo pre-existente cuya causa real fuera un `exports` map
incompleto SIN que el nombre de la suite o su salida mencionen el paquete
-- no descartado aqui, solo no encontrado por el grep de este job.
