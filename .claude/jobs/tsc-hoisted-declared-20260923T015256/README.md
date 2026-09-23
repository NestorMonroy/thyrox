# tsc-hoisted-declared

## Qué se lanzó

`bunx tsc --noEmit` después de ejecutar `bun install --frozen-lockfile` sin un
flag de linker; `bunfig.toml` ya declara hoisted.

## Qué se preguntaba

¿El linker declarado conserva el universo conductual medido después del bloque
provider?

## Qué se recogió

El analizador reproduce 4 917 diagnósticos en 933 archivos, TS2305=486 y
TS2307=19. El proceso termina con `__BG_EXIT__=2` porque aún no llega a cero.

*Métrica:* cabeceras TypeScript y archivos distintos.
*Ciega a:* instalaciones con versiones de Bun fuera del engine declarado.
