# has-permissions-to-use-tool-2-1-281

## El encargo

Portar `hasPermissionsToUseTool`, ausente en 8 importadores (TS2305 ×8).

## Las piezas

| archivo | qué es |
|---|---|
| `outputs/D0t.js` | la cadena interior de 2.1.281 (`chunk-4n4g22z6.js`, ≙ `hasPermissionsToUseToolInner`) |
| `outputs/BC.js` | la mitad por reglas de 2.1.281 (≙ `checkRuleBasedPermissions`, antes `oT` en 2.1.275) |
| `outputs/outer.js`, `outer.pretty.js` | `eMo`, la exterior de 2.1.281 (ocho argumentos), formateada con prettier |

## Los resultados

El porte siguió el contrato de 2.1.88 (cinco argumentos), que es el que
llaman los consumidores; la diferencia con `eMo` es la deriva de la tarea #18.
tsc 2390 → 2379 en `step-073`.

*Métrica:* los extractos son el cuerpo de cada función, delimitado por llaves
desde su declaración.
*Ciega a:* los auxiliares minificados que esas funciones llaman, que no se
extrajeron.
