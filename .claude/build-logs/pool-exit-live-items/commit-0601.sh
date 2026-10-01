#!/usr/bin/env bash
set -euo pipefail
cd /home/user/thyrox
eval "$(bash bin/commit_identity env)"
git add -N .claude/build-logs/job-20260930T064055/ .claude/build-logs/pool-exit-live-items/generate-bin-green.log .claude/build-logs/pool-exit-live-items/generate-bin-red.log .claude/build-logs/pool-exit-live-items/item-root-pool-20260930T064054.log .claude/jobs/wt-root-red-20260930T063925/ .claude/workbench/task-census-20260930T064202/  .claude/build-logs/pool-exit-live-items/commit-0601.sh
git commit -F - -- .githooks/pre-commit agent-results/agent_store.sqlite3 bin/agent-cross-model-read-gate bin/agent-emit bin/agent-pre-model-switch bin/agent-recommend bin/binary bin/cli bin/command-runtime bin/commands-emit bin/config-settings bin/finding bin/headless-sdk-generate-core-types bin/provider-anthropic-mock-server bin/provider-credential-proxy bin/provider-generate-storage-key bin/rules-emit bin/shell bin/skills-emit bin/skills-import bin/storage bin/tool-registry-apply-edits bin/typescript-build-javascript src/session/generate_bin.py src/session/headless-pool.sh tests/session/test-headless-pool-worktree.sh tests/session/test_generate_bin.py  .claude/build-logs/job-20260930T064055/ .claude/build-logs/pool-exit-live-items/generate-bin-green.log .claude/build-logs/pool-exit-live-items/generate-bin-red.log .claude/build-logs/pool-exit-live-items/item-root-pool-20260930T064054.log .claude/jobs/wt-root-red-20260930T063925/ .claude/workbench/task-census-20260930T064202/  .claude/build-logs/pool-exit-live-items/commit-0601.sh <<'MSG'
Run each wrapper's own code and give items their own root

A pool item that ran bin/check_package_typecheck from its worktree
rewrote three tsconfig files of the main tree: the pool exported the
main THYROX_ROOT to every item because the runner, bin/cli, needs the
main node_modules, and the TS wrapper used one root both for the code
it runs and for the tree it acts on (H-THYROX-286).

The generated TS wrapper now runs the code next to it (WRAPPER_ROOT,
with its library and node_modules) and keeps a declared THYROX_ROOT for
its children. A worktree item exports its worktree as THYROX_ROOT,
keeps the runner's node_modules home and drops the inherited global
homes, so its tools act on the worktree and anything they write lands
in the item's patch. bin/ is regenerated with the new template.

Tests: test_typescript_wrapper_runs_its_own_tree (red 2 of 3 with the
old template) and worktree case 13 with its control 13c, which measures
the main root once the block is removed.

Also adds the task-census bench: a read-only pool that measures each
of the 70 package tasks against the tree, because C1, C2 and D3-A0
were found already implemented without their task id.

The pre-commit ran the two lexicon gates with a bare python3, which
refuses without spacy-lookups-data unless the committer's PATH holds
the provider environment; a commit from a background job was blocked.
They now go through their bin/ wrappers, which resolve that interpreter.

Refs: TASK-THYROX-0601, H-THYROX-286
MSG
git log -1 --format='%h %an / %cn%n%s'
