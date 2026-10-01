#!/usr/bin/env bash
# Verify de un ítem del coordinador de model scheduling (TASK-THYROX-0734).
# Las pruebas son el contrato: tocar una prueba, un doble o el puerto rechaza el ítem.
set -uo pipefail
mapfile -t changed < <(git status --porcelain -uall | gawk '{print $2}')
scheduling=src/packages/model-scheduling
suites=(); rc=0
for path in "${changed[@]}"; do
  case "$path" in
    */__tests__/*|*/testing/*|$scheduling/executionPrimitive.ts|$scheduling/vramLedger.ts|$scheduling/coordination.ts)
      echo "verify: el ítem tocó el contrato o sus pruebas: $path" >&2; exit 1 ;;
    $scheduling/hostCoordinator.ts|$scheduling/residencyController.ts)
      suites+=(__tests__/hostCoordinator.test.ts __tests__/residencyController.test.ts __tests__/scheduler.test.ts) ;;
    $scheduling/coordinatorServer.ts|$scheduling/coordinatorClient.ts|$scheduling/coordinatorProtocol.ts)
      suites+=(__tests__/coordinatorTransport.test.ts) ;;
  esac
done
test "${#suites[@]}" -gt 0 || { echo "verify: el ítem no tocó ningún archivo de implementación" >&2; exit 1; }
mapfile -t unique < <(printf '%s\n' "${suites[@]}" | sort -u)
(cd "$scheduling" && bun test "${unique[@]}") || rc=1
bash bin/check_package_typecheck --strict model-scheduling || rc=1
exit "$rc"
