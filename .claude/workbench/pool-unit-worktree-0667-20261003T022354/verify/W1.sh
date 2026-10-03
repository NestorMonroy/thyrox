#!/usr/bin/env bash
# Verify de W1 (TASK-THYROX-0667): las dos suites del pool en verde y el rechazo retirado.
set -uo pipefail
if grep -q 'no va todavía con --isolation worktree' src/session/headless-pool.sh; then echo "verify: el rechazo sigue"; exit 1; fi
bash tests/session/test-headless-pool-execution-unit.sh || { echo "verify: execution-unit en rojo"; exit 1; }
bash tests/session/test-headless-pool-worktree.sh || { echo "verify: worktree en rojo"; exit 1; }
grep -q 'isolation worktree' tests/session/test-headless-pool-execution-unit.sh || { echo "verify: falta el caso nuevo"; exit 1; }
echo "verify: OK"
