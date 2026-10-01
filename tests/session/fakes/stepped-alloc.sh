#!/usr/bin/env bash
# Asignador falso por PASOS, gobernado por el test: antes del paso i espera
# `$ctl/go.i`, escribe su uso (MIB * i / STEPS) y confirma con `$ctl/ack.i`.
# Después sostiene lo asignado hasta `$ctl/stop`. Las fases las fija quien
# prueba, no el planificador del sistema: no hay `sleep` que acertar.
# Uso: stepped-alloc.sh CTL MIB STEPS   (GPU_STATE apunta al estado de la GPU)
ctl="$1" mib="$2" steps="$3"
wait_for() { local deadline=$((SECONDS + 20)); until [[ -e "$1" ]]; do
  (( SECONDS < deadline )) || exit 7; sleep 0.01; done; }
mkdir -p "$GPU_STATE/used"
for ((i = 1; i <= steps; i++)); do
  wait_for "$ctl/go.$i"
  echo $(( mib * i / steps )) > "$GPU_STATE/used/$$"
  touch "$ctl/ack.$i"
done
wait_for "$ctl/stop"
