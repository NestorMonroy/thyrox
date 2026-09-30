#!/usr/bin/env bash
# Construye la imagen local sin red y corre los casos de uno en uno: los tiempos
# (reinicio, intervalo del healthcheck) no deben competir entre si.
set -uo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/podman-recovery-without-systemd-20260929T160414
work="$(mktemp -d)"
cleanup() { podman rmi -f "$RECOVERY_IMAGE" >/dev/null 2>&1; rm -rf "${work:?}"; }
export RECOVERY_IMAGE="localhost/thyrox-recovery:$$"
export RECOVERY_STATE_DIR="$work/state"
trap cleanup EXIT
mkdir -p "$work/rootfs" "$RECOVERY_STATE_DIR"
gcc -static -O2 -o "$work/rootfs/helper" "$B/helper.c" || { echo "gcc fallo" >&2; exit 2; }
tar -C "$work/rootfs" -cf "$work/rootfs.tar" . && podman import "$work/rootfs.tar" "$RECOVERY_IMAGE" >/dev/null \
  || { echo "podman import fallo" >&2; exit 2; }
echo "IMG=$RECOVERY_IMAGE" > "$B/image.txt"
: > "$B/${RECOVERY_RESULTS:-results.tsv}"
for case_name in ${RECOVERY_CASES:-host restart-no-kill restart-on-failure-kill restart-always-kill health-runs-alone health-on-failure-restart whole-tree-dies}; do
  bash "$B/probe.sh" "$case_name" >> "$B/${RECOVERY_RESULTS:-results.tsv}" 2>> "$B/results.err"
done
echo "done rc=0" >> "$B/results.err"
