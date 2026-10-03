#!/usr/bin/env bash
# p2e: la entrada pública retirada, bin/ al día, gate y arquitectura en verde, controlador intacto.
set -uo pipefail
wb="$(cd "$(dirname "$0")/.." && pwd)"; cd "$(git -C "$wb" rev-parse --show-toplevel)" || exit 2; fail=0
[[ ! -e bin/podman-execution-execute ]] || { echo "FALLA bin/podman-execution-execute sigue"; fail=1; }
[[ ! -e src/packages/podman-execution/bin/execute.ts ]] || { echo "FALLA execute.ts sigue en bin/"; fail=1; }
bash bin/generate_bin --check >/dev/null 2>&1 || { echo "FALLA generate_bin --check"; fail=1; }
uv run --frozen --no-sync python src/verify/check_podman_materialization.py --root "$PWD" --strict >/dev/null 2>&1 || { echo "FALLA gate de materialización"; fail=1; }
uv run --frozen --no-sync python tests/session/test_task_continuation.py >/dev/null 2>&1 || { echo "FALLA controlador"; fail=1; }
failed="$(cd src/packages/podman-execution && bun test 2>&1 | gawk '/^ *[0-9]+ fail$/ { print $1 }' | tail -1)"
[[ "$failed" == 0 ]] || { echo "FALLA suite podman-execution: ${failed:-?}"; fail=1; }
for log in red green annulment; do [[ -s "$wb/outputs/p2e-$log.log" ]] || { echo "FALLA falta p2e-$log"; fail=1; }; done
# Gates del verificador, no del trabajador (ejecutor 2026-10-02): alcance y RED contra la base.
bash "$wb/verify/scope.sh" p2e bin src/packages/podman-execution src/lib/managed_execution.sh src/session/task_continuation.py src/session/control_plane_entries.tsv src/verify tests/verify || fail=1
mapfile -t changed_tests < <(bash "$wb/verify/changed_tests.sh")
if (( ${#changed_tests[@]} == 0 )); then echo "FALLA p2e no añadió ni cambió ninguna prueba"; fail=1
else bash "$wb/verify/red_against_base.sh" p2e "${changed_tests[@]}" > /dev/null || { echo "FALLA RED/GREEN contra la base (outputs/p2e-red-verified.log)"; fail=1; }; fi
exit "$fail"
