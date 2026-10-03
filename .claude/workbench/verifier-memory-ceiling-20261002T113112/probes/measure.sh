#!/usr/bin/env bash
# Mide el pico de RSS de verifyArtifact.ts por tamaño de blob, contra el
# registro falso. Uso: measure.sh <MiB>...  Deja una fila TSV por tamaño en
# outputs/rss.tsv: mib, exit, max_rss_kib, wall_s.
set -uo pipefail
bench="$(cd "$(dirname "$0")/.." && pwd)"; root="$(git -C "$bench" rev-parse --show-toplevel)"
shm="/dev/shm/verifier-probe-$$"; mkdir -p "$shm"
trap 'rm -rf "${shm:?}"' EXIT
mkdir -p "$bench/outputs"
for mib in "$@"; do
  head -c "$((mib * 1024 * 1024))" /dev/urandom > "$shm/blob"
  coproc SERVER { cd "$root" && exec bun "$bench/probes/serve_blob.ts" "$shm/blob"; }
  read -r url digest <&"${SERVER[0]}"
  rm -f "$shm/blob"
  /usr/bin/time -f '%x\t%M\t%e' -o "$shm/time" \
    bun "$root/src/packages/artifact-registry/bin/verifyArtifact.ts" --registry "$url" --repository probe/blob \
      --tag probe --digest "$digest" --work-dir "$shm/work" --report "$shm/report.json" > "$shm/verify.log" 2>&1
  printf '%s\t%s\n' "$mib" "$(cat "$shm/time")" | tee -a "$bench/outputs/rss.tsv"
  tail -1 "$shm/verify.log"
  kill "${SERVER_PID:-0}" 2>/dev/null; wait 2>/dev/null
  rm -rf "${shm:?}/work"
done
