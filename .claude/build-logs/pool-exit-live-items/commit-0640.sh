#!/usr/bin/env bash
set -euo pipefail
cd /home/user/thyrox
eval "$(bash bin/commit_identity env)"
git add -N .claude/jobs/case7-probe-20260930T063027/ .claude/jobs/lifecycle-0640-20260930T062345/ .claude/jobs/lifecycle-0640b-20260930T063301/ 
git commit -F - -- src/session/headless-pool.sh src/session/item_worktree.sh tests/session/test-headless-pool-lifecycle.sh  .claude/jobs/case7-probe-20260930T063027/ .claude/jobs/lifecycle-0640-20260930T062345/ .claude/jobs/lifecycle-0640b-20260930T063301/  <<'MSG'
Declare the worktree disk admission in the lifecycle suite

test-headless-pool-lifecycle.sh inherited the item worktree admission
from the host: with little free disk, each worktree case waited up to
the 600 s default in item_worktree prepare. The suite now declares a
zero reserve and a zero wait. Case 7 proves the verdict follows the
declaration and not the host: an impossible reserve refuses the item
at once and publishes it; control 7c declares a 6 s wait and the same
refusal takes at least 6 s. Without the declaration, case 7 fails
exactly its three assertions (case7-probe job).

Also rewrites three src comments that cited an episode id as the
intent they protect; the episode lives in the commit and the finding.

Refs: TASK-THYROX-0640, TASK-THYROX-0639
MSG
git log -1 --format='%h %an / %cn%n%s'
