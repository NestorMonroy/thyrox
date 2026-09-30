# TASK-THYROX-0437 — presupuesto de módulos por camino de arranque

Gate: `src/verify/checkStartupModuleBudget.ts`. Prueba:
`tests/verify/checkStartupModuleBudget.test.ts` (7 casos). Baseline:
`.claude/baselines/startup_module_budget.json`.

## Medición al congelar el baseline (2026-09-30)

| Camino | Entrada | Módulos |
|---|---|---|
| providers | `src/packages/cli/src/commands/providers-commands.ts` | 90 |
| mitm | `src/packages/cli/src/commands/mitm-commands.ts` | 1018 |
| bootstrap | `src/packages/app-host/src/runtime/bootstrap.ts` | 2903 |

Coinciden con la sonda del banco `startup-flow-130`.

*Métrica:* claves de `require.cache` tras importar la entrada en un proceso
aparte por camino.
*Ciega a:* módulos cargados después del import (carga perezosa en tiempo de
ejecución) y al tiempo de carga: el tope es de cantidad, no de pared.

## Control de anulación

`compareBudget` devolviendo `[]`: caen exactamente los casos 2 y 5 (los que
exigen reportar un camino sobre su tope); 5 pasan. Restaurado: 7/7 y
`git diff --stat` vacío sobre `src/verify/`.

## Divergencias con la redacción de la tarea

- **Sin envoltorio en `bin/`.** `generate_bin.py` sólo genera envoltorios TS
  desde directorios `bin/` o `entry/` con shebang; un gate de `src/verify/` se
  invoca con `bun src/verify/checkStartupModuleBudget.ts`, como
  `checkEnvPrefix.ts`.
- **La prueba vive en `tests/verify/`**, junto a la de `checkEnvPrefix`, no en
  `src/verify/__tests__`.
