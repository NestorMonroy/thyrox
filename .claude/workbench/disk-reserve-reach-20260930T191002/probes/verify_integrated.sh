#!/usr/bin/env bash
# Verifica en el árbol principal lo integrado de TASK-THYROX-0671 y 0661:
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
run bash tests/repo/test-disk-headroom.sh
run python3 tests/session/test_resource_admission.py
run bash tests/lib/test-infrastructure.sh
run bash tests/session/test-infrastructure-ensure.sh
run bash -c "cd src/packages/provider && bun test src/proxy/__tests__/openaiCompatDeclaration.test.ts src/proxy/__tests__/openaiCompatForwarder.test.ts src/proxy/__tests__/openaiCompatLocalProxy.test.ts src/proxy/__tests__/openaiCompatUpstream.test.ts src/proxy/__tests__/claudeCliUpstream.test.ts src/proxy/__tests__/startServerSharedState.test.ts"
run bash bin/check_lint_zero src/repo/disk-headroom.sh src/session/resource_admission.py src/lib/infrastructure.sh src/session/infrastructure_ensure.sh tests/repo/test-disk-headroom.sh tests/session/test_resource_admission.py tests/lib/test-infrastructure.sh tests/session/test-infrastructure-ensure.sh
run bash bin/check_package_typecheck --strict provider
run python3 src/verify/check_env_example_coverage.py
echo "suites-fallidas=$failed"
exit "$failed"
