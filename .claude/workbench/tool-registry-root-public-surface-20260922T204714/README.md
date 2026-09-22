# Superficie pública raíz de tool-registry

## Pregunta

¿Los `TS2305` atribuidos a `@thyrox/tool-registry` corresponden a símbolos no
portados o a implementaciones canónicas ocultas por el barrel raíz?

## Evidencia

Los diez símbolos distintos solicitados por los consumidores ya existen en
`runtime.ts` y `host.ts`. La prueba roja del import raíz falló primero porque
`TOOL_PRESETS` no estaba publicado por `src/index.ts`.

## Implementación

El barrel publica explícitamente las puertas de runtime y el instalador de host.
No reexporta `api.ts`: `runtime.ts` preserva el contrato que instala los bindings
antes de operar, y evita que los consumidores eludan esa frontera.

## Resultado

La prueba pública pasa. El typecheck bajó de 4 971 diagnósticos en 941 archivos
a 4 946 en 941; TS2305 bajó de 538 a 516 y las 16 aristas atribuidas a
`@thyrox/tool-registry` quedaron en cero. El delta de TS2305 es mayor que las
aristas directas porque publicar la superficie permite resolver imports
relacionados que TypeScript antes detenía en la frontera.

*Métrica:* aristas TS2305 del provider, prueba pública y cabeceras TypeScript
totales.

*Ciega a:* conducta de cada herramienta después de instalar bindings; esa
conducta pertenece a sus suites de integración.
