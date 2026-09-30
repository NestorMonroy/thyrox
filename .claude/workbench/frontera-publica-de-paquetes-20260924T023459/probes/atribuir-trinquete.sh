#!/usr/bin/env bash
# Atribuye el crecimiento del trinquete de tsc del paquete cli: errores en el
# estado de src/packages de 74de33b1 contra los de HEAD, por archivo+código+mensaje.
set -u
ROOT=/home/user/thyrox; OUT="$1"; BASE="${2:-74de33b1}"
cd "$ROOT" || exit 2
git diff --binary "$BASE" HEAD -- src/packages > "$OUT/revertir.patch"
norm() { gawk '/error TS/{ l=$0; sub(/\([0-9]+,[0-9]+\)/,"",l); print l }' | sort; }
git apply -R "$OUT/revertir.patch" || exit 3
(cd src/packages/cli && bunx tsc --noEmit -p tsconfig.json 2>&1) | norm > "$OUT/base.txt"
git apply "$OUT/revertir.patch" || { echo "NO SE PUDO RESTAURAR"; exit 4; }
(cd src/packages/cli && bunx tsc --noEmit -p tsconfig.json 2>&1) | norm > "$OUT/head.txt"
wc -l "$OUT/base.txt" "$OUT/head.txt"
echo "--- nuevos en HEAD"; comm -13 "$OUT/base.txt" "$OUT/head.txt"
echo "--- desaparecidos en HEAD"; comm -23 "$OUT/base.txt" "$OUT/head.txt"
git diff --quiet 74de33b1 HEAD -- src/packages/cli && echo "sin diff en cli"
