#!/usr/bin/env bash
# Verifica en el árbol actual, por conducta, cada fase de implementación
# analizada: una línea por suite con su código de salida real (sin `| tail`
# que lo tape) y su última línea.
set -uo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)" || exit 2
export PYTHONPATH="$PWD/src"
run() { local label="$1"; shift; local out rc; out="$("$@" 2>&1)"; rc=$?; printf '%s\trc=%s\t%s\n' "$label" "$rc" "$(tail -1 <<< "$out")"; [[ $rc -eq 0 ]] || failed=1; }
failed=0
run lifecycle-py      python3 tests/session/test_pool_lifecycle.py
run snapshot-recovery python3 tests/session/test_snapshot_recovery.py
run pool-lifecycle-sh bash tests/session/test-headless-pool-lifecycle.sh
run pool-worktree     bash tests/session/test-headless-pool-worktree.sh
run pool-item-drain   bash tests/session/test-headless-pool-item-drain.sh
run item-stash        bash tests/session/test-item-worktree-stash.sh
run bench-seal-gate   python3 tests/verify/test_bench_untracked.py
run store-migrations  python3 tests/agents/test_agent_store_migrations.py
run usage-columns     bash tests/agents/test-agent-store-usage-columns.sh
run usage-source      bash tests/agents/test-agent-store-usage-source.sh
run infra-ensure      bash tests/session/test-infrastructure-ensure.sh
for p in observability tools task daemon; do run "bun-$p" bash -c "cd src/packages/$p && bun test"; done
exit "$failed"
