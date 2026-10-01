#!/usr/bin/env bash
# Mide si el proceso de un contenedor cuelga del `podman run` que lo lanzó: GNU
# Time, gpu_monitor, resource_admission y stdin_probe miden el árbol del
# wrapper del ítem, y un proceso fuera de ese árbol no lo ve ninguno.
# Métrica: cadena de padres del PID del contenedor y RSS máximo que GNU Time
# atribuye a `podman run` mientras el contenedor reserva memoria.
# Ciega a: el modo rootless (aquí rootful) y cgroups v2 (aquí v1).
set -uo pipefail
IMAGE="${PROBE_IMAGE:-docker.io/ollama/ollama:0.35.0}"
name="thyrox-tree-probe-$$"
trap 'podman rm -f "$name" >/dev/null 2>&1' EXIT
podman run -d --name "$name" --entrypoint sleep "$IMAGE" 30 >/dev/null
cpid=$(podman inspect -f '{{.State.Pid}}' "$name")
echo "pid del contenedor: $cpid"
p=$cpid; chain=""
while [ "$p" -gt 1 ]; do chain="$chain $p:$(cat /proc/$p/comm)"; p=$(awk '{print $4}' /proc/$p/stat); done
echo "cadena de padres:$chain 1:init"
podman rm -f "$name" >/dev/null
TIME_BIN=$(command -v /usr/bin/time || true)
if [ -n "$TIME_BIN" ]; then
  "$TIME_BIN" -f 'GNU Time sobre podman run: maxrss=%MKB' podman run --rm --entrypoint sh "$IMAGE" \
    -c 'head -c 300000000 /dev/zero | tail -c 1 >/dev/null; x=$(head -c 200000000 /dev/zero | tr "\0" a); sleep 1' 2>&1 | tail -1
  echo "(el contenedor retuvo ~200 MB en una variable)"
fi
