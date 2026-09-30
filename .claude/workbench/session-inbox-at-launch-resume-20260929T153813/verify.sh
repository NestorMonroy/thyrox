#!/usr/bin/env bash
set -euo pipefail
fail() { echo "VERIFY FAIL: $*" >&2; exit 1; }
git diff --name-only HEAD -- .claude _references agent-results | grep -q . && fail "toca .claude, _references o agent-results"
U=src/packages/local-observability/src/uds/udsMessaging.ts
grep -q "getUdsMessagingSocketPath" "$U" || fail "falta getUdsMessagingSocketPath"
grep -q "setOnEnqueue" "$U" || fail "falta setOnEnqueue"
rg -q "startUdsMessaging|startMessagingInbox" src/packages/app-host/src/runtime/ || fail "bin/cli no arranca el buzón"
T=$( { git ls-files --others --exclude-standard; git diff --name-only HEAD; } | grep -E '__tests__/.*\.test\.ts$' | sort -u)
[ -n "$T" ] || fail "sin prueba"
echo "$T" | xargs grep -l "messagingSocketPath" >/dev/null || fail "ninguna prueba mira messagingSocketPath"
bun test $T src/packages/local-observability/__tests__ src/packages/cli/__tests__/sessionRegistryAtLaunch.e2e.test.ts src/packages/cli/__tests__/sessionRenameCommand.e2e.test.ts 2>&1 | tail -5 | tee /dev/stderr | grep -qE '^ 0 fail' || fail "pruebas en rojo"
echo "VERIFY OK"
