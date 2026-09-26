#!/usr/bin/env bash
# Conteo de errores del paquete cli en HEAD y con el lote aplicado.
set -u
cd "$(dirname "$0")/../.."
count() { (cd src/packages/cli && for p in tsconfig.json tsconfig.tests.json; do printf '%s %s\n' "$p" "$(bunx tsc --noEmit -p "$p" </dev/null 2>&1 | grep -c 'error TS')"; done); }
xargs -a .claude/cache/uiv3-cli.txt git checkout HEAD --
echo "== HEAD"; count
cp -r .claude/cache/cli4/src/. src/
echo "== lote"; count
git status --short src/packages/cli
