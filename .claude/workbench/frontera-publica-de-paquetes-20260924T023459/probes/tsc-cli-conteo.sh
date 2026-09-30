#!/usr/bin/env bash
# Conteo de errores de tsc del proyecto cli sobre el árbol de trabajo, normalizado
# por archivo+código+mensaje, y su diferencia con base.txt (74de33b1).
set -u
OUT="$1"; ETQ="${2:-arbol}"
cd /home/user/thyrox/src/packages/cli || exit 2
bunx tsc --noEmit -p tsconfig.json 2>&1 | gawk '/error TS/{l=$0; sub(/\([0-9]+,[0-9]+\)/,"",l); print l}' | sort > "$OUT/$ETQ.txt"
wc -l < "$OUT/$ETQ.txt"
echo "--- nuevos contra base"; comm -13 "$OUT/base.txt" "$OUT/$ETQ.txt"
