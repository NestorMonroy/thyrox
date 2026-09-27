# Ramas por NODE_ENV en código de producción

`git grep -n NODE_ENV` sobre `src/packages/**/*.ts{,x}` fuera de
`__tests__`, `*.test.*` y `testing/`: 54 apariciones en 13 paquetes
(`occurrences.txt`). Episodio que lo motiva: `forceExit` tenía dos ramas
por `NODE_ENV=test` que el ejecutable no tiene (`force-exit-port-*`).

Criterio por aparición: si el ejecutable (2.1.283, vía `bin/binary`) tiene
la misma rama, es fiel y se queda; si no, es conducta inventada que sólo
existe en pruebas y se porta la de producción.

Métrica: apariciones del identificador `NODE_ENV`.
Ciega a: una rama de prueba escrita con otra señal (`BUN_ENV`,
`process.env.CI`, un global), y a si la aparición es una rama o sólo una
lectura para registrar.
