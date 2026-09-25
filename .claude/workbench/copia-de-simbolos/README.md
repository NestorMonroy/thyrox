# copia-de-simbolos

## El encargo

Copiar desde ccnmt los exports que el árbol no tiene (`TS2305`), en vez de
reimplementarlos: «copia lo que puedas copiar hacia thyrox».

## Las piezas

| archivo | qué es |
|---|---|
| `candidatos-seco.jsonl` | la salida de `src/verify/copy_missing_symbols.ts` sin escribir: 16 archivos, 30 símbolos |
| `seco.err` | los 2 símbolos omitidos (la fuente no los exporta) y el resumen |

## Los resultados

Paso 074 del lazo: ninguno aceptado. Seis cargaron con los 13 diagnósticos del
propio copiador (corregido en `d38c3d15`); diez quitaron sus `TS2305` pero
trajeron diagnósticos nuevos a su archivo, porque el código de ccnmt no es
estricto bajo este tsconfig. El reparto por archivo está en las reflexiones del
paso 074.

*Métrica:* `TS2305` del log de tsc resueltos a un archivo con par en la fuente.
*Ciega a:* el símbolo que ccnmt declara en otro archivo que el destino reexporta.
