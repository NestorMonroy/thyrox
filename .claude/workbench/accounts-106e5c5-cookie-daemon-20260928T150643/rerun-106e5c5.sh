#!/usr/bin/env bash
# Anulaciones de #106e-5c-5: configuraciones de extracción y demonio de vigencia.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
C="src/accounts/webCookie/tokenExtractionConfig.ts"
D="src/accounts/webCookie/autoRefreshDaemon.ts"
run() { timeout 120 bun test ./__tests__/accounts/webCookie/tokenExtractionConfig.test.ts ./__tests__/accounts/webCookie/autoRefreshDaemon.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 24: reinicio sin parar"; annul "$D" "      stop()
      start()" "      start()"
echo "== 25: estado comparte lista"; annul "$D" "expiredCredentials: [...expired]" "expiredCredentials: expired"
echo "== restaurado"; run
