#!/usr/bin/env bash
# Pico de RSS por forma de consumir el cuerpo de fetch, con un blob de N MiB
# servido por un Bun.serve mínimo. Uso: measure_variants.sh <MiB> <variante>...
set -uo pipefail
bench="$(cd "$(dirname "$0")/.." && pwd)"
shm="/dev/shm/verifier-variants-$$"; mkdir -p "$shm"
trap 'kill "${SERVER_PID:-0}" 2>/dev/null; rm -rf "${shm:?}"' EXIT
mib="$1"; shift
head -c "$((mib * 1024 * 1024))" /dev/urandom > "$shm/blob"
coproc SERVER { exec bun "$bench/probes/range_server.ts" "$shm/blob"; }
read -r port <&"${SERVER[0]}"
for variant in "$@"; do
  /usr/bin/time -f '%x\t%M\t%e' -o "$shm/time" bun "$bench/probes/consume_variants.ts" "http://127.0.0.1:$port/" "$variant" "$shm/out" 2>/dev/null
  printf '%s\t%s\t%s\n' "$mib" "$variant" "$(cat "$shm/time")" | tee -a "$bench/outputs/variants.tsv"
  rm -f "$shm/out"
done
