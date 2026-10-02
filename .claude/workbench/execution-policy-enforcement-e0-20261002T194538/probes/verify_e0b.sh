#!/usr/bin/env bash
# Verificación de la ronda e0b en su worktree: suites de los tres detectores de
# la política y el gate de lint de los archivos tocados. Cada suite deja su log
# y su código real (no el de un `$(…)` posterior).
# Uso: verify_e0b.sh <worktree> <salida> <etiqueta>
set -uo pipefail
W="$1" O="$2" L="$3"
mkdir -p "$O"
cd "$W" || exit 2
status=0
for t in tests/hooks/test_execution_policy_enforcement.py tests/hooks/test_detect_client_background.py \
         tests/hooks/test_detect_agent_dispatch.py; do
    log="$O/$L-$(basename "$t" .py).log"
    python3 "$t" > "$log" 2>&1
    rc=$?
    (( rc == 0 )) || status=1
    printf '%s rc=%s %s\n' "$(basename "$t")" "$rc" "$(tail -1 "$log")"
done
files=(src/hooks/shell_text.py src/hooks/detect_client_background.py src/hooks/detect_controller_mutation.py
       tests/hooks/test_execution_policy_enforcement.py tests/session/test_user_wiring.py)
bash /home/user/thyrox/bin/check_lint_zero --root "$W" "${files[@]}" > "$O/$L-lint.log" 2>&1
rc=$?
(( rc == 0 )) || status=1
printf 'lint rc=%s\n' "$rc"; tail -3 "$O/$L-lint.log"
exit "$status"
