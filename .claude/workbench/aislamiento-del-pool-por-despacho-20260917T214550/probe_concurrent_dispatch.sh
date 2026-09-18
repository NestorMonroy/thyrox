#!/bin/bash
# Sonda: dos pools que arrancan en el MISMO segundo comparten nombre de
# despacho, porque la marca temporal tiene granularidad de segundo y la guarda
# de colision es comprobar-luego-crear (TOCTOU). Se repite N veces y se publica
# cuantas veces los dos despachos colisionaron.
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1
POOL=src/session/run-task-pool.sh
collisions=0
for i in $(seq 1 "${1:-5}"); do
    T=$(mktemp -d)
    printf 'sleep 3\n' > "$T/a.txt"; printf 'sleep 3\n' > "$T/b.txt"
    THYROX_JOBS_DIR="$T/led" BG_DIR="$T/logs" bash "$POOL" --prefix cifras "$T/a.txt" >/dev/null 2>&1 &
    pa=$!
    THYROX_JOBS_DIR="$T/led" BG_DIR="$T/logs" bash "$POOL" --prefix cifras "$T/b.txt" >/dev/null 2>&1 &
    pb=$!
    sleep 1
    dirs=$(ls "$T/logs" 2>/dev/null | wc -l)
    jobs_n=$(ls "$T/led" 2>/dev/null | wc -l)
    echo "vuelta $i: directorios=$dirs trabajos_en_ledger=$jobs_n  [$(ls "$T/logs" 2>/dev/null | tr '\n' ' ')]"
    [ "$dirs" -lt 2 ] && collisions=$((collisions+1))
    wait "$pa" "$pb" 2>/dev/null
    rm -rf "$T"
done
echo "colisiones de nombre de despacho: $collisions de ${1:-5}"
