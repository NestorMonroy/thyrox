#!/usr/bin/env bash
# Anulaciones de #106d-6e-1: servicio de cuentas de Kiro e IdP externo.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
E="src/accounts/kiro/kiroExternalIdp.ts"; S="src/accounts/kiro/kiroService.ts"
run() { timeout 120 bun test ./__tests__/accounts/kiro/kiroService.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 26: OIDC sin secreto"; annul "$S" "if (clientId && clientSecret && data.authMethod" "if (clientId && data.authMethod"
echo "== 58: clave — sin validar la región"; annul "$S" "    assertValidAwsRegion(region)
    const accessToken = apiKey.trim()" "    const accessToken = apiKey.trim()"
echo "== restaurado"; run
