#!/usr/bin/env bash
# Verifica en el árbol principal lo integrado de TASK-THYROX-0672:
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
run python3 tests/session/test_pool_lifecycle.py
run bash tests/session/test-headless-pool-lifecycle.sh
run bash tests/session/test-headless-pool.sh
run bash bin/check_lint_zero src/session/headless-pool.sh src/session/pool_lifecycle.py tests/session/test-headless-pool-lifecycle.sh tests/session/test-headless-pool.sh tests/session/test_pool_lifecycle.py
run bash bin/check_identifier_language src/session/headless-pool.sh src/session/pool_lifecycle.py tests/session/test-headless-pool-lifecycle.sh tests/session/test-headless-pool.sh tests/session/test_pool_lifecycle.py
echo "suites-fallidas=$failed"
exit "$failed"
