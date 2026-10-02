#!/usr/bin/env bash
# Corre las pruebas cuyo archivo, o la fuente que prueban, cambió con la renumeración.
set -u
cd /home/user/thyrox
out=.claude/workbench/citation-renumbering-20261002T071805/outputs
status=0
for t in $(git diff --name-only | grep -E '/__tests__/.*\.test\.ts$'); do
  pkg=${t%%/__tests__/*}; rel=${t#"$pkg"/}
  (cd "$pkg" && bun test "$rel") > "$out/bun-$(basename "$t" .ts).txt" 2>&1; rc=$?
  echo "$t exit=$rc $(grep -E '^ *[0-9]+ (pass|fail)' "$out/bun-$(basename "$t" .ts).txt" | tr '\n' ' ')"; [ $rc = 0 ] || status=1
done
for t in tests/agents/test_recommend_cli.py tests/local_models/test_transformers_runtime_server.py; do
  uv run --quiet python -m pytest -q "$t" > "$out/py-$(basename "$t" .py).txt" 2>&1; rc=$?
  echo "$t exit=$rc $(tail -1 "$out/py-$(basename "$t" .py).txt")"; [ $rc = 0 ] || status=1
done
for t in tests/session/test-headless-pool-execution-unit.sh tests/session/test-headless-pool-local-model-e2e.sh tests/session/test-headless-pool-model-policy.sh; do
  bash "$t" > "$out/sh-$(basename "$t" .sh).txt" 2>&1; rc=$?
  echo "$t exit=$rc $(tail -1 "$out/sh-$(basename "$t" .sh).txt")"; [ $rc = 0 ] || status=1
done
exit $status
