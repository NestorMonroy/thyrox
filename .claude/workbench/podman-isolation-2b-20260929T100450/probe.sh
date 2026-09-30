#!/usr/bin/env bash
# Fase 2b: una capacidad de aislamiento de Podman, con o sin su bandera. Imprime «caso<TAB>salida».
set -uo pipefail
root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
img="${P2B_IMAGE:?falta P2B_IMAGE}"; rw="${P2B_RW_DIR:?falta P2B_RW_DIR}"
run() { podman run --rm "$@" 2>&1 | tr '\n' ' '; }
case "$1" in
  net-with)      out=$(run --network none "$img" net) ;;
  net-without)   out=$(run "$img" net) ;;
  rootfs-with)   out=$(run --read-only "$img" write /probe-write) ;;
  rootfs-without) out=$(run "$img" write /probe-write) ;;
  cpu-with)      out=$(run --cpus 0.5 "$img" cpu) ;;
  cpu-without)   out=$(run "$img" cpu) ;;
  repo-ro)       out="$(run -v "$root:/repo:ro" "$img" read /repo/README.md) $(run -v "$root:/repo:ro" "$img" write /repo/p2b-must-not-exist)" ;;
  repo-rw-control) out=$(run -v "$rw:/scratch" "$img" write /scratch/p2b-control) ;;
  *) echo "caso desconocido: $1" >&2; exit 2 ;;
esac
printf '%s\t%s\n' "$1" "$out"
