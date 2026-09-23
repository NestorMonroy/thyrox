# ts2305-provider-green

## Qué se lanzó

`bash -lc 'bunx tsc --noEmit'`, mediante `bin/thyrox-bg` y recogido por
`bin/wait-jobs`, con instalación hoisted explícita.

## Qué se preguntaba

¿Publicar el surface canónico de `@thyrox/provider` elimina sus aristas TS2305
sin ocultar el baseline global?

## Qué se recogió

La salida completa termina con `__BG_EXIT__=2` porque el baseline global aún
está rojo. El analizador cuenta 4 917 diagnósticos en 933 archivos,
TS2305=486 y cero aristas del provider reparado.

*Métrica:* cabeceras de diagnósticos TypeScript, no líneas del log.
*Ciega a:* llamadas de red reales.
