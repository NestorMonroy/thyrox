#!/usr/bin/env bash
set -euo pipefail
cd /home/user/thyrox
eval "$(bash bin/commit_identity env)"
git add -N tests/session/test-headless-pool-exit-live-items.sh .claude/workbench/pool-exit-live-items-20260930T060212 .claude/jobs/exit-suite-20260930T060705 .claude/jobs/exit-suite2-20260930T060929 .claude/jobs/exit-suite3-20260930T061151 .claude/jobs/exit-suite4-20260930T061456 .claude/jobs/lifecycle-suite-20260930T061227 .claude/jobs/probe-diskfull-20260930T060718 .claude/jobs/probe-diskfull2-20260930T060929 .claude/jobs/probe-sigterm-20260930T060717 .claude/jobs/worktree-suite-20260930T061228 .claude/jobs/worktree-suite2-20260930T061456 .claude/jobs/wt-location-20260930T061721 .claude/build-logs/job-20260930T061304 .claude/build-logs/pool-exit-live-items
git commit -F - -- src/session/headless-pool.sh src/session/item_worktree.sh tests/session/test-headless-pool-exit-live-items.sh tests/session/test-headless-pool-frozen-launcher.sh tests/session/test-headless-pool-lifecycle.sh .claude/workbench/pool-exit-live-items-20260930T060212 .claude/jobs/exit-suite-20260930T060705 .claude/jobs/exit-suite2-20260930T060929 .claude/jobs/exit-suite3-20260930T061151 .claude/jobs/exit-suite4-20260930T061456 .claude/jobs/lifecycle-suite-20260930T061227 .claude/jobs/probe-diskfull-20260930T060718 .claude/jobs/probe-diskfull2-20260930T060929 .claude/jobs/probe-sigterm-20260930T060717 .claude/jobs/worktree-suite-20260930T061228 .claude/jobs/worktree-suite2-20260930T061456 .claude/jobs/wt-location-20260930T061721 .claude/build-logs/job-20260930T061304 .claude/build-logs/pool-exit-live-items agent-results/agent_store.sqlite3 <<'MSG'
Drain live items and keep unclosed worktrees on pool exit

Groups 7 and 8 exited with live items: the pool swept their worktrees
while the thyrox -p processes kept writing, and joblog.tsv stayed
header-only (H-THYROX-283). Two guards, each with a nullification
control in the new suite:

- Every item records its runner session and publishing shell in
  <n>.session. On any signal, or when GNU Parallel returns with items
  still alive, the pool drains those sessions (process_ownership) and
  waits for the shells to publish before sweeping. Parallel runs in the
  background so a signal interrupts the wait and the trap runs; the
  frozen launcher forwards signals to its copy and passes it stdin.
- item_worktree sweep keeps the worktree of an item of the run that has
  no <n>.closed, leaving it to pool_lifecycle reconcile. A sweep without
  a live dir is the executor's manual sweep and removes everything.

The pool now logs Parallel's exit when it dies by signal: neither TERM
to the pool nor a full disk reproduce the trace (probes in the bench);
only Parallel dying alone does, and what killed it stays unknown
(H-THYROX-285).

The lifecycle suite resolved the item runtime with dirname over an
empty compgen and wrote {"generation": 2} into the repo root when the
item never started; that file was attributed to an orphan item
(H-THYROX-284). live_dir now aborts instead. The frozen-launcher control
rewrites a line after a fork point, since bash rereads the script on
fork, not on a builtin.

Refs: TASK-THYROX-0639, H-THYROX-283, H-THYROX-284, H-THYROX-285
MSG
git log -1 --format='%h %an <%ae> / %cn <%ce>%n%s'
