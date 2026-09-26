#!/usr/bin/env bash
# Sonda: con el nvidia-smi con estado, dos admisiones de 3200 sobre 6000
# mientras la primera aún no asignó. Imprime quién entra y el margen visto.
set -u
B="$(cd "$(dirname "$0")" && pwd)"; T="$(cd "$B/../../.." && pwd)"
export GPU_STATE="$(mktemp -d -p "$B")"; echo 6000 > "$GPU_STATE/total"; mkdir -p "$GPU_STATE/used"
SMI="$B/stateful-nvidia-smi.sh"; L="$GPU_STATE/vram.json"
owner_a() { bash "$T/bin/gpu_monitor" admit 3200 --ledger "$L" --owner $BASHPID --nvidia-smi "$SMI" --timeout 1 --interval 0.1 \
            && { echo "A admitido"; bash "$B/ramp-alloc.sh" 3200 4 0.2 1; } || echo "A esperó"; }
owner_b() { sleep 0.1; bash "$T/bin/gpu_monitor" admit 3200 --ledger "$L" --owner $BASHPID --nvidia-smi "$SMI" --timeout 1.5 --interval 0.1 \
            && echo "B admitido" || echo "B esperó"; }
owner_a & owner_b & wait
echo "libre al final (A murió, CUDA liberó): $(bash "$SMI" --query-gpu=index,memory.free)"
rm -rf "$GPU_STATE"
