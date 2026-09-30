#!/usr/bin/env bash
# Anulaciones de #106e-3: refrescadores del lote B.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
D="src/accounts/refresh/providers"; RR="$D/refreshResult.ts"; RT="$D/rotatingTokenRefresh.ts"; CX="$D/codexRefresh.ts"; OF="$D/openferenceRefresh.ts"; CU="$D/cursorRefresh.ts"; KI="$D/kimiCodingRefresh.ts"; MU="$D/museCodeRefresh.ts"; KR="$D/kiroRefresh.ts"
run() { timeout 120 bun test ./__tests__/accounts/refresh/providerRefreshersB.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 11: codex url fija"; annul "$CX" "tokenUrl: deps.config.tokenUrl," "tokenUrl: 'https://auth.openai.com/oauth/token',"
echo "== 24: cursor reintento en el último"; annul "$CU" "    if (!RETRYABLE_STATUSES.has(response.status) || lastAttempt) {" "    if (!RETRYABLE_STATUSES.has(response.status)) {"
echo "== 39: kiro idp config lanza"; annul "$KR" "        log?.error?.('TOKEN_REFRESH', \`Invalid Kiro external_idp refresh config" "        throw error
        log?.error?.('TOKEN_REFRESH', \`Invalid Kiro external_idp refresh config"
echo "== restaurado"; run
