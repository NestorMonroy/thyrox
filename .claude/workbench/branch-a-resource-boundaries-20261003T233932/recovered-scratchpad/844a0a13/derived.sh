#!/usr/bin/env bash
# Corre la suite derivada del cambio de transporte de contexto, una línea por archivo.
cd /home/user/thyrox
run() { local out; out="$("$@" 2>&1)"; local rc=$?; printf '%s rc=%s %s\n' "$*" "$rc" "$(printf '%s' "$out" | gawk '/ok ·|falla|passed|failed|[0-9]+ pass$|[0-9]+ fail$|^OK|^FAILED|Ran [0-9]/' | tail -3 | tr '\n' ' ')"; }
export -f run
gawk '/\.sh$/ && !/test_homes|merge-sqlite/' "$1" | parallel -j4 -k run bash {}
gawk '/\.py$/' "$1" | parallel -j4 -k run uv run --quiet pytest -q {}
(cd src/packages/provider && run bun test src/proxy/__tests__ __tests__/localProxyProcess.test.ts __tests__/credentials.test.ts __tests__/provider.test.ts src/__tests__/credentialProxy.test.ts)
(cd src/packages/podman-execution && run bun test __tests__)
(cd src/packages/cli && run bun test __tests__/printDelegation.test.ts __tests__/print.test.ts)
run bash -c 'cd src/packages/provider && bunx tsc --noEmit -p . | tail -3'
run bash -c 'cd src/packages/cli && bunx tsc --noEmit -p . | tail -3'
run uv run --quiet shellcheck src/session/headless-pool.sh tests/session/test-headless-pool-execution-unit.sh
