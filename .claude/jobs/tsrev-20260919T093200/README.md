# tsrev

## Qué se lanzó

```
bash -c cd /home/user/thyrox && bun run typecheck 2>&1; echo EXIT=$?
```

## Qué se preguntaba

**El control de la reversión.** Se revirtieron 19 archivos cuyo único
cambio era prosa en comentarios. Si esas 23 líneas eran inertes para el
compilador, el conteo tiene que quedarse en 5684; si cambia, la
clasificación entre «cambio de código» y «cambio de prosa» estaba mal.

## Qué se recogió

**5684**, idéntico a `tsmp`. Las 23 líneas de prosa eran inertes, así que
el delta de −20 pertenece entero al manifiesto de `config` más el único
`require()` de `AppState.tsx`.

Este control es el que hace decidible la reversión. Sin él, revertir 19
archivos sería una apuesta: el conteo por sí solo no distingue «la prosa no
afectaba» de «la prosa afectaba y otra cosa lo compensó».

*Metrica:* mismo `tsc --noEmit` del árbol entero, mismo conteo de líneas
`error TS`.
*Ciega a:* un cambio de prosa que afectara a un consumidor **fuera** del
alcance de `tsconfig` —no hay ninguno medido—, y a efectos que no sean de
compilación: una cita degradada en un comentario sigue siendo un defecto
para quien la lee, y por eso se revirtió aunque el compilador calle.
