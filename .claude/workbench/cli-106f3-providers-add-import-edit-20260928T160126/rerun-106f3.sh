#!/usr/bin/env bash
# Anulaciones de #106f-3: add, edit, import y el prompt oculto.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/cli"
D=src/commands/providers
run() { timeout 150 bun test ./__tests__/providersWriteVerbs.test.ts ./__tests__/providersSecretPrompt.test.ts 2>&1 | gawk '/^\(fail\)/{n++} END{print " " n+0 " fail"}'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 38: Ctrl-C aceptado"; annul "$D/secretPrompt.ts" "        if (char === CTRL_C) return finish(() => reject(new Error('Credential prompt cancelled.')))" ""
echo "== restaurado"; run
