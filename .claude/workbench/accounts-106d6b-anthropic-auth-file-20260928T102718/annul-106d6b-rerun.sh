#!/usr/bin/env bash
# Re-medición de 26 de #106d-6b con el error del bootstrap en JSON.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
AF="src/accounts/imports/anthropicAuthFile.ts"; AI="src/accounts/imports/anthropicAuthImport.ts"
run() { timeout 120 bun test ./__tests__/accounts/imports/anthropicAuthFile.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 26: un bootstrap caído rompe la importación"; annul "$AI" "    if (!response.ok) return base" "    void 0"
echo "== restaurado"; git -C "$T" status --short -- src/packages/provider/src/accounts/imports; run
