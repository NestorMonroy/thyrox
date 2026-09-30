#!/usr/bin/env bash
# Anulaciones de #106f-4a: corredor de inicio de sesión OAuth.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
G="src/accounts/oauth/loginRunner.ts"
run() { timeout 120 bun test ./__tests__/accounts/oauth/loginRunner.test.ts 2>&1 | gawk '/^\(fail\)/{n++} /^ *[0-9]+ pass$/{p=1} END{print " " (p ? n+0 : "SIN-RESUMEN") " fail"}'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 16: sin página completa"; annul "$G" "text(device.verificationUriComplete) ?? text(device.verification_uri_complete) ?? " ""
echo "== 22: sin plazo"; annul "$G" "  while (deps.now() < deadline) {" "  while (deps.now() < deadline + 1e12) {"
echo "== restaurado"; run
