#!/usr/bin/env bash
# W1: mide los Qwen instalados como workers de batch con la suite de tarea del
# banco. Las cualificaciones van al archivo del banco (THYROX_MODEL_QUALIFICATIONS),
# nunca al almacén del producto.
set -uo pipefail
root=/home/user/thyrox; out="$1"; mkdir -p "$out"
sock=/root/.claude/model-scheduling/coordinator.sock
export THYROX_MODEL_QUALIFICATIONS="$out/qualifications.json"
cd "$root"
THYROX_CODE_DAEMON_TRANSIENT=1 setsid bun --feature=DAEMON --feature=UDS_INBOX \
  src/packages/cli/src/entry/cli.tsx daemon bg run > "$out/daemon.log" 2>&1 &
for _ in $(seq 60); do [ -S "$sock" ] && break; sleep 1; done
[ -S "$sock" ] || { echo "W1: coordinator socket never appeared"; exit 2; }
for model in thyrox-qwen--qwen2.5-0.5b-instruct:q4_k_m-hf-7ae557604adf \
             thyrox-qwen--qwen2.5-coder-1.5b-instruct:q4_k_m-hf-2e1fd397ee46; do
  tag="${model%%:*}"; tag="${tag#thyrox-qwen--}"
  /usr/bin/time -v -o "$out/$tag.time" bash bin/local-models-qualify "$model" \
    --suite "$root/.claude/workbench/embedding-route-and-local-workers-20261002T093053/w1/batch-worker-mecanica.json" \
    > "$out/$tag.log" 2>&1
  echo "$tag exit=$?" >> "$out/verdicts.txt"
done
echo "W1 EXIT=0"
