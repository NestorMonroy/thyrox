#!/usr/bin/env bash
# Datos B en headless-pool: un worktree, verificado con las pruebas del daemon, cli/bg y la flota.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/daemon-config-home-20260929T042341
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 3600 \
  --verify 'printf "%s\n" src/packages/agent/background/fleet/__tests__/fleetStore.test.ts src/packages/agent/background/fleet/__tests__/replBridgeSeed.test.ts src/packages/command-runtime/src/skills/__tests__/skillPaths.behavior.test.ts src/packages/daemon/src/__tests__/bgAdopt.test.ts src/packages/daemon/src/__tests__/dispatchSpool.test.ts src/packages/daemon/src/__tests__/roster.test.ts src/packages/daemon/src/__tests__/rvChannel.test.ts src/packages/daemon/src/__tests__/socketPaths.test.ts | bash bin/run_ts_isolated' \
  < "$B/items.txt"
