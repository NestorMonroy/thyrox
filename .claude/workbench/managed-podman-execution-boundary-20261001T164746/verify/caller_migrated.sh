#!/usr/bin/env bash
# Verificación determinista de un caller migrado: corre en su propia unidad.
# Uso: caller_migrated.sh <tramo> <paquete> <archivo>...
# Falla (exit 1) si un archivo aún importa una función por spec, si la suite del
# paquete tiene más fallas que su línea base, o si falta la evidencia del tramo.
set -uo pipefail
wb="$(cd "$(dirname "$0")/.." && pwd)" slice="$1" package="$2"; shift 2
cd /home/user/thyrox
fail=0
for file in "$@"; do
  if grep -nE 'runJobWithOutput|materializeContainer|WorkerContainerSpec' "$file"; then
    echo "FALLA $file aún usa una función por spec"; fail=1
  fi
  grep -q 'runExecution\|materializeExecution' "$file" || { echo "FALLA $file no compone ExecutionAuthorization"; fail=1; }
done
for log in red green annulment typecheck; do
  [[ -s "$wb/outputs/$slice-$log.log" || -s "$wb/outputs/$slice-$log.txt" ]] || { echo "FALLA falta outputs/$slice-$log"; fail=1; }
done
allowed="$(gawk -v p="$package" '$1 == p { print $2 }' "$wb/verify/baseline.tsv")"
failed="$(cd "src/packages/$package" && bun test 2>&1 | gawk '/^ *[0-9]+ fail$/ { print $1 }' | tail -1)"
echo "suite $package: ${failed:-?} fallas (admitidas ${allowed:-0})"
[[ -n "$failed" && "$failed" -le "${allowed:-0}" ]] || { echo "FALLA suite $package"; fail=1; }
exit "$fail"
