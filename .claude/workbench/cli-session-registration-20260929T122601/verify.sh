#!/usr/bin/env bash
# Verifica el ítem #252 en su worktree (cwd = worktree).
set -euo pipefail
fail() { echo "VERIFY FAIL: $*" >&2; exit 1; }
git diff --name-only HEAD -- .claude | grep -q . && fail "toca .claude"
grep -rqE "registerAtLaunch|sessionRegistryAtLaunch|registerSessionAtLaunch" src/packages/cli/src/entry/runLoop.ts || fail "runLoop no registra la sesión"
grep -rqE "registerAtLaunch|sessionRegistryAtLaunch|registerSessionAtLaunch" src/packages/cli/src/entry/print.ts || fail "runPrint no registra la sesión"
NEW=$( { git ls-files --others --exclude-standard; git diff --name-only HEAD; } | grep -E '(__tests__|tests)/.*\.test\.ts$' || true)
[ -n "$NEW" ] || fail "sin prueba nueva"
echo "$NEW" | xargs grep -lE "sessions|\.json" >/dev/null || fail "la prueba no mira el registro"
bun test $NEW src/packages/local-observability/__tests__/udsLaunchRegistration.test.ts src/packages/cli/__tests__/cliEntry.test.ts 2>&1 | tail -5 | tee /dev/stderr | grep -qE '^ 0 fail' || fail "pruebas en rojo"
echo "VERIFY OK"
