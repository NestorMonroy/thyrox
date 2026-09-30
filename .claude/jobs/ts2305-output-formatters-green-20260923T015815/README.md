# ts2305-output-formatters-green

## Qué se lanzó

`bunx tsc --noEmit` mediante `bin/thyrox-bg`, recogido por `bin/wait-jobs`.

## Qué se preguntaba

¿Publicar `truncate.ts` desde formatters elimina sus aristas sin ocultar el
baseline global?

## Qué se recogió

4 911 diagnósticos en 932 archivos, TS2305=480, TS2307=19 y cero aristas de
`@thyrox/output/formatters`. `__BG_EXIT__=2` conserva que el total sigue rojo.

*Métrica:* cabeceras TypeScript, no líneas del log.
*Ciega a:* render visual completo.
