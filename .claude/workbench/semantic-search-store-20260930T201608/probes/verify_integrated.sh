#!/usr/bin/env bash
# Verifica en el árbol principal lo integrado de TASK-THYROX-0562, contra la base de pruebas.
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
# La URL de pruebas sale del .env (no versionado); sin ella no se mide nada.
THYROX_TEST_POSTGRES_URL="$(grep '^THYROX_TEST_POSTGRES_URL=' .env | cut -d= -f2-)"
[ -n "$THYROX_TEST_POSTGRES_URL" ] || { echo "sin THYROX_TEST_POSTGRES_URL: no se verifica"; exit 2; }
export THYROX_TEST_POSTGRES_URL
run bun install --frozen-lockfile
run bash -c "cd src/packages/semantic-search && bun test"
run bash bin/check_package_typecheck --strict semantic-search
run bash bin/check_identifier_language src/packages/semantic-search/config.ts src/packages/semantic-search/extension.ts src/packages/semantic-search/rerank.ts src/packages/semantic-search/store.ts src/packages/semantic-search/vectorSql.ts
run bash bin/check_product_word --strict
run python3 src/verify/check_env_example_coverage.py
echo "suites-fallidas=$failed"
exit "$failed"
