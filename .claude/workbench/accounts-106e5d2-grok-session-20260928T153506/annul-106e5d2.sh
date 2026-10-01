#!/usr/bin/env bash
# Anulaciones de #106e-5d-2: cabeceras de sesión de Grok Build.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
G="src/accounts/grok/grokBuildSession.ts"
run() { timeout 120 bun test ./__tests__/accounts/grok/grokBuildSession.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: sin nombre macos"; annul "$G" "{ darwin: 'macos', win32: 'windows' }" "{ win32: 'windows' }"
echo "== 2: sin nombre windows"; annul "$G" "{ darwin: 'macos', win32: 'windows' }" "{ darwin: 'macos' }"
echo "== 3: sin aarch64"; annul "$G" "{ arm64: 'aarch64', x64: 'x86_64' }" "{ x64: 'x86_64' }"
echo "== 4: sin x86_64"; annul "$G" "{ arm64: 'aarch64', x64: 'x86_64' }" "{ arm64: 'aarch64' }"
echo "== 5: desconocida vacía"; annul "$G" "?? system.platform}; " "?? ''}; "
echo "== 6: modo interactivo por defecto"; annul "$G" "export function grokBuildClientHeaders(clientMode: GrokBuildClientMode = 'headless'" "export function grokBuildClientHeaders(clientMode: GrokBuildClientMode = 'interactive'"
echo "== 7: modo ignorado"; annul "$G" "'x-grok-client-mode': clientMode," "'x-grok-client-mode': 'headless',"
echo "== 8: stream sin SSE"; annul "$G" "Accept: stream ? 'text/event-stream' : 'application/json'," "Accept: 'application/json',"
echo "== 9: sin token auth"; annul "$G" "    'X-XAI-Token-Auth': GROK_BUILD_TOKEN_AUTH,
    'x-authenticateresponse'" "    'x-authenticateresponse'"
echo "== 10: sin authenticate-response"; annul "$G" "    'x-authenticateresponse': 'authenticate-response'," ""
echo "== 11: sin modelo"; annul "$G" "    ...(model ? { 'x-grok-model-override': model } : {})," ""
echo "== 12: usuario una vez"; annul "$G" "{ 'x-userid': userId, 'x-grok-user-id': userId }" "{ 'x-userid': userId }"
echo "== 13: correo de equipo"; annul "$G" "type === 'team' || type === 'organization'" "type === 'organization'"
echo "== 14: correo de organización"; annul "$G" "type === 'team' || type === 'organization'" "type === 'team'"
echo "== 15: tipo sin recortar"; annul "$G" "principalType?.trim().toLowerCase()" "principalType?.toLowerCase()"
echo "== 16: tipo sensible a caja"; annul "$G" "principalType?.trim().toLowerCase()" "principalType?.trim()"
echo "== 17: modelos interactivos"; annul "$G" "    ...grokBuildClientHeaders('headless', system),
    'X-XAI-Token-Auth': GROK_BUILD_TOKEN_AUTH,
    ...(token" "    ...grokBuildClientHeaders('interactive', system),
    'X-XAI-Token-Auth': GROK_BUILD_TOKEN_AUTH,
    ...(token"
echo "== 18: modelos sin correo"; annul "$G" "    ...(userId ? { 'x-userid': userId } : {}),
    ...(sentEmail ? { 'x-email': sentEmail } : {})," "    ...(userId ? { 'x-userid': userId } : {}),"
echo "== restaurado"; run
