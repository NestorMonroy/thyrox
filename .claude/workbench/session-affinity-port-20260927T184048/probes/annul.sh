#!/usr/bin/env bash
# Control de anulación: aplica un reemplazo literal a un archivo, corre la
# prueba, lista los casos que caen y restaura el original.
# Uso: annul.sh <nombre> <archivo> <old-file> <new-file> <prueba>
set -euo pipefail
name=$1 file=$2 old=$3 new=$4 test=$5
out=${ANNUL_OUT:?}
backup="$out/$name.orig"
cp -- "$file" "$backup"
trap 'cp -- "$backup" "$file"; rm -f -- "${backup:?}"' EXIT
bash /home/user/thyrox/bin/replace_literal --old-file "$old" --new-file "$new" "$file"
bun test "$test" 2>&1 | grep -E '^\(fail\)| pass$| fail$' > "$out/$name.log" || true
