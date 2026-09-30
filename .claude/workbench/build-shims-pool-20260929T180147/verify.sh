#!/usr/bin/env bash
# Verifica el ítem de shims: la prueba del expansor y el build de los cuatro paquetes.
set -uo pipefail
fail() { echo "VERIFY FAIL: $*" >&2; exit 1; }
changed="$( { git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u)"
[ -n "$changed" ] || fail "sin cambios"
echo "$changed" | grep -qE '^(\.claude|_references|agent-results)/' && fail "toca .claude, _references o agent-results"
echo "$changed" | grep -qE '^src/(agents|packages/tools|packages/daemon)/' && fail "toca un área del otro pool"
echo "$changed" | grep -q '^\.env\.example$' && fail "toca .env.example"
timeout 300 bun test tests/verify/expandStarShims.test.ts > /tmp/verify-shims.log 2>&1 || { tail -20 /tmp/verify-shims.log >&2; fail "expandStarShims.test"; }
tail -2 /tmp/verify-shims.log
timeout 1200 bash bin/typescript-build-javascript agent cli permission provider > /tmp/verify-build.log 2>&1 || { tail -30 /tmp/verify-build.log >&2; fail "build JS"; }
tail -3 /tmp/verify-build.log
echo "VERIFY OK"
