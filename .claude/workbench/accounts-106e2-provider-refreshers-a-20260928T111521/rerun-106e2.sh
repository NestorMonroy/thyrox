#!/usr/bin/env bash
# Anulaciones de #106e-2: refrescadores del lote A.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
D="src/accounts/refresh/providers"; RR="$D/refreshResult.ts"; AN="$D/anthropicRefresh.ts"; GH="$D/githubRefresh.ts"; CP="$D/copilotRefresh.ts"; GO="$D/googleRefresh.ts"; GL="$D/gitlabDuoRefresh.ts"; QO="$D/qoderRefresh.ts"; CL="$D/clineRefresh.ts"; CB="$D/codebuddyCnRefresh.ts"
run() { timeout 120 bun test ./__tests__/accounts/refresh/providerRefreshersA.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 55: codebuddy rechazo se lee"; annul "$CB" "    if (!response.ok) {
      deps.log" "    if (false) {
      deps.log"
echo "== restaurado"; run
