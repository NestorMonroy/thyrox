# package-attribution

## Qué se preguntaba

El campo `EmitResult.errors` que `check_package` publica, ¿cuenta los errores
**del paquete** o los de su **cierre entero**?

## Qué se recogió

Su docstring decía «cuenta los errores de UN paquete». Medido sobre `storage`:

| | errores |
|---|---|
| total que el mecanismo publicaba | **7062** |
| en `src/` del propio paquete | **769** (10.9 %) |
| por `node_modules/@thyrox/*` | **6293** (89.1 %) |
| del peor hermano, `tool-registry` | 5262 |

Es el sub-patrón A con el propio mecanismo de sujeto —un rótulo sobre métricas
mezcladas— y el mismo defecto estructural que el gate del consumidor tiene un
nivel más arriba. Un baseline por paquete construido sobre esa cifra congelaría
89 % de errores ajenos en cada entrada.

Segundo hallazgo, del mismo pase: los tres controles de `check_package` que ya
existían estaban verdes **por la razón equivocada**. Su `errors == 1` era el
**TS2688** de un `@types/bun` irresoluble desde el fixture, no el error de tipo
que el fixture escribe. Sub-patrón D con esta suite de sujeto — el mismo trampa
que ya había mordido a `escaping_files`.

*Métrica:* líneas `^<ruta>(<línea>,<columna>): error TS<N>`, repartidas por la
resolución de su ruta contra el directorio del paquete.
*Ciega a:* el primer reparto se midió con un prefijo (`$1 == node_modules`),
correcto para los 26 paquetes con enlace propio y **falso** para los 17 que
resuelven por la raíz, cuya ruta sale con `..` delante; `headless-sdk`, elegido
como control de ese segundo caso, no lo ejercita (sus tres hermanos dan TS2307
y no resuelven); y no se midió si un error de hermano se cuenta dos veces
cuando dos paquetes lo alcanzan.

## Control de anulación

Colapsado el clasificador a «todo es propio», caen **exactamente** las cuatro
aserciones que dependen de él —las dos formas de enlace × (propio, hermano)— y
ninguna más: 25 ok / 4 falla contra 29 ok / 0 falla. Ver `anulacion.txt`.
