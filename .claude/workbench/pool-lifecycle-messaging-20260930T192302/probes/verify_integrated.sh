#!/usr/bin/env bash
# Verifica en el árbol principal lo integrado de TASK-THYROX-0673:
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
run python3 src/session/generate_bin.py --check
run python3 tests/session/test_generate_bin.py
run bash -c "cd src/packages/cli && bun test __tests__/peerMessagingTools.test.ts"
run bash tests/session/test-send-message-two-cli.sh
run bash tests/session/test-list-agents-two-cli.sh
run bash bin/check_lint_zero src/session/generate_bin.py tests/session/test_generate_bin.py tests/session/test-send-message-two-cli.sh
run bash bin/check_package_typecheck --strict cli
echo "suites-fallidas=$failed"
exit "$failed"
