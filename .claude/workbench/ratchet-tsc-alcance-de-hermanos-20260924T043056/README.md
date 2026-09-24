# ratchet-tsc-alcance-de-hermanos

## El encargo

El commit de los pines del proveedor fallo en el pre-commit:
`check-cli-typecheck: tsconfig.json CRECE — 2428 sobre un baseline de 2375`.
Pregunta: ¿el crecimiento lo trajo ese bloque o ya estaba en HEAD?

## La premisa, si se corrigio al primer comando

Se asumia que el crecimiento lo traian los cinco archivos del bloque. Falso:
con los cinco revertidos (`pins.patch` fuera del arbol) el conteo seguia en
2428. El crecimiento ya estaba en HEAD.

## Las piezas

| archivo | que hace |
|---|---|
| `outputs/now.txt` | errores `TS` unicos con el bloque aplicado (2428) |
| `outputs/pins.patch` | el bloque, sacado del arbol para medir sin el |
| `outputs/head-tsc.log` | salida del gate con el bloque revertido: 2428 |
| `outputs/headerr.txt` | errores `TS` unicos de esa salida |
| `outputs/changed.txt` | archivos de `src/` cambiados entre `547d8b63` (el baseline 2375) y HEAD |
| `outputs/prev.txt` | vacio: un pre-commit que pasa no imprime errores, asi que no hay lista previa que comparar |

## Los resultados

- Los archivos cambiados desde `547d8b63` tienen **0** errores.
- `agent/QueryEngine.ts` tiene **53**, y 2428 − 2375 = 53: se volvio
  alcanzable al exportar `./query-engine` en `52ef50a3`.
- Los commits `52ef50a3` y `9770e5d6` pasaron el gate **eximidos**
  (`sin cambios en el paquete`): el alcance era `src/packages/cli/` y el
  proyecto compila a todos los hermanos. Arreglo en `792b5cb8`, con el caso
  del hermano en `tests/verify/test-cli-typecheck.sh`; revertido el arreglo,
  cae exactamente ese caso (19 ok, 1 fallo).

*Metrica:* lineas `error TS` unicas por archivo, en los dos proyectos del gate.
*Ciega a:* errores que desaparecieron y fueron sustituidos por otros en el
mismo archivo; la igualdad 53 = 53 es de conteo, no de identidad de cada error.
