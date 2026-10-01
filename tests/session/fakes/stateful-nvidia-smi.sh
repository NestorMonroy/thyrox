#!/usr/bin/env bash
# nvidia-smi falso CON ESTADO: un MODELO de cómo creemos que se comporta una
# GPU NVIDIA, no una descripción de ella. Lo libre es el total menos lo que usan
# los procesos VIVOS (CUDA libera al morir el proceso).
#
# Estado en $GPU_STATE:
#   total                  MiB de la GPU
#   used/<pid>             MiB que ese pid pidió
#   context_overhead_mib   (opcional) MiB que el driver suma a cada proceso con
#                          contexto CUDA; por defecto 0
#   hide_pids              (opcional) compute-apps no lista ningún pid, como un
#                          nvidia-smi que ve PIDs de otro espacio de nombres
#
# Los dos opcionales son CALIBRACIÓN: los fija lo que `gpu_trace compare` mida
# en una GPU real. Si el modelo se aleja del hardware se corrige aquí, no se
# reinterpreta la traza.
state="${GPU_STATE:?}"
# Sin estado no hay GPU que leer: falla como un nvidia-smi sin driver, no
# responde un 0 que se leería como «GPU llena».
[[ -r "$state/total" ]] || { echo "NVIDIA-SMI has failed" >&2; exit 9; }
overhead=0
[[ -r "$state/context_overhead_mib" ]] && overhead="$(cat "$state/context_overhead_mib")"
# Lo que cada proceso vivo ocupa de verdad en la GPU: lo pedido más el contexto.
physical_used() {
  for f in "$state"/used/*; do
    [[ -e "$f" ]] || continue
    pid="${f##*/}"
    [[ -r /proc/$pid/stat ]] || continue
    [[ "$(gawk '{print $3}' /proc/$pid/stat)" == Z ]] && continue
    echo "$pid, $(( $(cat "$f") + overhead ))"
  done
}
case "$*" in
  *--query-compute-apps*) [[ -e "$state/hide_pids" ]] || physical_used ;;
  *utilization.gpu*)      echo "0, 50" ;;
  *memory.free*)          echo "0, $(( $(cat "$state/total") - $(physical_used | gawk -F', ' '{s+=$2} END{print s+0}') ))" ;;
  *) exit 9 ;;
esac
