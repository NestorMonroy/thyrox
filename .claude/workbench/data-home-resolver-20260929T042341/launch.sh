#!/usr/bin/env bash
# Datos A en headless-pool: un worktree, verificado con las pruebas de los tres resolutores y de configHome.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/data-home-resolver-20260929T042341
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3600 \
  --verify 'printf "%s\n" src/packages/config/__tests__/configHome.test.ts src/packages/local-observability/__tests__/errorRecordingWiring.test.ts src/packages/local-observability/__tests__/errorStore.sqlite.test.ts src/packages/local-observability/__tests__/errorStore.test.ts src/packages/mitm/__tests__/dataDir.test.ts src/packages/mitm/__tests__/state/agentBridgeStore.test.ts src/packages/provider/__tests__/accounts/connectionStoreHome.test.ts | bash bin/run_ts_isolated' \
  < "$B/items.txt"
