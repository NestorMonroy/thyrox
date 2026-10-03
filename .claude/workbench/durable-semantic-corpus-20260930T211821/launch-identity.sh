#!/usr/bin/env bash
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
B=.claude/workbench/durable-semantic-corpus-20260930T211821
export THYROX_ITEM_WORKTREE_SPARSE_EXCLUDE=".claude/workbench .claude/jobs _references/claude-code-bin"
export THYROX_ITEM_WORKTREE_DISK_RESERVE_MB=512
export THYROX_POOL_SNAPSHOT_INTERVAL_SECONDS=600
# La base de pruebas se lee del .env (no versionado) al lanzar: el worktree del
# ítem no trae el .env, y sin la URL las pruebas de integración se omitirían.
THYROX_TEST_POSTGRES_URL="$(grep "^THYROX_TEST_POSTGRES_URL=" .env | cut -d= -f2-)"
[ -n "$THYROX_TEST_POSTGRES_URL" ] || { echo "sin THYROX_TEST_POSTGRES_URL en .env: no se lanza" >&2; exit 2; }
export THYROX_TEST_POSTGRES_URL
bash bin/headless-pool --prompt "$B/template.md" --out "$B/outputs/pool-identity" \
  --task-class analisis --isolation worktree --width 1 --timeout 7200 \
  --verify "bash $B/probes/verify-item.sh" < "$B/items-identity.txt"
