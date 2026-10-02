#!/usr/bin/env bash
# Verificación de H1 en su worktree: la suite del inventario, la evidencia TDD, el alcance y el RED contra la base.
set -uo pipefail
wb="$(cd "$(dirname "$0")/.." && pwd)"; root="$(git -C "$wb" rev-parse --show-toplevel)"; cd "$root" || exit 2
bench="${wb#"$root"/}"; gates="$root/.claude/workbench/managed-podman-execution-boundary-20261001T164746/verify"
fail=0
bash tests/session/test-hardware-inventory.sh > /dev/null 2>&1 || { echo "FALLA test-hardware-inventory"; fail=1; }
for log in red green annulment; do [[ -s "$wb/outputs/H1-$log.log" ]] || { echo "FALLA falta outputs/H1-$log.log"; fail=1; }; done
bash "$gates/scope.sh" H1 src/session/hardware-inventory.sh tests/session/test-hardware-inventory.sh tests/session/hardware "$bench" || fail=1
mapfile -t changed_tests < <(bash "$gates/changed_tests.sh")
if (( ${#changed_tests[@]} == 0 )); then echo "FALLA H1 no añadió ninguna prueba"; fail=1
else bash "$gates/red_against_base.sh" H1 "${changed_tests[@]}" > /dev/null || { echo "FALLA RED/GREEN contra la base"; fail=1; }; fi
exit "$fail"
