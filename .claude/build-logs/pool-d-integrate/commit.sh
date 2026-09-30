#!/usr/bin/env bash
# Commitea por tarea lo que pool_integrate aplicó del pool D; un log por commit.
set -uo pipefail
cd /home/user/thyrox || exit 2
eval "$(bash bin/commit_identity env)"
O=.claude/workbench/task-census-20260930T064202/impl-pool-d/outputs
L=.claude/build-logs/pool-d-integrate
commit_item() {
  local n=$1 task=$2 subject=$3 body=$4 extra=${5:-} files bench
  files=$(gawk '!/\.claude\/workbench/' "$O/$n.files")
  bench=$(ls -d .claude/workbench/task-thyrox-${task}-* 2>/dev/null)
  git add -N $bench $files $extra 2>/dev/null
  git commit -q -m "$subject" -m "$body

Refs: TASK-THYROX-$task, TASK-THYROX-0643" -- $bench $files $extra > "$L/commit-$task.log" 2>&1
  echo "$task rc=$?"
  gawk '/SIN DECLARAR|FAIL|ERROR|rechaz|remedio|sin prueba|obsoleta del|deuda nueva|[1-9][0-9]* escritor/' "$L/commit-$task.log" | head -5
}
commit_item 2 0449 "Cover the uds route of SendMessage and peer discovery" "The uds: route of SendMessage and the uds client's send and discovery
paths get the tests they lacked, with ListAgents (TASK-THYROX-0600)
already in HEAD. Pool D verified it; in the main tree both suites pass
and the typecheck of the touched packages is at zero."
commit_item 1 0251 "Treat command producer directories as sensitive paths" "pathSafety now marks a path under a command producer's directory as
sensitive, porting eqr and QGr of 2.1.283 on top of the structured
resolver of TASK-THYROX-0281. The installed plugins manager collects
the producer paths, and the bootstrap state exposes the inline plugin
roots. The WSL and device-prefix normalization of U7n is declared as a
divergence in the file. Pool D verified it; in the main tree the
permission and config tests pass and the typecheck of the six packages
is at zero. Its test now names THYROX_CODE_PLUGIN_CACHE_DIR, so the
variable leaves the env test coverage baseline." src/verify/env_test_coverage_baseline.tsv
commit_item 3 0645 "Link the main tree's shared dirs into item worktrees" "An item worktree is a git checkout: node_modules, .venv and dist are
ignored and do not arrive. The worktree lives inside the main tree, so
Node resolution climbed to the main node_modules and typed the item
against the main tree's code: repl rose from 0 to 28 errors against a
stale agent (H-THYROX-287). Without .venv every bin/* warned on stderr
and broke two user_wiring cases.

prepare now links node_modules, .venv and src/packages/*/node_modules
from the main tree, a port of worktree.symlinkDirectories of 2.1.283.
node_modules gets a shadow whose workspace links point inside the
worktree, because a plain link would still resolve in the main tree.
The links stay out of the item's patch through a worktree-only
excludesFile. THYROX_ITEM_WORKTREE_LINK sets the list and is declared
in .env.example.

The item ran out of its 7200 s budget with the work half done. Three
defects were fixed by hand: a local that expanded top and worktree
before assigning them, link detection that did not descend into scope
directories, and a glob expanded against the caller's cwd. The suite
passes 19 of 19, test-headless-pool-worktree 46 of 46, and the
lifecycle suite passes. Null controls: without link_shared_dirs 11/19,
with a plain link 17/19, without exclude_links 16/19." .env.example
