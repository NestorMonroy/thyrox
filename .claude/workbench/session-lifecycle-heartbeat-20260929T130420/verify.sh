#!/usr/bin/env bash
set -euo pipefail
fail() { echo "VERIFY FAIL: $*" >&2; exit 1; }
git diff --name-only HEAD -- .claude _references | grep -q . && fail "toca .claude o _references"
M=src/packages/app-host/src/runtime/sessionRegistryAtLaunch.ts
grep -qE "touchHeartbeat|startHeartbeat" "$M" || fail "sin latido cableado"
grep -qE "sweepRegistry|sweepDeadPidKeys" "$M" || fail "sin barrido cableado"
T=$( { git ls-files --others --exclude-standard; git diff --name-only HEAD; } | grep -E '__tests__/.*\.test\.ts$' | sort -u)
[ -n "$T" ] || fail "sin prueba"
bun test $T src/packages/local-observability/__tests__ 2>&1 | tail -5 | tee /dev/stderr | grep -qE '^ 0 fail' || fail "pruebas en rojo"
echo "VERIFY OK"
