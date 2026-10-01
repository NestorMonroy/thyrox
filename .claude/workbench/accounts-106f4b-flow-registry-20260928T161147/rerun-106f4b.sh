#!/usr/bin/env bash
# Anulaciones de 106f-4b: cada una retira una pieza y cuenta los `(fail)`.
T=/home/user/thyrox
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
P="$T/src/packages/provider/src" C="$T/src/packages/cli/src"
run() {
  local n
  n=$( { (cd "$T/src/packages/provider" && timeout 120 bun test ./__tests__/accounts/oauth/flowRegistry.test.ts 2>&1)
         (cd "$T/src/packages/cli" && timeout 120 bun test ./__tests__/providersCommands.test.ts ./__tests__/providersLoginVerb.test.ts 2>&1); } | grep -c '^(fail)')
  echo "   $n fail"
}
echo "== 1: agy comparte el flujo de antigravity"; annul "$P/accounts/oauth" "profile: 'cli', fetch" "profile: 'ide', fetch"
echo "== 3: kimi ignora la ruta declarada"; annul "$P/accounts/oauth" "path: deps.kimiDeviceIdPath ?? join" "path: join"
echo "== restaurado"; run
