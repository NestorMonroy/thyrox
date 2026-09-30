# Censo de contratos de GlobalConfig y ProjectConfig

## El encargo

Continuar el plan hasta cero utilizando el provider y ejecutar hasta cuarenta
trabajos GNU/Linux en paralelo cuando el trabajo sea divisible.

## La pregunta

¿Qué tipo escribe realmente cada consumer para las propiedades que el
`GlobalConfig`/`ProjectConfig` parcial todavía no declara?

## El instrumento

`probes/census_missing_properties.sh` extrae únicamente propiedades nombradas
por TS2339/TS2551 en el último typecheck y entrega cada símbolo a GNU
`parallel --jobs 40`. Cada trabajo busca readers y writers con `rg`; el orden
se conserva para que el resultado sea comparable.

Antes de ejecutar se comprobó que `/usr/bin/parallel` era la implementación de
moreutils, que no acepta `--jobs`. Se instaló GNU parallel 20231122 desde los
repositorios del sistema y se repitió la sonda. El número 40 se usa para las
búsquedas independientes, no para lanzar cuarenta instancias de `tsc` que
competirían por memoria sobre el mismo grafo.

## El criterio

Sólo entran propiedades con reader y writer concordantes o cuya estructura se
observa completa en el writer. Los contadores y timestamps son `number`, los
guards son `boolean`, las listas MCP son `string[]` y los caches conservan la
estructura exacta escrita por su provider. No se usa `unknown`, `any` ni un
index signature para silenciar futuros nombres.

## Resultados

El censo encontró 28 propiedades y 57 diagnósticos en el baseline de entrada. Después de declarar únicamente las formas respaldadas por readers y writers, los 57 diagnósticos de `GlobalConfig`/`ProjectConfig` quedaron en cero. El typecheck del checkout actual publica 5 066 diagnósticos en 952 archivos; no se compara ese total directamente con el de la sesión anterior porque este contenedor reinstaló Bun, el lock y los workspaces antes de medir. La familia objetivo sí es comparable porque ambos logs están versionados y el patrón es idéntico.

El preflight decía inicialmente `ok · parallel` sobre la implementación de moreutils. El primer uso de `--jobs 40` lo falsó. Se añadió un control rojo con un homónimo ejecutable y el provider ahora exige por conducta que `parallel --version` identifique GNU parallel; la suite pasa 11 de 11.

*Métrica:* diagnósticos TS2339/TS2551 del sujeto y total de cabeceras
`error TS####`, no líneas del log.

*Ciega a:* contratos bloqueados por imports que todavía no resuelven y a la
corrección de los servicios remotos que producen los valores cacheados.
