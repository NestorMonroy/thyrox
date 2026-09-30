#!/usr/bin/env bash
# Verifica el ítem por los archivos que cambió: cada ítem toca su propia zona.
set -uo pipefail
fail() { echo "VERIFY FAIL: $*" >&2; exit 1; }
changed="$( { git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u)"
[ -n "$changed" ] || fail "sin cambios"
echo "$changed" | grep -qE '^(\.claude|_references|agent-results)/' && fail "toca .claude, _references o agent-results"
ran=0
if echo "$changed" | grep -qE '^src/hooks/'; then
  ran=1
  for t in tests/hooks/test_detect_library_path_invocation.py tests/hooks/test_detect_rst_validation.py tests/hooks/test_tool_use_preflight.py; do
    timeout 300 uv run --quiet python "$t" | tail -1 || fail "$t"
  done
  [ -f tests/hooks/test_shell_text.py ] && { timeout 300 uv run --quiet python tests/hooks/test_shell_text.py | tail -1 || fail "test_shell_text"; }
  for t in $(git grep -l 'shell_text' -- 'tests/hooks/*.py'); do
    timeout 300 uv run --quiet python "$t" >/dev/null || fail "hermano $t"
  done
fi
if echo "$changed" | grep -q '^src/verify/check_rst_sintaxis.py$'; then
  ran=1
  timeout 300 uv run --quiet python tests/verify/test_check_rst_sintaxis_args.py | tail -1 || fail "rst args"
  for t in tests/verify/test_rst_gate_interpreter.py tests/verify/test_rst_gate_root.py; do
    timeout 600 uv run --quiet python "$t" | tail -1 || fail "$t"
  done
  timeout 600 bash tests/verify/test-suite-discrimina.sh | tail -1 || fail "test-suite-discrimina"
fi
[ "$ran" = 1 ] || fail "ningún área conocida cambió: $changed"
echo "VERIFY OK"
