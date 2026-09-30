#!/usr/bin/env bash
# Anulaciones de #106e-4b: despacho del refresco por proveedor.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
D="src/accounts/refresh"; GC="$D/googleClients.ts"; DI="$D/providerRefreshDispatch.ts"; PD="src/accounts/antigravity/projectDiscovery.ts"
run() { timeout 120 bun test ./__tests__/accounts/refresh/providerRefreshDispatch.test.ts ./__tests__/accounts/oauth/antigravityFlow.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: agy es gemini"; annul "$GC" "(provider === 'gemini' ? 'gemini' : 'antigravity')" "(provider === 'antigravity' ? 'antigravity' : 'gemini')"
echo "== 2: medio cliente vale"; annul "$GC" "return clientId && clientSecret ? { clientId, clientSecret } : null" "return clientId ? { clientId, clientSecret: clientSecret ?? '' } : null"
echo "== 3: configurado sin secreto"; annul "$GC" "clientSecret: readVariable(env, secretVariable) ?? undefined }" "clientSecret: undefined }"
echo "== 4: error sin variables"; annul "$GC" "    throw new Error(\`\${idVariable} and \${secretVariable} are not set" "    throw new Error(\`client not set"
echo "== 5: builtin de gemini ignorado"; annul "$GC" "  for (const family of ['antigravity', 'gemini'] as const) {" "  for (const family of ['antigravity'] as const) {"
echo "== 6: retirado se refresca"; annul "$DI" "    if (deprecated) return deprecated" ""
echo "== 7: gemini sin cliente de Google"; annul "$DI" "      case 'gemini':
      case 'antigravity':" "      case 'antigravity':"
echo "== 8: amazon-q al genérico"; annul "$DI" "      case 'amazon-q':
" ""
echo "== 9: clinepass al genérico"; annul "$DI" "      case 'clinepass':
" ""
echo "== 10: github sin secreto"; annul "$DI" "clientSecret: readVariable(env, 'THYROX_GITHUB_OAUTH_CLIENT_SECRET') })" "clientSecret: null })"
echo "== 11: kiro sin datos"; annul "$DI" "return refreshKiroToken(refreshToken, data," "return refreshKiroToken(refreshToken, null,"
echo "== 12: gitlab sin datos"; annul "$DI" "return refreshGitLabDuoToken(refreshToken, data," "return refreshGitLabDuoToken(refreshToken, null,"
echo "== 13: kimi sin datos"; annul "$DI" "return refreshKimiCodingToken(refreshToken, data," "return refreshKimiCodingToken(refreshToken, null,"
echo "== 14: kimi sin host inyectado"; annul "$DI" "env, system: deps.system })" "env })"
echo "== 15: genérico sin extremo"; annul "$DI" "return refreshWithTokenEndpoint(provider, refreshToken, deps.genericEndpoint?.(provider) ?? null, base)" "return null"
echo "== 16: gemini recupera proyecto"; annul "$DI" "&& PROJECT_PROVIDERS.has(provider)) return recoverProject" ") return recoverProject"
echo "== 17: fallo recupera proyecto"; annul "$DI" "if (result && 'accessToken' in result && result.accessToken && PROJECT" "if (result && PROJECT"
echo "== 18: manual se redescubre"; annul "$DI" "if (data.isProjectIdManual || isUsableProjectId" "if (isUsableProjectId"
echo "== 19: columna de proyecto ignorada"; annul "$DI" "isUsableProjectId(credentials.projectId) || " ""
echo "== 20: proyecto de datos ignorado"; annul "$DI" " || isUsableProjectId(data.projectId)) return result" ") return result"
echo "== 21: proyecto en blanco vale"; annul "$DI" "      if (!isUsableProjectId(discovered)) return result" "      if (!discovered) return result"
echo "== 22: sin guardar"; annul "$DI" "      if (credentials.connectionId) await deps.persistProjectId?.(credentials.connectionId, discovered, data)" ""
echo "== 23: guarda sin conexión"; annul "$DI" "      if (credentials.connectionId) await deps.persistProjectId" "      await deps.persistProjectId"
echo "== 24: fallo de descubrimiento lanza"; annul "$DI" "      log?.warn?.('TOKEN', \`Antigravity projectId discovery failed" "      throw error
      log?.warn?.('TOKEN', \`Antigravity projectId discovery failed"
echo "== 25: datos previos perdidos"; annul "$DI" "providerSpecificData: { ...data, ...((result" "providerSpecificData: { ...((result"
echo "== 26: sin projectId en la raíz"; annul "$DI" "const recovered = { ...result, projectId: discovered, providerSpecificData" "const recovered = { ...result, providerSpecificData"
echo "== 27: perfil fijo"; annul "$DI" "profile: normalizeClientProfile(data.clientProfile)," "profile: 'ide',"
echo "== 28: soporte sin lista"; annul "$DI" "    if (SUPPORTED_PROVIDERS.has(provider)) return true" ""
echo "== 29: extremo vacío soporta"; annul "$DI" "    return Boolean(endpoint?.refreshUrl || endpoint?.tokenUrl)" "    return Boolean(endpoint)"
echo "== 30: proyecto en blanco usable"; annul "$PD" "  return typeof value === 'string' && value.trim() !== ''" "  return typeof value === 'string' && value !== ''"
echo "== restaurado"; run
