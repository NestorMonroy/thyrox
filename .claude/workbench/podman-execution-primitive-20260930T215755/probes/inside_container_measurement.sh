#!/usr/bin/env bash
# Mide si las herramientas del ciclo del pool (GNU Time, la lectura de RAM
# libre y el lock del ledger compartido) sirven DENTRO de un contenedor.
# Métrica: salida de cada herramienta dentro del contenedor contra el valor
# conocido. Ciega a: nvidia-smi (sin GPU aquí), rootless y cgroups v2.
set -uo pipefail
IMAGE="${PROBE_IMAGE:-docker.io/ollama/ollama:0.35.0}"
work=$(mktemp -d); trap 'rm -rf "${work:?}"' EXIT
echo "== 1. MemAvailable dentro de un contenedor con --memory 512m"
echo "anfitrion: $(grep MemAvailable /proc/meminfo)"
podman run --rm --memory 512m --entrypoint sh "$IMAGE" -c 'echo "contenedor: $(grep MemAvailable /proc/meminfo)"; echo "limite cgroup: $(cat /sys/fs/cgroup/memory/memory.limit_in_bytes 2>/dev/null || cat /sys/fs/cgroup/memory.max)"'
echo "== 2. flock entre anfitrion y contenedor sobre un archivo montado"
touch "$work/ledger.lock"
( flock -x 9; echo "anfitrion tiene el lock"; sleep 6 ) 9>"$work/ledger.lock" &
sleep 1
start=$(date +%s)
podman run --rm -v "$work:/ledger" --entrypoint sh "$IMAGE" -c 'flock -x /ledger/ledger.lock -c "echo contenedor obtuvo el lock"' 2>&1
echo "espero $(( $(date +%s) - start )) s (>=4 prueba que el lock cruza el montaje)"
wait
echo "== 3. GNU Time dentro del contenedor"
TIME_BIN=/usr/bin/time
podman run --rm -v "$TIME_BIN:/usr/local/bin/gnutime:ro" --entrypoint sh "$IMAGE" -c \
  'gnutime -f "maxrss=%MKB" sh -c "x=\$(head -c 200000000 /dev/zero | tr \"\\0\" a); sleep 1" 2>&1 | tail -1' 2>&1 | tail -2
