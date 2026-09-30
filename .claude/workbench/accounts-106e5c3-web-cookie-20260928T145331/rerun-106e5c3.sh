#!/usr/bin/env bash
# Anulaciones de #106e-5c-3: cookies web en el refresco proactivo.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
P="src/accounts/webCookie/webCookieProviders.ts"
Z="src/accounts/webCookie/zaiToken.ts"
V="src/accounts/webCookie/webCookieProbe.ts"
H="src/accounts/refresh/health/webCookieHealthCheck.ts"
run() { timeout 120 bun test ./__tests__/accounts/webCookie ./__tests__/accounts/refresh/health/webCookieHealthCheck.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 9: prefijo Cookie"; annul "$Z" "const cookie = withoutCookiePrefix(trimmed)" "const cookie = trimmed"
echo "== 26: error sin sanear"; annul "$V" "(message ? sanitizeErrorMessage(message) : '')" "(message ? String(message) : '')"
echo "== restaurado"; run
