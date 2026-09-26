#!/usr/bin/env bash
# nvidia-smi falso CON ESTADO: la VRAM libre es el total menos lo que usan los
# procesos VIVOS, como en una GPU real (CUDA libera al morir el proceso).
# Estado: $GPU_STATE/total (MiB) y $GPU_STATE/used/<pid> (MiB de ese pid).
state="${GPU_STATE:?}"
live_used() {
  for f in "$state"/used/*; do
    [[ -e "$f" ]] || continue
    pid="${f##*/}"
    [[ -r /proc/$pid/stat ]] || continue
    [[ "$(gawk '{print $3}' /proc/$pid/stat)" == Z ]] && continue
    echo "$pid, $(cat "$f")"
  done
}
case "$*" in
  *--query-compute-apps*) live_used ;;
  *utilization.gpu*)      echo "0, 50" ;;
  *memory.free*)          echo "0, $(( $(cat "$state/total") - $(live_used | gawk -F', ' '{s+=$2} END{print s+0}') ))" ;;
  *) exit 9 ;;
esac
