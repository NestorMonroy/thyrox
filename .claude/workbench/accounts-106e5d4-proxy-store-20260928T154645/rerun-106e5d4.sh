#!/usr/bin/env bash
# Anulaciones de #106e-5d-4: el proxy local lee credenciales del store.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
G="src/proxy/startServer.ts"
S="src/proxy/server.ts"
run() { timeout 180 bun test ./__tests__/proxyStartServer.test.ts ./__tests__/proxyServer.test.ts ./__tests__/proxyServerCooldown.test.ts ./__tests__/proxyModelCooldownCause.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 5: store leído una vez"; annul "$G" "    const pool = connectionProxyCredentials(connections.list({ provider }), Date.now())[provider] ?? []" "    const once = ((globalThis as Record<string, unknown>).storeOnce ??= {}) as Record<string, ProxyCredential[]>
    const pool = (once[provider] ??= connectionProxyCredentials(connections.list({ provider }), Date.now())[provider] ?? [])"
echo "== restaurado"; run
