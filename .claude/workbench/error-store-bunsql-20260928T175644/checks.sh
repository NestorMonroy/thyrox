#!/usr/bin/env bash
# Verificaciones del store sobre Bun.SQL, del instalador de pgvector y del TS2742.
set -u
B="$(cd "$(dirname "$0")" && pwd)"; cd "$B/../../.."
bash bin/emit_declarations local-observability > "$B/emit.txt" 2>&1
{ for p in local-observability repl app-host; do for c in build test; do
    echo "== $p $c"; (cd src/packages/$p && bunx tsc -p tsconfig.$c.json --noEmit 2>&1); done; done; } > "$B/typecheck.txt"
(cd src/packages/local-observability && bun test 2>&1) > "$B/package-suite.txt"
(cd src/packages/local-observability && THYROX_TEST_POSTGRES_URL=postgres://thyrox_test:thyrox_test@127.0.0.1:5432/thyrox_test bun test __tests__/errorStore.postgres.test.ts 2>&1) > "$B/postgres-contract.txt"
(cd src/packages/repl && bun test src/__tests__/errorBoundary.test.ts 2>&1) > "$B/repl-boundary.txt"
(cd src/packages/app-host && bun test src/bootstrap/__tests__/gracefulShutdown.behavior.test.ts src/bootstrap/__tests__/gracefulShutdown.test.ts 2>&1) > "$B/shutdown.txt"
bash tests/lib/test-toolchain-pgvector.sh > "$B/toolchain-pgvector.txt" 2>&1
python3 bin/check_env_contract_keys > "$B/env-contract.txt" 2>&1 || bash bin/check_env_contract_keys > "$B/env-contract.txt" 2>&1
bun src/verify/checkEnvPrefix.ts > "$B/env-prefix.txt" 2>&1
echo done
