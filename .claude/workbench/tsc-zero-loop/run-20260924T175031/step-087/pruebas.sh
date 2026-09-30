#!/usr/bin/env bash
# Cada prueba derivada, una por proceso, con la copia y con HEAD: regresión es
# la que pasa en HEAD y falla con la copia.
set -uo pipefail
S=$1; F=src/packages/config/settings/types.ts
test -s "$S/pruebas-derivadas.txt" || { echo "pruebas: sin lista derivada — no se mide (un 0 aquí sería un verde falso)" >&2; exit 2; }
: > $S/pruebas-con-copia.txt; : > $S/pruebas-head.txt
while read t; do bun test "$t" > /dev/null 2>&1; echo "$? $t" >> $S/pruebas-con-copia.txt; done < $S/pruebas-derivadas.txt
cp $F $S/types.copia.ts; git show HEAD:$F > $F
while read t; do bun test "$t" > /dev/null 2>&1; echo "$? $t" >> $S/pruebas-head.txt; done < $S/pruebas-derivadas.txt
cp $S/types.copia.ts $F; rm $S/types.copia.ts
join -j2 <(sort -k2 $S/pruebas-con-copia.txt) <(sort -k2 $S/pruebas-head.txt) | gawk '$2!=0 && $3==0 {print $1}' > $S/regresiones.txt
echo "pruebas: $(wc -l < $S/pruebas-derivadas.txt) · fallan con copia: $(gawk '$1!=0' $S/pruebas-con-copia.txt | wc -l) · regresiones: $(wc -l < $S/regresiones.txt)"
