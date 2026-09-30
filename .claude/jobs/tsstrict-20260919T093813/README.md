# tsstrict

## Qué se lanzó

```
bash -c cd /home/user/thyrox && bun run typecheck 2>&1; echo EXIT=$?
```

## Qué se preguntaba

Tras ensanchar `cli/src/contracts.ts::AppStateLike` con las tres claves de
`SettingsChangeTarget`, ¿cierra el `TS2345` de `run.ts:180`, y a qué precio?

El precio importa más que el cierre: `AppStateLike` tiene nueve consumidores
en `cli`, y dos de las tres claves nuevas son **requeridas**. Cualquiera que
le pase un objeto sin ellas se vuelve rojo.

## Qué se recogió

**5683** contra **5684** de la corrida previa (`tsrev`). Atribuido por
diferencia de conjuntos: **1 desapareció, 0 aparecieron**, y el que
desapareció es exactamente el `TS2345` del sujeto.

El cero de la segunda columna es el resultado que decide: ninguno de los
nueve consumidores le pasaba un objeto sin `toolPermissionContext` ni
`settings`, así que el ensanchamiento no cobra nada.

*Metrica:* líneas `error TS` del `tsc --noEmit` del árbol entero,
deduplicadas y comparadas por conjunto contra la corrida previa.
*Ciega a:* un consumidor fuera del alcance de `tsconfig`; y al runtime, que
no puede cambiar porque un tipo se borra al compilar.
