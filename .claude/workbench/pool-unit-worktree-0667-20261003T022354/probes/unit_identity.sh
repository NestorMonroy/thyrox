#!/usr/bin/env bash
# Registra en manifest.jsonl un paso y la identidad de la unidad que lo
# ejecuta, MIENTRAS se ejecuta: contenedor, PID y cgroup vistos desde dentro.
# `recordedBy` es siempre la unidad que escribe la línea.
#
#   bash probes/unit_identity.sh <banco> <item> <paso>
#       el paso lo ejecuta esta misma unidad: containerId = recordedBy.
#   bash probes/unit_identity.sh <banco> <item> <paso> --source <archivo>
#       transcribe un paso que ejecutó OTRA unidad: la identidad sale del
#       archivo que ese paso escribió durante su ejecución, nunca de la
#       unidad que transcribe. Sin un contenedor en el archivo, rehúsa.
set -euo pipefail
workbench="$1" item="$2" step="$3" source="${5:-}"
[[ "${4:-}" == "" || "${4:-}" == "--source" ]] || { echo "unit_identity: argumento desconocido: $4" >&2; exit 2; }
own_cgroup="$(gawk -F: '$1 == "0" || $2 == "pids" { print $3; exit }' /proc/self/cgroup)"
container_of() { printf '%s' "$1" | gawk 'match($0, /libpod-[0-9a-f]+/) { print substr($0, RSTART + 7, RLENGTH - 7); exit }'; }
recorded_by="$(container_of "$own_cgroup")"
container_id="$recorded_by" cgroup="$own_cgroup" pid="$$" hostname="$(hostname)" utc="$(date -u +%Y-%m-%dT%H:%M:%S)"
if [[ -n "$source" ]]; then
  [[ -f "$workbench/$source" ]] || { echo "unit_identity: no existe la fuente $source" >&2; exit 2; }
  container_id="$(container_of "$(cat "$workbench/$source")")"
  [[ -n "$container_id" ]] || { echo "unit_identity: $source no declara contenedor; no se atribuye identidad" >&2; exit 2; }
  value_of() { gawk -v key="$1" 'index($0, key "=") == 1 { print substr($0, length(key) + 2); exit }' "$workbench/$source"; }
  cgroup="$(value_of cgroup | gawk '{ print $NF }' | gawk -F: '{ print $NF }')"
  pid="$(value_of pid)" hostname="$(value_of hostname)" utc="$(value_of utc)"
fi
jq -cn --arg item "$item" --arg step "$step" --arg utc "$utc" --arg hostname "$hostname" --arg pid "$pid" \
  --arg cgroup "$cgroup" --arg container "$container_id" --arg recordedBy "$recorded_by" --arg source "$source" \
  '{item: $item, step: $step, utc: $utc, hostname: $hostname, pid: ($pid | tonumber), cgroup: $cgroup,
    containerId: $container, recordedBy: $recordedBy, inUnit: ($container != "")}
   + (if $source == "" then {} else {source: $source} end)' >> "$workbench/manifest.jsonl"
