#!/usr/bin/env bash
# Verify del ítem de la unidad de modelo sobre la primitiva neutral (TASK-THYROX-0702).
# Las pruebas son el contrato: tocar una prueba, un doble o el puerto rechaza el ítem.
set -uo pipefail
mapfile -t changed < <(git status --porcelain -uall | gawk '{print $2}')
for path in "${changed[@]}"; do
  case "$path" in
    */__tests__/*|*/testing/*|src/packages/model-scheduling/executionPrimitive.ts)
      echo "verify: el ítem tocó el contrato o sus pruebas: $path" >&2; exit 1 ;;
  esac
done
rc=0
(cd src/packages/podman-execution && bun test __tests__/workerResourceProfile.test.ts __tests__/workerContainerLifecycle.test.ts && bunx tsc -p tsconfig.build.json) || rc=1
(cd src/packages/model-scheduling && bun test __tests__/podmanModelExecutionPrimitive.test.ts __tests__/scheduler.test.ts) || rc=1
bash bin/check_package_typecheck --strict podman-execution model-scheduling || rc=1
exit "$rc"
