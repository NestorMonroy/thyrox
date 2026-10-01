#!/usr/bin/env bash
# Verifica el ítem por los archivos que cambió: cada ítem crea su propio módulo.
set -uo pipefail
fail() { echo "VERIFY FAIL: $*" >&2; exit 1; }
changed="$( { git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u)"
[ -n "$changed" ] || fail "sin cambios"
echo "$changed" | grep -qE '^(\.claude|_references|agent-results)/' && fail "toca .claude, _references o agent-results"
pkg=src/packages/local-observability
ran=0
for mod in peerRefTable listAgentsFormat; do
  if echo "$changed" | grep -q "^$pkg/src/uds/$mod.ts$"; then
    ran=1
    (cd "$pkg" && timeout 600 bun test "src/uds/__tests__/$mod.test.ts" 2>&1 | tail -5 | tee /dev/stderr | grep -qE '^ 0 fail') || fail "$mod"
    (cd "$pkg" && timeout 600 bunx tsc --noEmit -p tsconfig.test.json 2>&1 | grep -E "src/uds/$mod" | tee /dev/stderr | grep -q . ) && fail "tsc en $mod"
  fi
done
[ "$ran" = 1 ] || fail "ningún módulo conocido cambió: $changed"
echo "VERIFY OK"
