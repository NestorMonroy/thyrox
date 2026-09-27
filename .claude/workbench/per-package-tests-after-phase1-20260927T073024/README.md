# Diagnostico por paquete tras la Fase 1 (4357a89f)

Mismo `run-one.sh` y `aggregate.sh` que el diagnostico de partida
(`../per-package-tests-20260927T071825/`), sobre los 48 paquetes, con
`bin/run-task-pool --width 2` bajo `thyrox-bg`. Tabla en `report.md`.

Delta exacto contra la partida (estado y `Ran N tests`):

| paquete | antes | despues |
|---|---|---|
| coordination | sin __tests__ (2) | PASS, 60 |
| paths | sin __tests__ (2) | PASS, 84 |
| store | sin __tests__ (2) | PASS, 4 |
| task | sin __tests__ (2) | PASS, 44 |
| workbench | sin __tests__ (2) | PASS, 52 |
| shell | PASS, 186 | PASS, 284 (las 4 de `src/__test__`) |
| tool-registry | FAIL, 1412 (1 fail) | FAIL, 1414 (1 fail; + SyntheticOutputTool) |

Totales: PASS 33 -> 38, sin __tests__ 13 -> 8, FAIL 2 -> 2. Codigo global 2.
Los fallos de provider (3) y tool-registry (1) no cambian: son de la Fase 3.

*Metrica:* estado, exit y `Ran N tests` de cada `results/<paquete>.tsv`.
*Ciega a:* que las pruebas movidas midan lo mismo que antes de moverse — lo
cubre que el conteo de cada paquete movido sea el que daban en `tests/`.
