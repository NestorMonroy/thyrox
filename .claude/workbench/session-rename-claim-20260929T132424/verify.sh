#!/usr/bin/env bash
set -euo pipefail
fail() { echo "VERIFY FAIL: $*" >&2; exit 1; }
git diff --name-only HEAD -- .claude _references | grep -q . && fail "toca .claude o _references"
grep -q "/rename" src/packages/cli/src/entry/runLoop.ts || fail "sin /rename en el chat"
T=$( { git ls-files --others --exclude-standard; git diff --name-only HEAD; } | grep -E '__tests__/.*\.test\.ts$' | sort -u)
[ -n "$T" ] || fail "sin prueba"
echo "$T" | xargs grep -l "/rename" >/dev/null || fail "ninguna prueba ejercita /rename"
bun test $T src/packages/local-observability/__tests__ src/packages/cli/__tests__/sessionRegistryAtLaunch.e2e.test.ts 2>&1 | tail -5 | tee /dev/stderr | grep -qE '^ 0 fail' || fail "pruebas en rojo"
echo "VERIFY OK"
