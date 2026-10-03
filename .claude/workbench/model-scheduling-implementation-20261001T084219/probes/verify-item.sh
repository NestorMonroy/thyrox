#!/usr/bin/env bash
# Verify de un ítem del pool de model-scheduling-implementation (TASK-THYROX-0699).
# Las pruebas son el contrato: un ítem que toca una prueba, el contrato o los dobles se rechaza.
# Corre las suites que cubren los archivos de implementación que el ítem tocó, y el typecheck.
set -uo pipefail
mapfile -t changed < <(git status --porcelain -uall | gawk '{print $2}')
package=src/packages/model-scheduling
suites=(); rc=0
for path in "${changed[@]}"; do
  case "$path" in
    $package/__tests__/*|$package/testing/*|$package/coordinationContract.ts|$package/coordination.ts|$package/vramLedger.ts|$package/executionPrimitive.ts)
      echo "verify: el ítem tocó el contrato o sus pruebas: $path" >&2; exit 1 ;;
    $package/memoryCoordination.ts|$package/redisCoordination.ts|$package/coordinationFactory.ts)
      suites+=(__tests__/memoryCoordination.test.ts __tests__/redisCoordination.test.ts __tests__/coordinationTopology.test.ts) ;;
    $package/memoryVramLedger.ts) suites+=(__tests__/memoryVramLedger.test.ts) ;;
    $package/scheduler.ts) suites+=(__tests__/scheduler.test.ts) ;;
  esac
done
test "${#suites[@]}" -gt 0 || { echo "verify: el ítem no tocó ningún archivo de implementación" >&2; exit 1; }
mapfile -t unique_suites < <(printf '%s\n' "${suites[@]}" | sort -u)
(cd "$package" && bun test "${unique_suites[@]}") || rc=1
bash bin/check_package_typecheck --strict model-scheduling || rc=1
exit "$rc"
