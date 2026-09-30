#!/usr/bin/env bash
# Anulaciones de #106e-5d-1: token LLM de Zed y catálogo de modelos.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
Z="src/accounts/zed/zedLlm.ts"
run() { timeout 120 bun test ./__tests__/accounts/zed/zedLlm.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: vida de una hora"; annul "$Z" "const LLM_TOKEN_TTL_MS = 50 * 60 * 1000" "const LLM_TOKEN_TTL_MS = 60 * 60 * 1000"
echo "== 2: catálogo de 50 min"; annul "$Z" "const MODEL_CACHE_TTL_MS = 60 * 60 * 1000" "const MODEL_CACHE_TTL_MS = 50 * 60 * 1000"
echo "== 3: sin 401"; annul "$Z" "response?.status === UNAUTHORIZED ||" ""
echo "== 4: sin cabecera caducada"; annul "$Z" "!!response?.headers?.has?.(ZED_HEADERS.expiredToken) ||" ""
echo "== 5: sin cabecera obsoleta"; annul "$Z" " || !!response?.headers?.has?.(ZED_HEADERS.outdatedToken)" ""
echo "== 6: id en arreglo"; annul "$Z" "    if (typeof record[0] === 'string') return record[0]" ""
echo "== 7: id en objeto"; annul "$Z" "    if (typeof record.id === 'string') return record.id" ""
echo "== 8: sin nombre camel"; annul "$Z" " || (model.displayName as string) || id," " || id,"
echo "== 9: esfuerzo sin vacío"; annul "$Z" "?? model.supportedEffortLevels ?? []," "?? model.supportedEffortLevels,"
echo "== 10: sin razón nula"; annul "$Z" "disabledReason: model.disabled_reason ?? null," "disabledReason: model.disabled_reason,"
echo "== 11: sin preguntar la organización"; annul "$Z" "    if (!organizationId) organizationId = resolveZedOrganizationId(credentials, await fetchZedAuthenticatedUser(fetch, credentials, config))" ""
echo "== 12: organización explícita ignorada"; annul "$Z" "let organizationId = options.organizationId || resolveZedOrganizationId(credentials)" "let organizationId = resolveZedOrganizationId(credentials)"
echo "== 13: clave sin token"; annul "$Z" "\${organizationId}:\${tokenTail(credentials)}\`" "\${organizationId}\`"
echo "== 14: forzar no fuerza"; annul "$Z" "if (!options.forceRefresh && cached && cached.expiresAt > now()) return cached.token" "if (cached && cached.expiresAt > now()) return cached.token"
echo "== 15: sin system id"; annul "$Z" "    if (systemId) headers[ZED_HEADERS.systemId] = systemId" ""
echo "== 16: base fija"; annul "$Z" "\${baseUrl(config.cloudBaseUrl, ZED_CLOUD_BASE_URL)}/client/llm_tokens" "\${ZED_CLOUD_BASE_URL}/client/llm_tokens"
echo "== 17: token en arreglo"; annul "$Z" "(raw as Record<string | number, unknown> | undefined)?.[0] || " ""
echo "== 18: sin token no falla"; annul "$Z" "    if (!token || typeof token !== 'string') throw new Error('Zed did not return an LLM token')" "    if (!token) return ''"
echo "== 19: error sin estado"; annul "$Z" "{ status: response.status, body: data }" "{ body: data }"
echo "== 20: error anidado"; annul "$Z" "(typeof nested === 'object' ? nested?.message : undefined) || " ""
echo "== 21: sin reintento"; annul "$Z" "return shouldRefreshZedLlmToken(response) ? send(true) : response" "return response"
echo "== 22: reintento sin forzar"; annul "$Z" "? send(true) : response" "? send(false) : response"
echo "== 23: cabeceras perdidas"; annul "$Z" "headers: { ...((options.fetchOptions?.headers as Record<string, string>) ?? {}), Authorization" "headers: { Authorization"
echo "== 24: base LLM fija"; annul "$Z" "baseUrl(options.config?.llmBaseUrl, ZED_LLM_BASE_URL)" "ZED_LLM_BASE_URL"
echo "== 25: sin xAI"; annul "$Z" ", [ZED_HEADERS.clientSupportsXai]: 'true'" ""
echo "== 26: fallo sin error"; annul "$Z" "      throw new Error(\`Zed models failed: \${response.status} \${text}\`)" ""
echo "== 27: desactivados dentro"; annul "$Z" "!!model && !model.isDisabled" "!!model"
echo "== 28: rawById con vacíos"; annul "$Z" "      if (id) rawById.set(id, raw)" "      rawById.set(id, raw)"
echo "== 29: recomendados con vacíos"; annul "$Z" "recommended.map(normalizeZedModelId).filter(Boolean)" "recommended.map(normalizeZedModelId)"
echo "== 30: rápido camel"; annul "$Z" "data?.default_fast_model ?? data?.defaultFastModel" "data?.default_fast_model"
echo "== 31: sin token de usuario"; annul "$Z" "    if (!credentials?.accessToken) return null" ""
echo "== 32: caché de catálogo ignorada"; annul "$Z" "    if (!options.forceRefresh && cached && cached.expiresAt > now()) return cached
" ""
echo "== 33: sin compartir en vuelo"; annul "$Z" "    if (existing && !options.forceRefresh) return existing" ""
echo "== 34: forzado comparte"; annul "$Z" "    if (existing && !options.forceRefresh) return existing" "    if (existing) return existing"
echo "== 35: limpiar deja tokens"; annul "$Z" "    llmTokens.clear()" ""
echo "== 36: limpiar deja modelos"; annul "$Z" "    models.clear()" ""
echo "== restaurado"; run
cd "$T/src/packages/provider" && bunx tsc -p tsconfig.build.json --noEmit | gawk '/error TS/'; echo BUILD_DONE
bunx tsc -p tsconfig.test.json --noEmit | gawk '/error TS/'; echo TEST_DONE
bun test __tests__/accounts __tests__/concurrency 2>&1 | tail -3
