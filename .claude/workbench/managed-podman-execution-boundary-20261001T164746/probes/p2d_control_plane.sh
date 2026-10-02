#!/usr/bin/env bash
# Fase de plano de control de p2d: el anfitrión lanza por la entrada canónica (thyrox-bg start
# --task) una unidad de cada clase que usarán p3, p4 y p5, con el payload de identidad, y
# comprueba que sus líneas de manifiesto llevan "entry":"thyrox-bg" y contenedores distintos.
# Lanzar y observar unidades es trabajo del plano de control; el payload corre en ellas.
# Uso: p2d_control_plane.sh   Salida: 0 probado · 1 no. Deja outputs/p2d-entry-units.log.
set -uo pipefail
wb="$(cd "$(dirname "$0")/.." && pwd)"; root="$(git -C "$wb" rev-parse --show-toplevel)"; cd "$root" || exit 1
bench="${wb#"$root"/}"; log="$wb/outputs/p2d-entry-units.log"; stamp="$(date -u +%Y%m%dT%H%M%S)"
{
  for class in maintenance test probe; do
    name="p2d-entry-$class-$stamp"
    echo "\$ bin/thyrox-bg start $name --task TASK-THYROX-0743 --kind $class -- bash $bench/probes/unit_identity.sh $bench p2d $class"
    bash bin/thyrox-bg start "$name" --grace 0 --task TASK-THYROX-0743 --kind "$class" \
      -- bash "$bench/probes/unit_identity.sh" "$bench" p2d "$class" > /dev/null 2>&1
    bash bin/thyrox-bg wait "$name" > /dev/null 2>&1
    echo "  $(bash bin/thyrox-bg status "$name")"
  done
  lines="$(jq -c --arg since "$(date -u -d "-15 min" +%Y-%m-%dT%H:%M:%S)" \
    'select(.item == "p2d" and .entry == "thyrox-bg" and .utc >= $since)' "$wb/manifest.jsonl")"
  classes="$(jq -r '.step' <<< "$lines" | sort -u | grep -cE '^(maintenance|test|probe)$')"
  containers="$(jq -r '.containerId' <<< "$lines" | sort -u | grep -c .)"
  echo "$lines"
  echo "clases=$classes contenedores=$containers"
  (( classes == 3 && containers >= 3 )) && echo "exit=0" || echo "exit=1"
} > "$log" 2>&1
cat "$log"; grep -q '^exit=0$' "$log"
