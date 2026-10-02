#!/usr/bin/env bash
# Verificador determinista de R6 (contract.md). No confía en el texto del trabajador:
# alcance, rojo contra la base, suites y gates. Todo Python por uv.
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; bank="$(dirname "$here")"
root="$(git -C "$PWD" rev-parse --show-toplevel)"; cd "$root" || exit 2
gates="$root/.claude/workbench/managed-podman-execution-boundary-20261001T164746/verify"
bash "$here/uv_env.sh" "$root" || exit 2
rc=0
bash "$gates/scope.sh" R6 src/session/task_continuation.py tests/session/test_task_continuation.py || rc=1
tests="$(git status --porcelain -- tests | gawk '{print $NF}' | grep -E '\.(py|sh)$' | paste -sd' ')"
[[ -n "$tests" ]] || { echo "R6: sin pruebas nuevas o cambiadas"; rc=1; }
[[ -z "$tests" ]] || bash "$gates/red_against_base.sh" R6 $tests || rc=1
for s in tests/session/test_task_continuation.py tests/session/test_continuation_frontier.py tests/roster/test_execution_roster.py; do
  case "$s" in
    *.py) PYTHONPATH=src uv run --frozen --no-sync python -m pytest -q "$s" >"$bank/outputs/R6-$(basename "$s").log" 2>&1 || { echo "FALLA $s"; rc=1; } ;;
    *.sh) bash "$s" >"$bank/outputs/R6-$(basename "$s").log" 2>&1 || { echo "FALLA $s"; rc=1; } ;;
  esac
done
bash bin/generate_bin --check >/dev/null 2>&1 || { echo "bin/ desactualizado"; rc=1; }
echo "R6 exit=$rc"; exit $rc
