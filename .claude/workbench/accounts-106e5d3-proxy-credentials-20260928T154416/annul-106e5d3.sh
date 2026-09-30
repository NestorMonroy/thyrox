#!/usr/bin/env bash
# Anulaciones de #106e-5d-3: conexiones como credenciales del proxy local.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
G="src/accounts/proxyCredentials.ts"
run() { timeout 120 bun test ./__tests__/accounts/proxyCredentials.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: sin créditos agotados"; annul "$G" "['credits_exhausted', 'banned', 'expired']" "['banned', 'expired']"
echo "== 2: sin baneada"; annul "$G" "['credits_exhausted', 'banned', 'expired']" "['credits_exhausted', 'expired']"
echo "== 3: sin caducada"; annul "$G" "['credits_exhausted', 'banned', 'expired']" "['credits_exhausted', 'banned']"
echo "== 4: sin recorte"; annul "$G" "testStatus.trim().toLowerCase()" "testStatus.toLowerCase()"
echo "== 5: sin minúsculas"; annul "$G" "testStatus.trim().toLowerCase()" "testStatus.trim()"
echo "== 6: prioridad sin invertir"; annul "$G" "String(0 - priority)" "String(priority)"
echo "== 7: prioridad por defecto"; annul "$G" ": 0
  const attributes" ": 5
  const attributes"
echo "== 8: clave en blanco"; annul "$G" "value.trim() !== ''" "value !== ''"
echo "== 9: sin api_key"; annul "$G" "  if (nonBlank(row.apiKey)) attributes.api_key = row.apiKey
" ""
echo "== 10: sin access_token"; annul "$G" "  if (nonBlank(row.accessToken)) metadata.access_token = row.accessToken
" ""
echo "== 11: sin proyecto"; annul "$G" "  if (nonBlank(row.projectId)) metadata.project_id = row.projectId
" ""
echo "== 12: inactiva habilitada"; annul "$G" "row.isActive === false || " ""
echo "== 13: terminal habilitada"; annul "$G" " || isTerminalConnectionStatus(row.testStatus)" ""
echo "== 14: sin tokenExpiresAt"; annul "$G" "parseDate(row.tokenExpiresAt) ?? " ""
echo "== 15: sin expiresAt"; annul "$G" " ?? parseDate(row.expiresAt)" ""
echo "== 16: fecha inválida"; annul "$G" "Number.isNaN(ms) ? undefined : " ""
echo "== 17: enfriamiento vencido cuenta"; annul "$G" "cooldownUntil && cooldownUntil.getTime() > nowMs" "cooldownUntil"
echo "== 18: sin nextRetryAfter"; annul "$G" "    credential.nextRetryAfter = cooldownUntil
" ""
echo "== 19: fila sin id"; annul "$G" "!nonBlank(row.id) || " ""
echo "== 20: fila sin proveedor"; annul "$G" " || !nonBlank(row.provider)) continue" ") continue"
echo "== 21: sin proveedor en atributos"; annul "$G" " provider: String(row.provider)," ""
echo "== restaurado"; run
