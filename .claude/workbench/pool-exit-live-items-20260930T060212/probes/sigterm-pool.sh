#!/usr/bin/env bash
# Causa candidata 1: TERM al grupo del pool con un ítem vivo.
PROBE_WORKDIR="$(mktemp -d)"; export PROBE_WORKDIR
source "$(dirname "$0")/common.sh"
start_pool
sleep 1
kill -TERM -- "-$POOL_PID"
wait "$POOL_PID"; code=$?
sleep 1
trace "$code"
pkill -TERM -f "$PROBE_WORKDIR/[r]unner"
