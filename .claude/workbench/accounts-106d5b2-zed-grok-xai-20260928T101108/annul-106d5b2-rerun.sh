#!/usr/bin/env bash
# Re-medición de 10 y 37 de #106d-5b-2 con las pruebas afinadas.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
A="src/accounts"; Z="$A/zed/zedNativeAuth.ts"; ZF="$A/oauth/flows/zedHostedFlow.ts"; X="$A/oauth/flows/xaiOAuthFlow.ts"
G="$A/oauth/flows/grokCliFlow.ts"; GT="$A/grok/grokTokens.ts"; GB="$A/grok/grokBuild.ts"
run() { timeout 120 bun test __tests__/accounts/oauth/zedGrokXaiFlows.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 10: sin el login de github como nombre"; annul "$ZF" "name = text(userInfo?.name) || text(userInfo?.github_login)" "name = text(userInfo?.name)"
echo "== 37: la URL de verificación completa se ignora"; annul "$G" "typeof data.verification_uri_complete === 'string' ? data.verification_uri_complete : data.verification_uri" "data.verification_uri"
echo "== restaurado"; git -C "$T" status --short -- src/packages/provider/src/accounts; run
