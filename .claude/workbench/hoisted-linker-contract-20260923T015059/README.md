# Contrato reproducible del linker de Bun

## Pregunta

¿Un clon nuevo reproduce el grafo hoisted usado por el baseline TypeScript sin
que el operador recuerde un flag manual?

## Evidencia roja

El control leyó `bunfig.toml` y encontró `install.linker=None`. Por tanto,
`bun install --frozen-lockfile` seleccionaba isolated aunque las mediciones del
loop dependían de `--linker hoisted`.

## Implementación

`bunfig.toml` declara `[install] linker = "hoisted"`. El test usa `tomllib` y
falla si la configuración vuelve a depender del CLI.

## Resultado

El control queda verde y `bun install --frozen-lockfile` acepta el lock sin el
flag. El universo esperado es el ya medido con hoisted: 4 917 diagnósticos tras
el bloque provider.

*Métrica:* valor efectivo declarado del linker y éxito de instalación frozen.
*Ciega a:* cambios futuros de resolución dentro de Bun con el mismo nombre de
linker; el typecheck completo sigue siendo el control conductual.
