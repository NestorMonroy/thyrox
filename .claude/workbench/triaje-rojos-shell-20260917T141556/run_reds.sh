#!/bin/bash
# Corre las 17 suites de shell en rojo y captura exit + cola de cada una.
cd "$(dirname "$0")/../../.." || exit 1
W=".claude/workbench/triaje-rojos-shell-20260917T141556"
OUT="$W/salidas"
mkdir -p "$OUT"
while IFS= read -r suite; do
    name="$(echo "$suite" | tr '/' '_')"
    timeout 300 bash "$suite" > "$OUT/$name.log" 2>&1
    echo "EXIT=$? $suite" >> "$W/veredictos.txt"
done < "$W/suites.txt"
echo "TERMINADO"
