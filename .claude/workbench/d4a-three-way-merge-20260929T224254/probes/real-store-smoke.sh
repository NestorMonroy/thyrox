#!/usr/bin/env bash
# Smoke del merge three-way sobre tres versiones reales del store versionado.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
T=$(mktemp -d); trap 'rm -rf "${T:?}"' EXIT
S=agent-results/agent_store.sqlite3
git show HEAD~6:$S > "$T/base"; git show HEAD:$S > "$T/ours"; git show HEAD~3:$S > "$T/theirs"
PYTHONPATH=src python3 src/agents/merge_sqlite_union.py "$T/base" "$T/ours" "$T/theirs"; echo "merge_exit=$?"
python3 -c 'import sqlite3,sys; print(sqlite3.connect(sys.argv[1]).execute("PRAGMA integrity_check").fetchone()[0])' "$T/ours"
