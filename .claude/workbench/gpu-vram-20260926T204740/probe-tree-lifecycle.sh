#!/usr/bin/env bash
# Sonda: ¿qué ve un muestreador cada 0.2 s sobre el árbol «bash -c 'sleep N & wait'»?
# Columnas: t, estado del padre (/proc/<pid>/stat), hijos del padre.
bash -c 'sleep 1.5 & wait' &
parent=$!
start=$(date +%s.%N)
for _ in $(seq 20); do
  t=$(echo "$(date +%s.%N) - $start" | bc)
  state=$(gawk '{sub(/.*\) /,""); print $1}' /proc/$parent/stat 2>/dev/null || echo "-")
  kids=$(cat /proc/$parent/task/*/children 2>/dev/null | tr -s ' ')
  printf '%4.1f  estado=%-2s  hijos=[%s]\n' "$t" "$state" "$kids"
  [ "$state" = "-" ] && break
  sleep 0.2
done
wait $parent
