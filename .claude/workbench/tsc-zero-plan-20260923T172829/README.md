# Sondas del plan tsc cero

`fixCensus.ts`: para cada diagnóstico que el servicio de lenguaje de
TypeScript ve en el proyecto, qué code fixes ofrece (`fixName:fixId`).
Salida en `fixCensus.out`, una fila por diagnóstico: código, archivo, posición,
arreglos. Se lanzó con `bin/thyrox-bg` (job `fix-census-*`).

`missing-symbols-absent.txt`: símbolos de TS2305 sin ninguna declaración
`export (function|const|class|type|…)` bajo `src/packages`.

Las cifras de esta medición NO se transcriben aquí ni en el plan: están
fechadas en la bitácora (`kaupamex-docs: …/resolve-all-thyrox-errors/
progress.rst`, vigésimo tercer bloque). Se reproducen corriendo la sonda.

Métrica: diagnósticos sintácticos y semánticos por archivo, del servicio de
lenguaje.
Ciega a: el universo de `tsc --noEmit`, que no es el mismo (no se suman ni
restan); y a si el arreglo es seguro — eso lo decide el plan por `fixId`.

Esta sonda es provisional: el plan la convierte en `bin/tsc_fix_census`, con
TDD y anulación.
