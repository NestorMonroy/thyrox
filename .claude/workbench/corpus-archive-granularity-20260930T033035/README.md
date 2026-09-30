# ¿Un `.7z` por versión o uno para varias versiones?

`archive_build_corpus` justifica el `.7z` SÓLIDO frente a uno por archivo
(31 % menor), pero nunca comparó un `.7z` por versión contra uno que junte
varias builds. Dos builds consecutivas comparten casi todos sus chunks, así
que la redundancia ENTRE versiones es la que un archivo por versión no
aprovecha.

Medido con `7z a -t7z -mx=9` (los parámetros del archivador), 2026-09-30:

| Forma | Bytes | Pared |
|---|---|---|
| 2.1.281 sola (98 280 263 B crudos) | 16 441 806 | 47.94 s |
| 2.1.282 sola (98 974 059 B crudos) | 16 696 372 | 49.35 s |
| las dos por separado | 33 138 178 | 97.29 s |
| las dos en un `.7z` | 27 009 293 | 99.75 s |

Juntas ocupan un **18.5 % menos** que por separado, con el mismo tiempo.

*Métrica:* bytes del `.7z` producido, sobre dos builds consecutivas.
*Ciega a:* cómo escala con más builds (la ganancia debería crecer, no está
medida con cinco), y al coste de recuperar UNA build de un archivo conjunto
sólido: hay que descomprimir el bloque sólido entero.

El primer intento (`granularity-*`) salió 127: `7z` no estaba instalado.
Se instaló `p7zip-full`, el remedio que ya nombra `archive_extract`.

Sonda: `probes/measure.sh`. Un defecto suyo: el temporal se resolvía
relativo tras el `cd` y aterrizó bajo `_references/claude-code-bin/.claude/`;
se retiró a mano al terminar.
