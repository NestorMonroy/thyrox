#!/usr/bin/env bash
# Anulaciones de #106e-4c: serializador por familia y orquestador del refresco.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
D="src/accounts/refresh"; SE="$D/refreshSerializer.ts"; TR="$D/tokenRefresh.ts"
run() { timeout 120 bun test ./__tests__/accounts/refresh/tokenRefresh.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 10: pausa cero se duerme"; annul "$SE" "        if (spacing > 0) await sleep(spacing)" "        await sleep(spacing)"
echo "== 18: recuerda sin refresh token"; annul "$TR" "if (hasAccessToken(result) && result.refreshToken && !('error' in result)) rotations.record" "if (result) rotations.record"
echo "== restaurado"; run
