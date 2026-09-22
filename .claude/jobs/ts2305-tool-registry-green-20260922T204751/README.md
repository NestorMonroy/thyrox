# ts2305-tool-registry-green

## Qué se lanzó

`bash -lc 'bunx tsc --noEmit'`, mediante `bin/thyrox-bg` y recogido por
`bin/wait-jobs`.

## Qué se preguntaba

¿Publicar la superficie canónica de `@thyrox/tool-registry` elimina sus aristas
TS2305 sin ocultar el baseline global?

## Qué se recogió

El comando conserva su salida completa y termina con `__BG_EXIT__=2` porque el
baseline global aún está rojo. El analizador cuenta 4 946 diagnósticos en 941
archivos, TS2305=516 y cero aristas del provider reparado.

*Métrica:* cabeceras de diagnósticos TypeScript, no líneas del log.
*Ciega a:* conducta runtime, verificada por tests acotados.
