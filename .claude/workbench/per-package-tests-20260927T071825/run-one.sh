#!/usr/bin/env bash
# Diagnostico de un paquete: sus carpetas __tests__ y un `bun test` propio.
# Se lanza desde la RAIZ de thyrox para que cargue el preload del bunfig raiz
# (TMPDIR y copia del store); desde la raiz del paquete no carga (medido).
set -uo pipefail
pkg_dir="$1"; out="$2"
name="$(basename "$pkg_dir")"
mapfile -d '' test_dirs < <(find "$pkg_dir" -path '*/node_modules' -prune -o -path '*/dist' -prune \
  -o -type d -name __tests__ -print0 | sort -z)
log="$out/$name.log"
if [ "${#test_dirs[@]}" -eq 0 ]; then
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$pkg_dir" "-" "-" "2" "-" "FAIL(sin __tests__)" > "$out/$name.tsv"
  exit 0
fi
cmd=(bun test "${test_dirs[@]}")
"${cmd[@]}" > "$log" 2>&1; code=$?
ran="$(grep -oE 'Ran [0-9]+ tests?' "$log" | tail -1 | grep -oE '[0-9]+' || true)"
state=PASS; [ "$code" -eq 0 ] || state=FAIL
printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$pkg_dir" "$(IFS=,; echo "${test_dirs[*]}")" "${cmd[*]}" "$code" "${ran:--}" "$state" > "$out/$name.tsv"
