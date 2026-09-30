#!/usr/bin/env bash
# Anulaciones de #106e-4b: despacho del refresco por proveedor.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
D="src/accounts/refresh"; GC="$D/googleClients.ts"; DI="$D/providerRefreshDispatch.ts"; PD="src/accounts/antigravity/projectDiscovery.ts"
run() { timeout 120 bun test ./__tests__/accounts/refresh/providerRefreshDispatch.test.ts ./__tests__/accounts/oauth/antigravityFlow.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 14: kimi sin host inyectado"; annul "$DI" "env, system: deps.system })" "env })"
echo "== 27: perfil fijo"; annul "$DI" "profile: normalizeClientProfile(data.clientProfile)," "profile: 'ide',"
echo "== restaurado"; run
