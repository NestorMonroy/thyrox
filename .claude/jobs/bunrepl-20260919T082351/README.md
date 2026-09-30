# bunrepl

## Qué se lanzó

```
bun install
```

## Qué se preguntaba

Si declarar en `repl` las 19 dependencias externas que importa y no
declaraba resuelve, y cuales exigen descarga por no estar en el lock.

## Qué se recogió

`Resolved, downloaded and extracted [76]` y **10 packages installed**
en 3.20 s. Los cuatro que no estaban en el lock aterrizan:
`fuse.js@7.5.0`, `marked@17.0.6`, `asciichart@1.5.25`,
`chokidar@5.0.0`. El proxy no rehuso.

*Metrica:* la linea de resumen de `bun install` y las resoluciones
nuevas en `bun.lock`.
*Ciega a:* si los enlaces aterrizan donde el importador los busca
—eso lo mide `ls src/packages/repl/node_modules`— y a si el codigo
usa la API de la version que se resolvio, que lo mide la suite.
