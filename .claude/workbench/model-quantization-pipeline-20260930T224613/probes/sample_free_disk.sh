#!/usr/bin/env bash
# Muestrea el espacio libre del sistema de archivos de una ruta, una vez por
# segundo, hasta que aparezca el archivo de parada. Cada línea:
# <epoch> <bytes libres>. El mínimo de la columna 2 es el pico de uso.
set -u
path="${1:?ruta a medir}"
out="${2:?archivo de salida}"
stop="${3:?archivo de parada}"
while [ ! -e "$stop" ]; do
  printf '%s %s\n' "$(date +%s)" "$(df -B1 --output=avail "$path" | tail -1 | tr -d ' ')" >> "$out"
  sleep 1
done
