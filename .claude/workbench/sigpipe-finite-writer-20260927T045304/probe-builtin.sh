#!/usr/bin/env bash
# ¿El builtin printf/echo invierte `grep -q` según el tamaño? 20 ejecuciones
# por tamaño, marca al principio, bajo pipefail; V se construye en el mismo
# shell que canaliza (sin exportar).
set -uo pipefail
for lines in 1000 10000 20000 40000 100000; do
  for w in printf echo; do
    n=0
    for _ in $(seq 20); do
      bash -c "set -o pipefail; V=\$(gawk 'BEGIN{print \"MARK\"; for(i=0;i<$lines;i++) print \"xxxxxxxxxx\"}');
               if [ $w = printf ]; then printf '%s\n' \"\$V\" | grep -q MARK; else echo \"\$V\" | grep -q MARK; fi" || n=$((n+1))
    done
    printf '%-7s %7d líneas (%4d KB)  %2d/20\n' "$w" "$lines" $(( (lines*11+5)/1024 )) "$n"
  done
done
