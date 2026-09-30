#!/usr/bin/env bash
# Anulaciones de #106c: se retira cada mitad de juicio del núcleo OAuth.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
F="src/accounts/oauth"
run() { timeout 120 bun test __tests__/accounts/oauth 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 12: un payload sin email casa con una cuenta sin email"; annul "$F" "    if (!tokenData.email) return false
" ""
echo "== restaurado"; git -C "$T" status --short -- src/packages/provider/src/accounts/oauth; run
