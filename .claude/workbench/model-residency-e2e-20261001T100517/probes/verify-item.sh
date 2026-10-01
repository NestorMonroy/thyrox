#!/usr/bin/env bash
# Verify de un ítem del pool de model-residency-implementation (TASK-THYROX-0699, 0701, 0702).
# Las pruebas son el contrato: un ítem que toca una prueba, un doble o el contrato se rechaza.
# Corre las suites de los archivos de implementación que el ítem tocó y el typecheck del paquete.
set -uo pipefail
mapfile -t changed < <(git status --porcelain -uall | gawk '{print $2}')
scheduling=src/packages/model-scheduling
local_models=src/packages/local-models
scheduling_suites=(); local_suites=(); rc=0
for path in "${changed[@]}"; do
  case "$path" in
    $scheduling/__tests__/*|$scheduling/testing/*|$local_models/__tests__/*|$local_models/testing/*|$scheduling/executionPrimitive.ts|$scheduling/vramLedger.ts|$scheduling/coordination.ts|$scheduling/coordinationContract.ts)
      echo "verify: el ítem tocó el contrato o sus pruebas: $path" >&2; exit 1 ;;
    $scheduling/memoryGrantIssuer.ts) scheduling_suites+=(__tests__/memoryGrantIssuer.test.ts __tests__/scheduler.test.ts) ;;
    $scheduling/memoryVramLedger.ts) scheduling_suites+=(__tests__/residencyLedger.test.ts __tests__/memoryVramLedger.test.ts) ;;
    $scheduling/residency.ts|$scheduling/residencyController.ts|$scheduling/scheduler.ts)
      scheduling_suites+=(__tests__/residency.test.ts __tests__/residencyController.test.ts __tests__/scheduler.test.ts) ;;
    $scheduling/podmanModelExecutionPrimitive.ts) scheduling_suites+=(__tests__/podmanModelExecutionPrimitive.test.ts) ;;
    $local_models/ollamaRuntimeAdapter.ts|$local_models/ollamaApi.ts)
      local_suites+=(__tests__/ollamaRuntimeAdapter.test.ts __tests__/ollamaApiInstall.test.ts) ;;
  esac
done
test "$(( ${#scheduling_suites[@]} + ${#local_suites[@]} ))" -gt 0 || { echo "verify: el ítem no tocó ningún archivo de implementación" >&2; exit 1; }
if test "${#scheduling_suites[@]}" -gt 0; then
  mapfile -t unique < <(printf '%s\n' "${scheduling_suites[@]}" | sort -u)
  (cd "$scheduling" && bun test "${unique[@]}") || rc=1
  bash bin/check_package_typecheck --strict model-scheduling || rc=1
fi
if test "${#local_suites[@]}" -gt 0; then
  mapfile -t unique < <(printf '%s\n' "${local_suites[@]}" | sort -u)
  (cd "$local_models" && bun test "${unique[@]}") || rc=1
  bash bin/check_package_typecheck --strict local-models || rc=1
fi
exit "$rc"
