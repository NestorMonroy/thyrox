# bunlock

## Qué se lanzó

```
bun install
```

## Qué se preguntaba

Si declarar `@thyrox/audio-capture-napi` en `voice/package.json` mueve
`bun.lock`, y de paso si las dos dependencias declaradas en el pase
anterior (`@anthropic/ink`, `@thyrox/repl`) habian quedado sin asentar
en el candado — una deuda que el commit de entonces no habria visto.

## Qué se recogió

`Saved lockfile` en 3.20 s, `Checked 386 installs across 348 packages
(no changes)`. El diff del candado es de **una sola linea**: la del
paquete recien declarado. Las otras dos ya estaban, asi que el commit
anterior no dejo el candado rancio.

*Metrica:* `git diff bun.lock` tras el `bun install`.
*Ciega a:* si el enlace de workspace aterrizo donde el importador lo
busca — eso lo mide `ls src/packages/voice/node_modules/@thyrox/`, y
ahi es donde el enlace vive, no en la raiz.
