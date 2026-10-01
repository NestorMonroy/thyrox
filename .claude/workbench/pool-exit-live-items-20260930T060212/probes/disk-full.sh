#!/usr/bin/env bash
# Causa candidata 2: el disco se llena con el ítem vivo. El repositorio, el
# runtime y los worktrees viven en un tmpfs de PROBE_TMPFS_MB; el runner llena
# el disco y sigue escribiendo su stream mientras el pool vive.
PROBE_WORKDIR="$(mktemp -d)"; export PROBE_WORKDIR
mount -t tmpfs -o size="${PROBE_TMPFS_MB:-24}m" tmpfs "$PROBE_WORKDIR" || { echo "sin tmpfs"; exit 2; }
export THYROX_ITEM_WORKTREE_DISK_RESERVE_MB=0
source "$(dirname "$0")/common.sh"
export PROBE_FILL_MB="${PROBE_FILL_MB:-64}"
start_pool
sleep 3
df -h "$PROBE_WORKDIR" | tail -1
echo "con el disco lleno, ${PROBE_OBSERVE_SECONDS:-15} s de observación"
sleep "${PROBE_OBSERVE_SECONDS:-15}"
echo "pool vivo: $(kill -0 "$POOL_PID" 2>/dev/null && echo yes || echo no)"
echo "parallel vivo: $(pgrep -fc '[p]arallel .*--joblog' || true)"
trace "(en curso)"
exec {fd}<> "$W/release"; echo go >&"$fd"; exec {fd}>&-
sleep 3
echo "tras soltar el ítem:"; trace "$(kill -0 "$POOL_PID" 2>/dev/null && echo vivo || echo salió)"
kill -TERM -- "-$POOL_PID" 2>/dev/null; pkill -TERM -f "$PROBE_WORKDIR/[r]unner"; sleep 1
umount -l "$PROBE_WORKDIR"
