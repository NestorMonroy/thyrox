#!/usr/bin/env bash
# Anulaciones de #106e-5c-4a: credenciales de Cursor en el anfitrión, cursor-agent y el candado por clave.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
M="src/concurrency/keyedMutex.ts"
A="src/accounts/cursor/cursorAgent.ts"
X="src/accounts/cursor/cursorTokenExtractor.ts"
run() { timeout 150 bun test ./__tests__/accounts/cursor/cursorTokenExtractor.test.ts ./__tests__/accounts/cursor/cursorAgent.test.ts ./__tests__/concurrency 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 21: sin buscar binario"; annul "$A" "options.binary || (options.resolveBinary ?? resolveCursorAgentBinary)()" "options.binary"
echo "== 27: refresh como access"; annul "$X" "lower.includes('refreshtoken') && !lower.includes('accesstoken')" "lower.includes('refreshtoken')"
echo "== restaurado"; run
