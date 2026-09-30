#!/usr/bin/env bash
# Pruebas derivadas del árbol integrado: las de cada ítem y el typecheck de los paquetes TS tocados.
set -uo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)" || exit 2
export PYTHONDONTWRITEBYTECODE=1
rc=0
python3 tests/session/test_snapshot_recovery.py || rc=1
bash tests/agents/test-agent-store-fecha-documento.sh || rc=1
(cd src/packages/finding && bun test __tests__/finding.test.ts) || rc=1
(cd src/packages/provider && bun test src/proxy/__tests__/connectionRefresh.test.ts src/proxy/__tests__/startServerSharedState.test.ts) || rc=1
bash bin/check_package_typecheck --strict provider finding || rc=1
echo "DERIVED_EXIT=$rc"; exit "$rc"
