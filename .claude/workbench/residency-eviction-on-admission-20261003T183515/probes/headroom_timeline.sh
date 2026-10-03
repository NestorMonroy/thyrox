#!/usr/bin/env bash
# EXPERIMENTAL — medición exploratoria: la holgura de RAM y las unidades de
# modelo vivas cada segundo mientras corre real_eviction.sh, para ver CUÁNDO baja
# la holgura al cargar una residencia (¿en la admisión o después?).
# Uso: headroom_timeline.sh <modelo> > timeline.tsv
set -u
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
sample() {
  while :; do
    printf '%s\t%s\t%s\n' "$(date +%s)" "$(bash "$root/bin/resource_admission" headroom-ram 2>/dev/null)" \
      "$(bash "$root/bin/podman-execution-execute" observe containers | jq -r '[.[] | select(.running and (.labels["thyrox.model.residency"] // "") != "") | .labels["thyrox.model.residency"] | sub(".*/"; "")] | join(",")')"
    sleep 1
  done
}
sample & sampler=$!
bash "$here/real_eviction.sh" "$1" | sed 's/^/# /'
sleep 30
kill "$sampler"
