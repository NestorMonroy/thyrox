#!/usr/bin/env bash
# Verify del grupo 7: además, un ítem sin portes se acepta por su tabla de veredictos.
# Verify de un ítem del pool: ejecuta cada prueba que el ítem tocó según su forma
# y los mismos linters que el pre-commit sobre sus archivos. Sale 1 si el ítem no
# tocó ninguna prueba, si alguna falla o si un linter reporta un hallazgo propio.
set -uo pipefail
mapfile -t changed < <(git status --porcelain -uall | gawk '{print $2}')
ran=0; rc=0; lintable=(); packages=()
for path in "${changed[@]}"; do
  case "$path" in
    *.py|*.sh) lintable+=("$path") ;;
  esac
  case "$path" in
    src/packages/*) packages+=("$(printf '%s\n' "$path" | gawk -F/ '{print $3}')") ;;
  esac
  case "$path" in
    tests/*.py)
      ran=1; PYTHONDONTWRITEBYTECODE=1 python3 "$path" || rc=1 ;;
    tests/*.sh)
      ran=1; bash "$path" || rc=1 ;;
    src/packages/*.test.ts)
      ran=1; package_root=$(printf '%s\n' "$path" | gawk -F/ '{print $1"/"$2"/"$3}')
      (cd "$package_root" && bun test "${path#"$package_root"/}") || rc=1 ;;
    src/verify/__tests__/*.test.ts)
      ran=1; bun test "$path" || rc=1 ;;
  esac
done
# Un ítem cuyas apariciones son todas fieles o desconocidas no porta nada, así
# que no tiene prueba que tocar: basta su tabla de veredictos, sin filas «portada».
verdicts=$(printf '%s\n' "${changed[@]}" | gawk '/\/verdicts\/[^/]+\.tsv$/')
if test "$ran" = 0 && test -n "$verdicts" && ! gawk -F'\t' '$3 == "portada" { found = 1 } END { exit !found }' $verdicts; then
  ran=1
fi
test "$ran" = 1 || { echo "verify: el ítem no tocó ninguna prueba ni dejó tabla de veredictos sin portes" >&2; exit 1; }
if test "${#lintable[@]}" -gt 0; then bash bin/check_lint_zero "${lintable[@]}" || rc=1; fi
if test "${#packages[@]}" -gt 0; then
  mapfile -t unique_packages < <(printf '%s\n' "${packages[@]}" | sort -u)
  bash bin/check_package_typecheck --strict "${unique_packages[@]}" || rc=1
fi
exit "$rc"
