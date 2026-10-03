#!/usr/bin/env bash
# Pruebas derivadas tras integrar el pool 1: cada suite con su propio código de salida.
set -uo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
rc=0
for package in model-artifacts local-models artifact-registry podman-execution; do
  (cd "src/packages/$package" && bun test >"/dev/null" 2>"$OLDPWD/.thyrox/runtime/verify-$package.log")
  code=$?; echo "suite $package exit=$code $(grep -E '^ +[0-9]+ (pass|fail)$' .thyrox/runtime/verify-$package.log | tr -s ' ' | tr '\n' ' ')"
  [ "$code" = 0 ] || rc=1
done
PYTHONDONTWRITEBYTECODE=1 python3 tests/paths/test_ensure_homes.py >.thyrox/runtime/verify-homes.log 2>&1; code=$?
echo "suite test_ensure_homes exit=$code $(tail -1 .thyrox/runtime/verify-homes.log)"; [ "$code" = 0 ] || rc=1
bash bin/check_package_typecheck --strict model-artifacts local-models artifact-registry podman-execution 2>&1 | tail -1; [ "${PIPESTATUS[0]}" = 0 ] || rc=1
echo "verify_integrated exit=$rc"
exit "$rc"
