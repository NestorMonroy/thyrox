# Superficie pública de output formatters

## Pregunta

¿Los `TS2305` de `@thyrox/output/formatters` corresponden a helpers ausentes o
a un barrel cuya exclusión de `truncate.ts` quedó obsoleta?

## Evidencia

`truncate.ts` ya implementa los helpers width-aware y `@anthropic/ink` está
materializado como workspace. La prueba roja falló por `truncate` ausente del
barrel, no por falta de implementación.

## Implementación

El barrel vuelve a publicar el módulo canónico `truncate.ts`; no duplica lógica
ni sustituye la medición de ancho terminal.

## Resultado

La prueba pública pasa. El typecheck baja de 4 917 diagnósticos en 933 archivos
a 4 911 en 932; TS2305 baja de 486 a 480 y las seis aristas atribuidas a
`@thyrox/output/formatters` quedan en cero.

*Métrica:* aristas TS2305 del provider, prueba conductual y cabeceras globales.
*Ciega a:* render visual completo; las funciones se prueban con ancho y salida.
