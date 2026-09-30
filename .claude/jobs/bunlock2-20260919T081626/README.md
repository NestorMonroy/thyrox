# bunlock2

## Qué se lanzó

```
bun install
```

## Qué se preguntaba

Si declarar `@types/ws` en las `devDependencies` de `voice` aterriza
en el candado y enlaza el paquete donde el importador lo busca.

## Qué se recogió

`Saved lockfile` en 3.22 s. El enlace queda en
`src/packages/voice/node_modules/@types/ws`, apuntando al store de
bun — no en la raiz, que es donde no lo habria encontrado.

*Metrica:* `git diff bun.lock` y `ls -la` del enlace.
*Ciega a:* si el tipo que el enlace trae es el que `ws.on` necesita —
eso lo mide el typecheck, no el instalador.
