#!/usr/bin/env bash
# Línea base de tsc en el worktree de medición recién sincronizado, con el
# reflejo de alcances de node_modules corregido (177d9517).
set -u
MAIN=/home/user/thyrox
WT=/home/user/thyrox-medicion
OUT="$(realpath -m "$MAIN/$1")"
python3 "$MAIN/src/verify/measure_worktree.py" prepare "$MAIN" "$WT"
ls "$WT/node_modules/@types" | wc -l > "$OUT/types-count.txt"
cd "$WT" && bunx tsc --noEmit -p tsconfig.json --pretty false > "$OUT/base.log" 2>&1
echo "__MEASURE_DONE__"
