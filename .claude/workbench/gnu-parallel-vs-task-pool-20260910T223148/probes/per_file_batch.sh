#!/usr/bin/env bash
# Variante del cuerpo por archivo que acepta N argumentos, para que -X de
# parallel y el xargs por lotes midan el MISMO trabajo que la version de un
# argumento. Sin esto, -X procesa solo el primero de cada lote y su reloj mide
# el 0.7% de la poblacion.
for f in "$@"; do
  awk '{ l[NR]=$0 } END { for (i=1;i<=NR;i++) if (l[i] ~ /no cierra|queda abierto|queda pendiente/) { print "ABIERTO"; exit } }' "$f" \
    | grep -q ABIERTO && echo "$f"
done
exit 0
