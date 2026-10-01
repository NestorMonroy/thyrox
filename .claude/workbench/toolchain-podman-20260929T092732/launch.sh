#!/usr/bin/env bash
# Instalador opt-in de Podman en el toolchain, re-comprobado con podman info.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/toolchain-podman-20260929T092732
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs" --model claude-sonnet-5 \
  --isolation worktree --width 1 --timeout 2400 \
  --verify 'bash tests/lib/test-toolchain-podman.sh && bash tests/lib/test-toolchain-redis.sh && bash tests/lib/test-toolchain-consumer-env.sh' \
  < "$B/items.txt"
