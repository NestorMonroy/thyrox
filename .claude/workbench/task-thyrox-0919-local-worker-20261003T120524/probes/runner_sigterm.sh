#!/usr/bin/env bash
# Control real de la entrada del runner: un SIGTERM al runner de `run` retira
# su contenedor. Lanza un payload `sleep`, espera a que su contenedor exista,
# envía SIGTERM al runner y mide si el contenedor sigue vivo. Observa Podman
# sólo por la primitiva (`observe containers`), nunca con un verbo propio.
set -u
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
execute="$root/bin/podman-execution-execute"
probe_containers() {
  bash "$execute" observe containers | jq -r '.[] | select(.running and .labels["thyrox.owner-id"] == "sigterm-probe") | .name'
}
bash "$execute" run --work thyrox:runner-sigterm --owner pool:sigterm-probe \
    --kind maintenance --network none -- sleep 300 >/dev/null 2>&1 &
runner=$!
name=""
for _ in $(seq 1 60); do
  name="$(probe_containers | head -1)"
  [[ -n "$name" ]] && break
  sleep 1
done
echo "contenedor=${name:-ninguno}"
runner_pid="$(pgrep -P "$runner" -f '[e]xecute.ts run' || echo "$runner")"
kill -TERM "$runner_pid"
wait "$runner" 2>/dev/null; echo "runner_exit=$?"
sleep 2
echo "vivo_tras_sigterm=$(probe_containers | wc -l)"
