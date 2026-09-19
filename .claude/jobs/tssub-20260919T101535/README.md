# tssub

## Qué se lanzó

```
bash bin/thyrox-bg start tssub --grace 0 -- bash -c "cd /home/user/thyrox && bun run typecheck 2>&1"
```

## Qué se preguntaba

`TASK-THYROX-0227`. Con las 25 entradas que la referencia declara copiadas a
los siete manifiestos, más el sufijo `.ts` retirado del `require()` de
`provider/src/costTracker.ts:110`, ¿cuánto cae el typecheck del árbol y a qué
se atribuye el delta?

## Qué se recogió

**5681 → 5624** ubicaciones únicas. **85 desaparecieron, 28 aparecieron.**

Lo que cae es exactamente la clase esperada — **69 TS2307** (módulos que ahora
resuelven) más **11 TS7006** y 5 más que dependían de ellos: al resolver el
módulo, los parámetros dejan de ser `any` implícito.

Lo que aparece **no es regresión, y hay una cifra que lo discrimina: 0 TS2307
nuevos.** Ningún módulo dejó de resolver. Los 28 son errores de **forma de
tipo** —14 TS2345, 3 TS2769, 3 TS2328, 3 TS2322, 2 TS2339, y uno de TS2677,
TS2367 y TS18046— que estaban enmascarados mientras un lado era `any`. El
mismo efecto que `tsmp` midió con un solo caso al cerrar `TASK-THYROX-0226`.

**Medido, no supuesto:** de los 16 archivos con error nuevo, **9** tenían un
TS2307 que se resolvió en ese mismo archivo. Los otros 7 lo reciben de forma
transitiva —consumen tipos de los 9— y sus mensajes lo dicen: p. ej.
`BackgroundTaskStatus.tsx(56,28)` pasa a decir *«Argument of type `TaskState`
is not assignable…»*, con el tipo ya nombrado en vez de colapsado a `any`.

*Métrica:* ubicaciones `archivo(línea,col): error TSxxxx` del `tsc --noEmit`
del árbol entero, deduplicadas y comparadas por conjunto contra `tsdoc`.
*Ciega a:* si los 28 revelados son defectos reales o ruido de tipos portados
a medias — el typecheck dice que el compilador ya puede verlos, no que estén
mal escritos. Triarlos no es de esta tarea.
