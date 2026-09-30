#!/usr/bin/env bash
# #309: sonda de capacidades de ejecución de Podman sobre cgroups v1, con imagen local.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/podman-capabilities-20260929T093551
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 2400 \
  --verify 'bash tests/lib/test-podman-capabilities.sh && bash tests/lib/test-toolchain-podman.sh' \
  < "$B/items.txt"
