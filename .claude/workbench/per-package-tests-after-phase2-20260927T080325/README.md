# Diagnóstico por paquete tras la Fase 2

Mismo `run-one.sh` y `aggregate.sh` que el de partida, sobre los 48 paquetes,
con `bin/run-task-pool --width 2` bajo `thyrox-bg`. Tabla en `report.md`.

Delta contra el diagnóstico tras la Fase 1 (exit, `Ran N tests`, estado):

| paquete | antes | después |
|---|---|---|
| audio-capture-napi | 2 - FAIL(sin __tests__) | 0 7 PASS |
| binary | 0 85 PASS | 0 90 PASS |
| computer-use-input | 2 - FAIL(sin __tests__) | 0 9 PASS |
| computer-use-mcp | 2 - FAIL(sin __tests__) | 0 25 PASS |
| computer-use-swift | 2 - FAIL(sin __tests__) | 0 13 PASS |
| finding | 0 8 PASS | 0 9 PASS |
| image-processor-napi | 2 - FAIL(sin __tests__) | 0 11 PASS |
| modifiers-napi | 2 - FAIL(sin __tests__) | 0 4 PASS |
| plan | 2 - FAIL(sin __tests__) | 0 11 PASS |
| tools | 0 77 PASS | 0 67 PASS |
| url-handler-napi | 2 - FAIL(sin __tests__) | 0 4 PASS |

Totales: PASS 38 -> 46, sin __tests__ 8 -> 0, FAIL 2 -> 2. Código global 1
(ya no 2: ningún paquete sin pruebas). Los dos rojos son los de la Fase 3.

El typecheck de los 11 paquetes tocados (`bin/check_package_typecheck
--strict`, trabajo `tc-p2`) da 0 errores propios y reconstruyó solo los dos
providers viejos (computer-use-mcp, computer-use-swift).

*Métrica:* estado, exit y `Ran N tests` de cada `results/<paquete>.tsv`.
*Ciega a:* si una prueba mide lo que dice; eso lo mide la anulación de cada
archivo, declarada en su cabecera.
