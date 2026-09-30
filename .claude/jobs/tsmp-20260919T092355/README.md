# tsmp

## Qué se lanzó

```
bash -c cd /home/user/thyrox && bun run typecheck 2>&1; echo EXIT=$?
```

## Qué se preguntaba

Con el manifiesto de `config` ampliado a 20 entradas y los importadores
editados, ¿cuántos errores da el árbol y a qué se atribuye el delta?

Corre en segundo plano porque es un barrido determinista: cuesta cero
tokens como proceso y pagaría una conversación entera como agente
(`trabajo-en-segundo-plano.md`).

## Qué se recogió

**5684** errores contra **5704** del estado previo (`tscfg2`). Delta neto
**−20**, atribuido por `comm` sobre los dos listados ordenados:
**21 desaparecieron, 1 apareció**.

Los 21 son todos TS2307 de subpaths de `config` que ahora resuelven —
`managedPath`, `changeDetector`, `applySettingsChange`, `pluginOnlyPolicy`,
`sync`, `lazySchema.js`— más un TS7006 que dependía de ellos.

El que apareció NO es una regresión: `run.ts(180,33)` TS2345 sustituye a
`run.ts(179,36)` TS7006 en la **misma llamada**. Al resolver
`changeDetector`, el parámetro `source` deja de ser `any` implícito y el
compilador puede al fin comprobar el argumento siguiente. Sucesor:
**TASK-THYROX-0228**.

*Metrica:* líneas `error TS` del `tsc --noEmit` del árbol entero,
deduplicadas y comparadas por conjunto contra la corrida previa.
*Ciega a:* un error que cambia de línea sin cambiar de causa —aparecería
como un par desaparecido/aparecido y no lo es—; y al orden de aparición,
que el `sort -u` destruye a propósito para que el `comm` sea posible.
