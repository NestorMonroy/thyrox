#!/usr/bin/env bash
# Subconjunto derivado tras integrar el pool prioritario (TASK-THYROX-0602, 0603, 0608).
cd "$(git rev-parse --show-toplevel)" || exit 2
rc=0
for t in tests/hooks/test_detect_ephemeral_citation.py tests/hooks/test_detect_foreground_long_command.py \
         tests/hooks/test_detect_library_path_invocation.py tests/hooks/test_detect_rst_validation.py \
         tests/hooks/test_detect_topic_duplication.py tests/hooks/test_detect_unbounded_traversal.py \
         tests/hooks/test_tool_use_preflight.py; do
  echo "== $t"; uv run python "$t" 2>&1 | tail -3 || rc=1
done
echo "== tests/lib/test-toolchain-pgvector.sh"; bash tests/lib/test-toolchain-pgvector.sh 2>&1 | tail -4 || rc=1
URL="$(sed -n 's/^THYROX_TEST_POSTGRES_URL=//p' .env)"
echo "== store (sin URL)"; (cd src/packages/store && env -u THYROX_TEST_POSTGRES_URL bun test 2>&1 | tail -6) || rc=1
echo "== store (PostgreSQL real)"; (cd src/packages/store && THYROX_TEST_POSTGRES_URL="$URL" bun test 2>&1 | tail -6) || rc=1
echo "EXIT=$rc"
