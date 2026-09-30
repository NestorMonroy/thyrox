#!/usr/bin/env bash
# Regresión de la ola 2 integrada: pruebas de daemon y de cli, un proceso por archivo, y typecheck de ambos paquetes.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
rc=0
git ls-files -co --exclude-standard -- 'src/packages/daemon/**/*.test.ts' 'src/packages/cli/**/*.test.ts' \
  | bash bin/run_ts_isolated || rc=1
for pkg in daemon cli; do
  (cd "src/packages/$pkg" && bunx tsc --noEmit -p tsconfig.test.json) > /dev/null 2>&1 \
    && echo "typecheck $pkg: 0 errores" || { echo "typecheck $pkg: con errores"; rc=1; }
done
exit "$rc"
