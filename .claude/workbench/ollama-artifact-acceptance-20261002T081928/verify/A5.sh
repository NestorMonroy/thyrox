#!/usr/bin/env bash
# Verificador determinista de A5 (contract.md §3): alcance, rojo contra la base, suites y gates de §5.
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; bank="$(dirname "$here")"
root="$(git -C "$PWD" rev-parse --show-toplevel)"; cd "$root" || exit 2
gates="$root/.claude/workbench/managed-podman-execution-boundary-20261001T164746/verify"
rc=0
bash "$gates/scope.sh" A5 src/packages/model-artifacts/modelQualification.ts src/packages/model-artifacts/__tests__/modelQualification.test.ts src/packages/provider/src/cost/policy.ts src/packages/provider/__tests__/recommendExecution.test.ts || rc=1
tests="$(git status --porcelain -- src | gawk '{print $NF}' | grep -E '__tests__/.*\.test\.ts$' | paste -sd' ')"
[[ -n "$tests" ]] || { echo "A5: sin pruebas nuevas o cambiadas"; rc=1; }
[[ -z "$tests" ]] || bash "$gates/red_against_base.sh" A5 $tests || rc=1
for pkg in model-artifacts provider; do
  (cd "src/packages/$pkg" && bun test >"$bank/outputs/A5-$pkg.log" 2>&1) || { echo "FALLA suite $pkg"; rc=1; }
done
bash "$here/gates.sh" || rc=1
echo "A5 exit=$rc"; exit $rc
