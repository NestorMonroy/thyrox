#!/usr/bin/env bash
# Verificador determinista de A7 (contract.md §3): alcance, rojo contra la base, suites y gates de §5.
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; bank="$(dirname "$here")"
root="$(git -C "$PWD" rev-parse --show-toplevel)"; cd "$root" || exit 2
gates="$root/.claude/workbench/managed-podman-execution-boundary-20261001T164746/verify"
rc=0
bash "$gates/scope.sh" A7 src/packages/model-artifacts/modelQualification.ts src/packages/model-artifacts/__tests__/modelQualification.test.ts src/packages/model-artifacts/catalogEntry.ts src/packages/model-artifacts/__tests__/modelCatalog.test.ts src/packages/provider/src/cost/policy.ts src/packages/provider/__tests__/recommendExecution.test.ts || rc=1
# Prohibición de §5 para A7: ningún concepto de aprendizaje por refuerzo en lo que A7 toca.
if git grep --untracked -nE "\b(Reward|ValueFunction|QValue|ActionValue|ReinforcementPolicy|BanditPolicy)\b" -- src/packages/model-artifacts src/packages/provider/src/cost; then echo "A7: concepto de RL introducido"; rc=1; fi
tests="$(git status --porcelain -- src | gawk '{print $NF}' | grep -E '__tests__/.*\.test\.ts$' | paste -sd' ')"
[[ -n "$tests" ]] || { echo "A7: sin pruebas nuevas o cambiadas"; rc=1; }
[[ -z "$tests" ]] || bash "$gates/red_against_base.sh" A7 $tests || rc=1
for pkg in model-artifacts provider; do
  (cd "src/packages/$pkg" && bun test >"$bank/outputs/A7-$pkg.log" 2>&1) || { echo "FALLA suite $pkg"; rc=1; }
done
bash "$here/gates.sh" || rc=1
echo "A7 exit=$rc"; exit $rc
