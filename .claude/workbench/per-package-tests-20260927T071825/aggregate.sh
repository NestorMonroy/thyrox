#!/usr/bin/env bash
# Tabla por paquete y codigo global: 2 si algun paquete no tiene __tests__
# (violacion estructural, prioridad), 1 si alguno falla, 0 si todos pasan.
set -uo pipefail
dir="$1"
missing=0; failed=0
printf '| paquete | __tests__ | comando (desde la raiz de thyrox) | exit | pruebas | estado |\n|---|---|---|---|---|---|\n'
for f in "$dir"/results/*.tsv; do
  IFS=$'\t' read -r pkg tests cmd code ran state < "$f"
  case "$state" in FAIL\(sin*) missing=1 ;; FAIL) failed=1 ;; esac
  if [ "$tests" = "-" ]; then shown="(no se ejecuta)"; else shown="\`bun test ${tests//,/ }\`"; fi
  printf '| `%s` | %s | %s | %s | %s | %s |\n' "$pkg" "${tests//,/<br>}" "$shown" "$code" "$ran" "$state"
done
global=0; [ "$failed" -eq 1 ] && global=1; [ "$missing" -eq 1 ] && global=2
echo; echo "codigo global: $global"
exit "$global"
