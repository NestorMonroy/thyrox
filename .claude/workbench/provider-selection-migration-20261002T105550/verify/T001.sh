#!/usr/bin/env bash
# Verificación de T001 (TASK-THYROX-0750), corrida por el controlador en el worktree del ítem: las
# pruebas propias y las del selector en verde, el alcance, y el RED de las pruebas nuevas contra la base.
set -uo pipefail
wb="$(cd "$(dirname "$0")/.." && pwd)"; root="$(git -C "$wb" rev-parse --show-toplevel)"; cd "$root" || exit 2
bench="${wb#"$root"/}"; gates="$root/.claude/workbench/managed-podman-execution-boundary-20261001T164746/verify"
fail=0
for suite in src/__tests__/candidateSources.test.ts src/__tests__/providerSelection.test.ts src/__tests__/apiModelCatalog.test.ts; do
  (cd src/packages/provider && bun test "$suite" > /dev/null 2>&1) || { echo "FALLA $suite"; fail=1; }
done
grep -qE "export function (localModelCandidates|remoteModelCandidates|rankedCatalogCandidates)" src/packages/provider/src/selection/candidateSources.ts \
  && [[ "$(grep -cE "export function (localModelCandidates|remoteModelCandidates|rankedCatalogCandidates)\b" src/packages/provider/src/selection/candidateSources.ts)" -eq 3 ]] \
  || { echo "FALLA faltan las tres fuentes exportadas"; fail=1; }
grep -qiE "claude" src/packages/provider/src/selection/candidateSources.ts && { echo "FALLA candidateSources nombra a un proveedor concreto"; fail=1; }
for log in red green annulment; do [[ -s "$wb/outputs/T001-$log.log" ]] || { echo "FALLA falta outputs/T001-$log.log"; fail=1; }; done
owned=(src/packages/provider/src/selection/candidateSources.ts src/packages/provider/src/__tests__/candidateSources.test.ts "$bench")
bash "$gates/scope.sh" T001-0750 "${owned[@]}" || fail=1
mapfile -t changed_tests < <(bash "$gates/changed_tests.sh")
if (( ${#changed_tests[@]} == 0 )); then echo "FALLA T001 no añadió ninguna prueba"; fail=1
else bash "$gates/red_against_base.sh" T001-0750 "${changed_tests[@]}" > /dev/null || { echo "FALLA RED/GREEN contra la base"; fail=1; }; fi
exit "$fail"
