#!/usr/bin/env bash
# Asignador falso: sube su uso a MIB en STEPS pasos de DELAY s y lo sostiene
# HOLD s. Modela el retraso entre ser admitido y que CUDA asigne de verdad.
mib="$1" steps="$2" delay="$3" hold="$4"
mkdir -p "$GPU_STATE/used"
for ((i = 1; i <= steps; i++)); do
  sleep "$delay"; echo $(( mib * i / steps )) > "$GPU_STATE/used/$$"
done
sleep "$hold"
