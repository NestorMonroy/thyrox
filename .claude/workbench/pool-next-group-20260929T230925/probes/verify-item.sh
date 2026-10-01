#!/usr/bin/env bash
# Verify de un ítem del pool: ejecuta cada prueba que el ítem tocó según su forma
# (Python como guion, shell con bash, TypeScript con bun test desde su paquete).
# Sale 1 si el ítem no tocó ninguna prueba o si alguna falla.
set -uo pipefail
mapfile -t changed < <(git status --porcelain -uall | gawk '{print $2}')
ran=0; rc=0
for path in "${changed[@]}"; do
  case "$path" in
    tests/*.py)
      ran=1; PYTHONDONTWRITEBYTECODE=1 python3 "$path" || rc=1 ;;
    tests/*.sh)
      ran=1; bash "$path" || rc=1 ;;
    src/packages/*.test.ts)
      ran=1; package_root=$(printf '%s\n' "$path" | gawk -F/ '{print $1"/"$2"/"$3}')
      (cd "$package_root" && bun test "${path#"$package_root"/}") || rc=1 ;;
  esac
done
test "$ran" = 1 || { echo "verify: el ítem no tocó ninguna prueba" >&2; exit 1; }
exit "$rc"
