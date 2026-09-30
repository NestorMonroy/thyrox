#!/usr/bin/env bash
# Verifica el ítem #335: sondas de Podman y contrato del perfil repository/job.
set -uo pipefail
fail() { echo "VERIFY FAIL: $*" >&2; exit 1; }
changed="$( { git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u)"
[ -n "$changed" ] || fail "sin cambios"
echo "$changed" | grep -qE '^(\.claude|_references|agent-results)/' && fail "toca .claude, _references o agent-results"
echo "$changed" | grep -q '^\.env\.example$' && fail "toca .env.example"
echo "$changed" | grep -qE '^src/(agents|packages/(observability|task|tools|agent))/' && fail "toca un área del pool A4"
log="$(mktemp)"
timeout 900 bash tests/lib/test-podman-capabilities.sh > "$log" 2>&1 || { tail -30 "$log" >&2; fail "test-podman-capabilities"; }
tail -1 "$log"
( cd src/packages/daemon && timeout 900 bun test ) > "$log" 2>&1 || { tail -30 "$log" >&2; fail "bun test daemon"; }
grep -E '^ *[0-9]+ (pass|fail)' "$log"
echo "VERIFY OK"
