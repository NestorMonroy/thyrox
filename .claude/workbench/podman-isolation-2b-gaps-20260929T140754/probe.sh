#!/usr/bin/env bash
# Fase 2b, huecos del banco anterior: una capacidad de Podman con o sin su bandera.
# Imprime «caso<TAB>salida». La imagen la importa el llamador (P2B_IMAGE).
set -uo pipefail
img="${P2B_IMAGE:?falta P2B_IMAGE}"
run() { timeout 60 podman run --rm "$@" </dev/null 2>&1 | tr '\n' ' '; }
case "$1" in
  net6-with)        out=$(run --network none "$img" net6) ;;
  net6-without)     out=$(run "$img" net6) ;;
  dns-with)         out=$(run --network none "$img" dns) ;;
  dns-without)      out=$(run "$img" dns) ;;
  tmp-ro)           out=$(run --read-only "$img" write /tmp/p2b) ;;
  run-ro)           out=$(run --read-only "$img" write /run/p2b) ;;
  varTmp-ro)        out=$(run --read-only "$img" write /var/tmp/p2b) ;;
  shm-ro)           out=$(run --read-only "$img" write /dev/shm/p2b) ;;
  tmp-ro-notmpfs)   out=$(run --read-only --read-only-tmpfs=false "$img" write /tmp/p2b) ;;
  cpu1-with)        out=$(run --cpus 0.5 "$img" cpu 1) ;;
  cpu1-without)     out=$(run "$img" cpu 1) ;;
  cpu2-with)        out=$(run --cpus 0.5 "$img" cpu 2) ;;
  cpu2-without)     out=$(run "$img" cpu 2) ;;
  *) echo "caso desconocido: $1" >&2; exit 2 ;;
esac
printf '%s\t%s\n' "$1" "$out"
