#!/usr/bin/env bash
# Verify del ítem de TASK-THYROX-0735: las pruebas son el contrato.
set -uo pipefail
mapfile -t changed < <(git status --porcelain -uall | gawk '{print $2}')
rc=0; touched=0
for path in "${changed[@]}"; do
  case "$path" in
    tests/*) echo "verify: el ítem tocó una prueba: $path" >&2; exit 1 ;;
    src/lib/infrastructure.sh|src/session/infrastructure_ensure.sh) touched=1 ;;
  esac
done
test "$touched" -eq 1 || { echo "verify: el ítem no tocó ningún archivo de implementación" >&2; exit 1; }
bash tests/lib/test-infrastructure.sh || rc=1
bash tests/session/test-infrastructure-ensure.sh || rc=1
exit "$rc"
