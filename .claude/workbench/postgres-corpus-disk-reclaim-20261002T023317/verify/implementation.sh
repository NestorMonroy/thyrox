#!/usr/bin/env bash
# Verificación de un ítem de implementación de P0 (P1, P2, P3) en su worktree: las pruebas de
# semantic-search en verde, typecheck del paquete, la evidencia TDD, el alcance y el RED contra la base.
# Uso: implementation.sh <ítem> <archivo-propio>...
set -uo pipefail
item="$1"; shift
wb="$(cd "$(dirname "$0")/.." && pwd)"; root="$(git -C "$wb" rev-parse --show-toplevel)"; cd "$root" || exit 2
bench="${wb#"$root"/}"; gates="$root/.claude/workbench/managed-podman-execution-boundary-20261001T164746/verify"
fail=0
(cd src/packages/semantic-search && bun test > /dev/null 2>&1) || { echo "FALLA pruebas de semantic-search"; fail=1; }
(cd src/packages/semantic-search && bunx tsc -p tsconfig.test.json --noEmit > /dev/null 2>&1) || { echo "FALLA typecheck de semantic-search"; fail=1; }
for log in red green annulment; do [[ -s "$wb/outputs/$item-$log.log" ]] || { echo "FALLA falta outputs/$item-$log.log"; fail=1; }; done
bash "$gates/scope.sh" "$item-0758" "$@" "$bench" || fail=1
mapfile -t changed_tests < <(bash "$gates/changed_tests.sh")
if (( ${#changed_tests[@]} == 0 )); then echo "FALLA $item no añadió ninguna prueba"; fail=1
else bash "$gates/red_against_base.sh" "$item-0758" "${changed_tests[@]}" > /dev/null || { echo "FALLA RED/GREEN contra la base"; fail=1; }; fi
exit "$fail"
