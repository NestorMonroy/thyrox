#!/usr/bin/env bash
# Identidad de un payload gestionado vista DESDE DENTRO, escrita antes de que
# corra: el cgroup del proceso, el contenedor que ese cgroup nombra y el pid. Es
# la mitad del payload de ManagedExecutionContainmentGate
# (src/verify/managed_execution_containment.py); la otra la escribe el primitivo
# con `run --attest`. Corrido en el anfitrión, el cgroup no nombra un contenedor
# y la fila dice inUnit=false: el gate lo rechaza.
#
# Uso: unit_attest.sh <archivo.jsonl> <tarea> <paso> -- <payload...>
set -euo pipefail
out="${1:?archivo}" task="${2:?tarea}" step="${3:?paso}"
shift 3
[[ "${1:-}" == "--" ]] || { echo "unit_attest: falta -- antes del payload" >&2; exit 2; }
shift
(( $# > 0 )) || { echo "unit_attest: falta el payload" >&2; exit 2; }
cgroup="$(gawk -F: '$1 == "0" || $2 == "pids" { print $3; exit }' /proc/self/cgroup)"
container="$(printf '%s' "$cgroup" | gawk 'match($0, /libpod-[0-9a-f]{64}/) { print substr($0, RSTART + 7, 64); exit }')"
in_unit=false
[[ -n "$container" && -e /run/.containerenv ]] && in_unit=true
mkdir -p "$(dirname "$out")"
jq -cn --arg task "$task" --arg step "$step" --arg cgroup "$cgroup" --arg container "$container" \
  --argjson pid "$$" --argjson inUnit "$in_unit" --arg utc "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg payload "$1" \
  '{task: $task, step: $step, payload: $payload, containerId: $container, cgroup: $cgroup, pid: $pid, inUnit: $inUnit, utc: $utc}' >> "$out"
exec "$@"
