# ts2305-agent-scheduler-green

## Qué se lanzó

`bash -lc 'bunx tsc --noEmit'`, mediante `bin/thyrox-bg` y recogido por
`bin/wait-jobs`.

## Qué se preguntaba

¿Publicar el facade canónico del scheduler elimina sus aristas TS2305 sin
ocultar el baseline global?

## Qué se recogió

El comando conserva su salida completa y termina con `__BG_EXIT__=2` porque el
baseline global aún está rojo. El analizador cuenta 4 919 diagnósticos en 936
archivos, TS2305=495 y cero aristas del provider reparado.

*Métrica:* cabeceras de diagnósticos TypeScript, no líneas del log.
*Ciega a:* conducta de timers/filesystem, verificada por suites acotadas.
