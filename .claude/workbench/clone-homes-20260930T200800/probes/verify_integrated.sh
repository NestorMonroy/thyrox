#!/usr/bin/env bash
# Verifica en el árbol principal lo integrado de TASK-THYROX-0675:
# cada suite con su propio código de salida (sin `| tail`, TASK-THYROX-0649).
set -uo pipefail
cd "${THYROX_ROOT:-/home/user/thyrox}" || exit 2
failed=0
step=0
run() {
    step=$((step+1))
    local log="$LOGS/step-$step.log"
    echo "== $*"
    "$@" >"$log" 2>&1
    local rc=$?
    tail -n 3 "$log"
    echo "exit=$rc"
    [ "$rc" = 0 ] || failed=$((failed+1))
}
LOGS=$(mktemp -d)
export PYTHONPATH=src PYTHONDONTWRITEBYTECODE=1
run bash bin/generate_bin --check
run python3 tests/paths/test_ensure_homes.py
run bash tests/install/test_install.sh
run python3 tests/paths/test_declaration_port.py
run python3 tests/paths/test_ensure_home.py
run python3 tests/session/test_generate_bin.py
run bash bin/check_lint_zero install.sh src/paths/declarations.py src/paths/ensure_homes.py tests/install/test_install.sh tests/paths/test_ensure_homes.py
run bash bin/check_identifier_language install.sh src/paths/declarations.py src/paths/ensure_homes.py tests/install/test_install.sh tests/paths/test_ensure_homes.py
echo "suites-fallidas=$failed"
exit "$failed"
