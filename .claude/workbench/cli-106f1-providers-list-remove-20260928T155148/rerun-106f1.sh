#!/usr/bin/env bash
# Anulaciones de #106f-1: hogar del store y `thyrox providers list|remove`.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages"
H="provider/src/accounts/connectionStoreHome.ts"
S="cli/src/commands/providers/connectionSelector.ts"
P="cli/src/commands/providers/publicConnection.ts"
C="cli/src/commands/providers-commands.ts"
M="cli/src/entry/detect-mode.ts"
run() { (cd provider && timeout 120 bun test ./__tests__/accounts/connectionStoreHome.test.ts 2>&1; cd ../cli && timeout 120 bun test ./__tests__/providersCommands.test.ts 2>&1) | gawk '/^\(fail\)/{n++} END{print " " n+0 " fail"}'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 4: sin chmod"; annul "$H" "  fs.chmodSync(dir, OWNER_ONLY)
" ""
echo "== 7: sin id exacto"; annul "$S" "    selectUnique(rows.filter(row => text(row.id) === needle)) ??
" ""
echo "== 11: sin minúsculas"; annul "$S" "String(value ?? '').toLowerCase()" "String(value ?? '')"
echo "== restaurado"; run
