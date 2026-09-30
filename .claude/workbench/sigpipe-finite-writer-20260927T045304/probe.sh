#!/usr/bin/env bash
# Mide si un escritor FINITO que escribe más de una vez invierte `grep -q` bajo
# pipefail. Cada caso corre 20 veces; se cuenta cuántas el pipeline sale != 0
# habiendo una marca al PRINCIPIO de la entrada.
set -uo pipefail
count() {
  local n=0
  for _ in $(seq 20); do
    if ! bash -c "set -o pipefail; $1 | grep -q MARK"; then n=$((n+1)); fi
  done
  printf '%-58s %2d/20\n' "$2" "$n"
}
count "python3 -c 'print(\"MARK\"); print(\"x\"*1000)'"            "python3, 1 KB (un solo flush)"
count "python3 -c 'print(\"MARK\"); print(\"x\"*20000)'"           "python3, 20 KB (varios flush de 8 KB)"
count "python3 -c 'print(\"MARK\"); print(\"x\"*200000)'"          "python3, 200 KB"
count "gawk 'BEGIN{print \"MARK\"; for(i=0;i<2000;i++) print \"xxxxxxxxxx\"}'" "gawk, 22 KB"
count "gawk 'BEGIN{print \"MARK\"; for(i=0;i<20000;i++) print \"xxxxxxxxxx\"}'" "gawk, 220 KB"
count "printf 'MARK\n%.0s' ; head -c 200000 /dev/zero | tr '\\\\0' x"  "printf + head/tr, 200 KB (tr escribe tras la marca)"
V=$(python3 -c 'print("MARK"); print("x"*200000)')
export V
count "printf '%s\n' \"\$V\""                                     "printf builtin, 200 KB"
count "echo \"\$V\""                                              "echo builtin, 200 KB"
