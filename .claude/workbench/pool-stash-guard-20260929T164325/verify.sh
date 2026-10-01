#!/usr/bin/env bash
# Verifica el ítem: toca el pool, así que corre las suites del pool y la nueva.
set -uo pipefail
fail() { echo "VERIFY FAIL: $*" >&2; exit 1; }
changed="$( { git diff --name-only HEAD; git ls-files --others --exclude-standard; } | sort -u)"
[ -n "$changed" ] || fail "sin cambios"
echo "$changed" | grep -qE '^(\.claude|_references|agent-results)/' && fail "toca .claude, _references o agent-results"
echo "$changed" | grep -q '^src/session/item_git_guard/git$' || fail "falta el envoltorio de git"
for t in tests/session/test-item-worktree-stash.sh tests/session/test-headless-pool-worktree.sh \
         tests/session/test-item-worktree-disk.sh tests/session/test-item-worktree-location.sh \
         tests/session/test-item-worktree-lock.sh tests/session/test-item-worktree-orphans.sh; do
  timeout 900 bash "$t" 2>&1 | tail -2 || fail "$t"
done
grep -q '^THYROX_POOL_STASH_ATTEMPTS_FILE=' .env.example || fail "falta la variable en .env.example"
echo "VERIFY OK"
