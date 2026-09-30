#!/usr/bin/env bash
# Verifica el ítem por los archivos que cambió: cada ítem toca su propia zona.
set -uo pipefail
fail() { echo "VERIFY FAIL: $*" >&2; exit 1; }
changed="$( { git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u)"
[ -n "$changed" ] || fail "sin cambios"
echo "$changed" | grep -qE '^(\.claude|_references|agent-results)/' && fail "toca .claude, _references o agent-results"
ran=0
if echo "$changed" | grep -q '^src/lib/toolchain.sh$'; then
  ran=1; timeout 600 bash tests/lib/test-toolchain-pgvector.sh || fail "test-toolchain-pgvector"
fi
if echo "$changed" | grep -q '^src/packages/store/'; then
  ran=1; (cd src/packages/store && timeout 600 bun test 2>&1 | tail -5 | tee /dev/stderr | grep -qE '^ 0 fail') || fail "store"
fi
if echo "$changed" | grep -q '^src/hooks/detect_library_path_invocation.py$'; then
  ran=1
  timeout 300 uv run --quiet python tests/hooks/test_detect_library_path_invocation.py || fail "detector nuevo"
  timeout 300 uv run --quiet python tests/hooks/test_detect_rst_validation.py || fail "detect_rst_validation"
  grep -q detect_library_path_invocation src/hooks/tool_use_preflight.py || fail "detector sin cablear"
fi
[ "$ran" = 1 ] || fail "ningún área conocida cambió: $changed"
echo "VERIFY OK"
