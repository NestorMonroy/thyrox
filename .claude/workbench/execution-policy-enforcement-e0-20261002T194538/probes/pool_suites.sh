#!/usr/bin/env bash
# Corre cada suite de headless-pool del worktree (<dir>) con su propio código
# de salida; el log de cada una queda en <salida>.
# Uso: pool_suites.sh <worktree> <salida>
mkdir -p "$2" && cd "$1" || exit 2
rc=0
for suite in tests/session/test-headless-pool*.sh; do
  timeout 900 bash "$suite" > "$2/$(basename "$suite").log" 2>&1; code=$?
  printf '%s\texit=%s\t%s\n' "$suite" "$code" "$(tail -1 "$2/$(basename "$suite").log")"
  [ "$code" -eq 0 ] || rc=1
done
exit $rc
