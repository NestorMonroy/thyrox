#!/usr/bin/env bash
set -uo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)" || exit 2
export PYTHONDONTWRITEBYTECODE=1
rc=0
uv run --quiet pytest -q tests/agents/test_merge_sqlite_union.py tests/agents/test_store_field_classes.py || rc=1
bash tests/agents/test-merge-sqlite-union.sh || rc=1
python3 tests/verify/test_finding_id_unique.py || rc=1
bash tests/verify/test_pre_push_finding_gate.sh || rc=1
bash .claude/workbench/d4a-three-way-merge-20260929T224254/probes/real-store-smoke.sh || rc=1
echo "DERIVED_EXIT=$rc"; exit $rc
