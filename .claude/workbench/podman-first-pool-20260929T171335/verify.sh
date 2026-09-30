#!/usr/bin/env bash
# Verifica el ítem por los archivos que cambió: cada ítem toca su propia zona.
set -uo pipefail
fail() { echo "VERIFY FAIL: $*" >&2; exit 1; }
changed="$( { git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u)"
[ -n "$changed" ] || fail "sin cambios"
echo "$changed" | grep -qE '^(\.claude|_references|agent-results)/' && fail "toca .claude, _references o agent-results"
ran=0
if echo "$changed" | grep -q '^src/lib/infrastructure.sh$'; then
  ran=1
  timeout 300 bash tests/lib/test-infrastructure.sh | tail -1 || fail "test-infrastructure"
fi
if echo "$changed" | grep -q '^src/lib/toolchain.sh$'; then
  ran=1
  for t in tests/lib/test-toolchain-*.sh; do
    timeout 300 bash "$t" >/dev/null 2>&1 || fail "$t"
  done
  echo "toolchain suites: $(ls tests/lib/test-toolchain-*.sh | wc -l) ok"
  n="$(grep -cE '_INSTALL_CMD:-sudo ' src/lib/toolchain.sh)"; [ "$n" = 0 ] || fail "quedan $n defaults con sudo literal"
fi
if echo "$changed" | grep -q '^tests/verify/test_rst_gate_interpreter.py$'; then
  ran=1
  timeout 600 uv run --quiet python tests/verify/test_rst_gate_interpreter.py | tail -1 || fail "rst interpreter"
fi
echo "$changed" | grep -q '^\.env\.example$' && fail "toca .env.example: las variables se listan en el informe"
[ "$ran" = 1 ] || fail "ningún área conocida cambió: $changed"
echo "VERIFY OK"
