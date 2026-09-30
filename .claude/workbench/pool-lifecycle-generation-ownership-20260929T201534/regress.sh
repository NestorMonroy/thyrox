#!/usr/bin/env bash
# Regresión del pool tras exigir la generación en transiciones y publicación.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
rc=0
for t in tests/session/test-headless-pool.sh tests/session/test-headless-pool-worktree.sh \
         tests/session/test-headless-pool-item-drain.sh tests/session/test-headless-pool-thyrox-p.sh \
         tests/session/test-item-worktree-stash.sh; do
  [[ -f "$t" ]] || { echo "$t :: no existe"; continue; }
  out="$(bash "$t" 2>&1)" || rc=1
  echo "$t :: $(tail -1 <<< "$out")"
done
for t in tests/session/test_pool_lifecycle.py tests/session/test_snapshot_recovery.py \
         tests/verify/test_pool_pipeline.py tests/verify/test_bench_untracked.py; do
  out="$(python3 "$t" 2>&1)" || rc=1
  echo "$t :: $(tail -1 <<< "$out")"
done
exit "$rc"
