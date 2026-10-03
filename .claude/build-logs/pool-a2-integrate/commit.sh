#!/usr/bin/env bash
# Commitea por tarea lo que pool_integrate aplicó del pool A2; un log por commit.
set -uo pipefail
cd /home/user/thyrox || exit 2
eval "$(bash bin/commit_identity env)"
O=.claude/workbench/task-census-20260930T064202/impl-pool-a/outputs-2
L=.claude/build-logs/pool-a2-integrate
commit_item() {
  local n=$1 task=$2 subject=$3 body=$4 extra=${5:-} files bench
  files=$(gawk '!/\.claude\/workbench/' "$O/$n.files")
  bench=$(ls -d .claude/workbench/task-thyrox-${task}-* 2>/dev/null)
  git add -N $bench $files $extra 2>/dev/null
  git commit -q -m "$subject" -m "$body

Refs: TASK-THYROX-$task, TASK-THYROX-0643" -- $bench $files $extra > "$L/commit-$task.log" 2>&1
  echo "$task rc=$?"
  gawk '/SIN DECLARAR|FAIL|ERROR|rechaz|remedio|deuda nueva|[1-9][0-9]* escritor/' "$L/commit-$task.log" | head -5
}
commit_item 5 0507 "Cover the sweep branch of the live session list" "The port of D3 (listAllLiveSessions) already existed; its sweep branch
had no red half and no negative control. Pool A2 verified the test;
in the main tree the uds suites pass."
commit_item 3 0448 "Deliver a peer's user message to the session queue" "inboxServer and inboxDelivery now hand a peer's user message to the
session queue the way 2.1.283 does; the bench records the symbols read
and the declared divergences. Pool A2 verified it; in the main tree the
uds suites pass and the typecheck is at zero."
commit_item 4 0600 "Add the ListAgents tool, alias ListPeers" "ListAgents lists the peers reachable over the UDS inbox, ported from
2.1.283 with its prompt, and is registered in the built-in tools. A
two-cli test starts two bin/cli sessions and checks each sees the
other. Pool A2 verified it; in the main tree its tests pass."
commit_item 7 0309 "Clear the stand-ins from six more packages" "memory, daemon, ide, provider, local-observability and bridge no
longer import from their pendingCrossPackageDeps stand-ins, checked
against 2.1.283. test_stand_ins_cleared closes with 11 packages cleared.
Pool A2 verified it; in the main tree the touched tests pass and the
typecheck of the ten packages is at zero. The two variables only the
stand-ins read leave the env test coverage baseline." src/verify/env_test_coverage_baseline.tsv
commit_item 8 0281 "Resolve file tool paths through a structured resolver" "fileToolPermissions resolves paths through a structured resolver and a
link landing layer, measured against 2.1.283 where the task named
2.1.281. Pool A2 verified it; in the main tree the permission and
storage tests pass. The call it adds to the existing
allowsClaudeConfigForMode raises the product-word baseline of
fileToolPermissions.ts from 14 to 15; renaming that symbol is its own
task." src/verify/product_word_baseline.tsv
commit_item 2 0624 "Publish closed pool items to the consumer docs" "documentation_publisher consumes <n>.closed: it reads the documentary
intent an item left (document_intent), resolves the consumer through
reach, and commits the body under the target's lock after the
consumer's own gates. headless-pool tells each item where to write its
intent and with which provenance. Pool A2 verified it; in the main tree
its suite and the headless-pool suite pass. The five variables it
exports are declared in .env.example, and a contract check ties the
names the pool exports to the ones document_intent reads." .env.example
