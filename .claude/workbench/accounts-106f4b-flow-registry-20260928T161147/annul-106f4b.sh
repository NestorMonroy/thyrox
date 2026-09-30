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
echo "== 2: amazon-q sin alias de kiro"; annul "$P/accounts/oauth" "    'amazon-q': kiro," "    'amazon-q': createKiroFlow({ config: kiroOAuthConfig(), fetch }),"
echo "== 3: kimi ignora la ruta declarada"; annul "$P/accounts/oauth" "path: deps.kimiDeviceIdPath ?? join" "path: join"
echo "== 4: sin rechazo de proveedor desconocido"; annul "$C/commands/providers" "  if (!deps.providers.includes(provider)) {" "  if (false) {"
echo "== 5: --no-browser ignorado"; annul "$C/commands/providers" "browser: !hasFlag(args, 'no-browser')" "browser: true"
echo "== 6: timeout sin validar"; annul "$C/commands/providers" "if (!/^\d+\$/.test(timeout) || timeoutMs < 1) {" "if (false) {"
echo "== 7: plazo vencido como fallo genérico"; annul "$C/commands/providers" "outcome.timedOut ? EXIT_TIMEOUT : EXIT_FAIL" "EXIT_FAIL"
echo "== 8: --connection de otro proveedor aceptada"; annul "$C/commands/providers" "    if (connection.provider !== provider) {" "    if (false) {"
echo "== 9: login no despachado"; annul "$C/commands" "      case 'login':" "      case 'login-off' as never:"
echo "== 10: login sin el store abierto"; annul "$C/commands" "login: options => deps.login(opened.store, options)" "login: options => deps.login({ list: () => [], create: () => null, update: () => null }, options)"
echo "== restaurado"; run
