#!/usr/bin/env bash
# Verifica en el árbol principal los dos módulos integrados de ListAgents.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)/src/packages/local-observability" || exit 2
rc=0
timeout 600 bun test src/uds/__tests__/peerRefTable.test.ts src/uds/__tests__/listAgentsFormat.test.ts 2>&1 | tail -6 || rc=1
echo "== tsc (tsconfig.test.json), errores en los módulos nuevos"
timeout 900 bunx tsc --noEmit -p tsconfig.test.json 2>&1 | tee /dev/stderr | gawk '/peerRefTable|listAgentsFormat/' | tee errs.tmp >/dev/null
n=$(wc -l < errs.tmp); rm -f errs.tmp; echo "errores tsc en módulos nuevos: $n"; [ "$n" = 0 ] || rc=1
echo "EXIT=$rc"
