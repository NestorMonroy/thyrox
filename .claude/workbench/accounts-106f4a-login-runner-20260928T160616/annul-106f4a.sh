#!/usr/bin/env bash
# Anulaciones de #106f-4a: corredor de inicio de sesión OAuth.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
G="src/accounts/oauth/loginRunner.ts"
run() { timeout 120 bun test ./__tests__/accounts/oauth/loginRunner.test.ts 2>&1 | gawk '/^\(fail\)/{n++} /^ *[0-9]+ pass$/{p=1} END{print " " (p ? n+0 : "SIN-RESUMEN") " fail"}'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: sin puerto fijo"; annul "$G" "fixedPort: flow.fixedPort ?? null, timeoutMs" "fixedPort: null, timeoutMs"
echo "== 2: sin timeout al callback"; annul "$G" "{ fixedPort: flow.fixedPort ?? null, timeoutMs }" "{ fixedPort: flow.fixedPort ?? null }"
echo "== 3: ruta de callback fija"; annul "$G" "\${flow.callbackPath || '/callback'}" "/callback"
echo "== 4: sin navegador"; annul "$G" "    if (options.browser !== false) await deps.openBrowser(auth.authUrl)" "    void auth"
echo "== 5: navegador siempre"; annul "$G" "    if (options.browser !== false) await deps.openBrowser(auth.authUrl)" "    await deps.openBrowser(auth.authUrl)"
echo "== 6: timeout sin marca"; annul "$G" "message === CALLBACK_TIMEOUT ? { ok: false, error: message, timedOut: true } : " ""
echo "== 7: error del proveedor ignorado"; annul "$G" "    if (params.error) return { ok: false, error: params.error_description || params.error }" "    void params.error"
echo "== 8: sin descripción del error"; annul "$G" "params.error_description || params.error" "params.error"
echo "== 9: sin código aceptado"; annul "$G" "    if (!params.code) return" "    if (false) return"
echo "== 10: sin verificar state"; annul "$G" "    if (auth.state && !safeEqual(params.state, auth.state)) return" "    if (false) return"
echo "== 11: servidor abierto"; annul "$G" "    server.close()" "    void server"
echo "== 12: PKCE a todos"; annul "$G" "  const usesPkce = !NO_PKCE_DEVICE_CODE_PROVIDERS.has(provider)" "  const usesPkce = true"
echo "== 13: sin reto PKCE"; annul "$G" "usesPkce ? auth.codeChallenge ?? '' : ''" "''"
echo "== 14: sin dato extra de kiro"; annul "$G" "DEVICE_ANSWER_AS_EXTRA.has(provider) ? device : undefined" "undefined"
echo "== 15: sin código de dispositivo aceptado"; annul "$G" "  if (!deviceCode) return" "  if (false) return"
echo "== 16: sin página completa"; annul "$G" "text(device.verificationUriComplete) ?? text(device.verification_uri_complete) ?? " ""
echo "== 17: sin código de usuario"; annul "$G" "userCode ? \`Device code: \${userCode}\nVisit: \${page ?? ''}\n\` : " ""
echo "== 18: intervalo por defecto"; annul "$G" "const DEFAULT_DEVICE_INTERVAL_SECONDS = 5" "const DEFAULT_DEVICE_INTERVAL_SECONDS = 1"
echo "== 19: intervalo del proveedor ignorado"; annul "$G" "(typeof device.interval === 'number' ? device.interval : DEFAULT_DEVICE_INTERVAL_SECONDS)" "DEFAULT_DEVICE_INTERVAL_SECONDS"
echo "== 20: slow_down sin frenar"; annul "$G" "      intervalMs += SLOW_DOWN_STEP_MS" "      void SLOW_DOWN_STEP_MS"
echo "== 21: pendiente termina"; annul "$G" "    if (outcome.pending) continue" "    if (false) continue"
echo "== 22: sin plazo"; annul "$G" "  while (deps.now() < deadline) {" "  while (deps.now() < deadline + 1e12) {"
echo "== 23: error sin descripción"; annul "$G" "String(outcome.errorDescription ?? outcome.error)" "String(outcome.error)"
echo "== 24: token vacío aceptado"; annul "$G" "  if (!token) return { ok: false, error: 'A token is required' }" "  void token"
echo "== 25: token sin validar"; annul "$G" "  if (check && !check.valid) return" "  if (false) return"
echo "== 26: token sin recortar"; annul "$G" "(await deps.readToken()).trim()" "(await deps.readToken())"
echo "== 27: sin mensaje de éxito"; annul "$G" "  deps.write(\`Authorized: " "  void (\`Authorized: "
echo "== 28: excepción sin capturar"; annul "$G" "  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}" "  } finally {
    void 0
  }
}"
echo "== restaurado"; run
