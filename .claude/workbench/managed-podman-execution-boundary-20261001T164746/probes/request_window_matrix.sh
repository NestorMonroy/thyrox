#!/usr/bin/env bash
# ~114 k tokens de entrada (el punto donde fallaron los dos trabajadores Qwen) con
# max_tokens mínimo y con 32 000, sin y con streaming. Corre en una unidad.
set -uo pipefail
for variant in "16 0" "32000 0" "32000 1" "8000 1"; do
  set -- $variant
  PROBE_MAX_TOKENS=$1 PROBE_STREAM=$2 bash .claude/workbench/managed-podman-execution-boundary-20261001T164746/probes/request_size_limit.sh qwen3.8-flash 33
done
