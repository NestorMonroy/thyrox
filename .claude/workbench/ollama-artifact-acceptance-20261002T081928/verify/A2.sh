#!/usr/bin/env bash
# Verificador determinista de A2 (contract.md §3): alcance, rojo contra la base, suites y gates de §5.
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; bank="$(dirname "$here")"
root="$(git -C "$PWD" rev-parse --show-toplevel)"; cd "$root" || exit 2
gates="$root/.claude/workbench/managed-podman-execution-boundary-20261001T164746/verify"
rc=0
bash "$gates/scope.sh" A2 src/packages/model-artifacts/catalogEntry.ts src/packages/model-artifacts/__tests__/catalogEntry.test.ts src/packages/local-models/catalogCommand.ts src/packages/local-models/declareInstalledModel.ts src/packages/local-models/__tests__/declareInstalledModel.test.ts src/packages/local-models/__tests__/catalogCommand.test.ts || rc=1
tests="$(git status --porcelain -- src | gawk '{print $NF}' | grep -E '__tests__/.*\.test\.ts$' | paste -sd' ')"
[[ -n "$tests" ]] || { echo "A2: sin pruebas nuevas o cambiadas"; rc=1; }
[[ -z "$tests" ]] || bash "$gates/red_against_base.sh" A2 $tests || rc=1
for pkg in local-models model-artifacts; do
  (cd "src/packages/$pkg" && bun test >"$bank/outputs/A2-$pkg.log" 2>&1) || { echo "FALLA suite $pkg"; rc=1; }
done
bash "$here/gates.sh" || rc=1
echo "A2 exit=$rc"; exit $rc
