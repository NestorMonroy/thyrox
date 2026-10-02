#!/usr/bin/env bash
# Verde de TASK-THYROX-0781: aplica el cambio y corre la suite de política y las hermanas del pool.
set -u
B=/home/user/thyrox/.claude/workbench/pool-context-tokens-20261002T074707
cd /home/user/thyrox
python3 "$B/probes/impl.py" || exit 1
bash -n src/session/headless-pool.sh || exit 1
status=0
for t in tests/session/test-headless-pool-model-policy.sh tests/session/test-headless-pool-local-model-e2e.sh tests/session/test-headless-pool-execution-unit.sh tests/session/test-headless-pool.sh; do
  bash "$t" > "$B/outputs/green-$(basename "$t" .sh).txt" 2>&1; rc=$?
  echo "$(basename "$t") exit=$rc $(tail -1 "$B/outputs/green-$(basename "$t" .sh).txt")"; [ $rc = 0 ] || status=1
done
exit $status
