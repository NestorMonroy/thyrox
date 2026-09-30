#!/usr/bin/env bash
# Verifica el ítem R-2d en su worktree (cwd = worktree).
set -euo pipefail
fail() { echo "VERIFY FAIL: $*" >&2; exit 1; }
git diff --name-only HEAD -- .claude | grep -q . && fail "toca .claude"
git diff --name-only HEAD | grep 'package.json$' | grep -v '^src/packages/app-host/package.json$' && fail "toca otro package.json"
F=src/packages/cli/src/headless/sdk/session/run-streaming.ts
grep -q "onRefusalFallbackRestored" "$F" || fail "sin suscripción b8r en run-streaming.ts"
grep -qE "activeUserSpecifiedModel = undefined" "$F" || fail "el callback no limpia activeUserSpecifiedModel"
grep -q '"./state/refusalFallbackRestore.js"' src/packages/app-host/package.json || fail "sin export"
T=$(git ls-files --others --exclude-standard; git diff --name-only HEAD) 
echo "$T" | grep -q '__tests__/.*\.test\.ts$' || fail "sin prueba nueva o modificada"
bun test src/packages/cli/src/headless/sdk/session/__tests__ src/packages/app-host/src/runtime/__tests__ src/packages/app-host/src/state/__tests__ 2>&1 | tail -5 | tee /dev/stderr | grep -qE '^ 0 fail' || fail "pruebas en rojo"
echo "VERIFY OK"
