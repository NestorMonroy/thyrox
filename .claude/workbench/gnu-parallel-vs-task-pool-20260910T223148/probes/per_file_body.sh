#!/usr/bin/env bash
# Aisla el CUERPO del bucle por archivo del gate de sucesor: un awk + un grep
# por archivo. Es la forma que `find … | parallel` y `xargs -P` atacan.
f="$1"
awk '{ l[NR]=$0 } END { for (i=1;i<=NR;i++) if (l[i] ~ /no cierra|queda abierto|queda pendiente/) { print "ABIERTO"; exit } }' "$f" \
  | grep -q ABIERTO && echo "$f"
exit 0
