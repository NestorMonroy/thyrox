#!/usr/bin/env bash
# Anulaciones de #106d-2: se retira cada mitad de juicio del flujo antigravity.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
F="src/accounts"
run() { timeout 120 bun test __tests__/accounts/oauth/antigravityFlow.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 12: tras el onboarding no se vuelve a consultar"; annul "$F" "      const retry = await fetchFirstOk(config.loadCodeAssistEndpoints, loadInit)
      projectId = extractProjectId((await retry.json()) as JsonRecord)" ""
echo "== restaurado"; git -C "$T" status --short -- src/packages/provider/src/accounts; run
