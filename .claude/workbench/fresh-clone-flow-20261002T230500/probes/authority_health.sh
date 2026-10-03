#!/usr/bin/env bash
# Current health de las autoridades de la matriz Search Existing: corre la
# suite de cada una y deja su log en <salida>/health-<nombre>.log. Sólo lee el
# árbol; las suites escriben en su propio TMPDIR.
# Uso: authority_health.sh <salida>
set -uo pipefail
ROOT="${THYROX_ROOT:-/home/user/thyrox}" O="$1"
mkdir -p "$O"
cd "$ROOT" || exit 2
export THYROX_ROOT="$ROOT" PYTHONPATH="$ROOT/src${PYTHONPATH:+:$PYTHONPATH}"
TMPDIR="$(mktemp -d)"; export TMPDIR
PY="$ROOT/.venv/bin/python"
SUITES=(
  tests/verify/test_commit_identity.py
  tests/verify/test_pre_commit_hook.py
  tests/verify/test-githooks-activos.sh
  tests/verify/test-toolchain-ready.sh
  tests/lib/test-toolchain-gawk.sh
  tests/install/test_install.sh
  tests/session/test_write_env.py
  tests/verify/test_env_contract_keys.py
  tests/paths/test_ensure_homes.py
  tests/session/test-arranque-de-clon.sh
  tests/session/test_reconcile_user_hooks.py
  tests/session/test-session-start.sh
  tests/session/test_generate_bin.py
  tests/verify/test_identifier_language.py
  tests/githooks/test-pre-commit-identifier-language.sh
  src/packages/coordination/__tests__/branchIntegration.test.ts
)
for t in "${SUITES[@]}"; do
  n="$(basename "$t")"; n="${n%%.*}"
  case "$t" in
    *.ts) (cd "$(dirname "$(dirname "$t")")" && timeout 600 bun test "__tests__/$(basename "$t")") ;;
    *.sh) timeout 600 bash "$t" ;;
    *.py) if grep -qE '^def test_' "$t"; then timeout 600 "$PY" -m pytest -q "$t"; else timeout 600 "$PY" "$t"; fi ;;
  esac > "$O/health-$n.log" 2>&1
  rc=$?
  printf '%s\trc=%s\t%s\n' "$t" "$rc" "$(tail -3 "$O/health-$n.log" | grep -E '[0-9]+ (ok|pass|passed|fail|failed|aserciones|casos)' | tail -1)"
done
rm -rf -- "${TMPDIR:?}"
