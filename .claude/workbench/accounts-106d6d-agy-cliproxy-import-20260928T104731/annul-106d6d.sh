#!/usr/bin/env bash
# Anulaciones de #106d-6d: importación de agy y de CLIProxyAPI.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
A="src/accounts/imports/agyAuthImport.ts"; C="src/accounts/imports/cliProxyAuthImport.ts"
run() { timeout 120 bun test ./__tests__/accounts/imports/agyAndCliProxyImport.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: sin el anidado .token"; annul "$A" "const token = doc.token && typeof doc.token === 'object' ? toRecord(doc.token) : doc" "const token = doc"
echo "== 2: sin access token se acepta"; annul "$A" "  if (!accessToken) throw" "  if (false) throw"
echo "== 3: sin refresh token se acepta"; annul "$A" "  if (!refreshToken) throw" "  if (false) throw"
echo "== 4: sin expires_at"; annul "$A" "toNonEmptyString(token.expiry) ?? toNonEmptyString(token.expires_at)" "toNonEmptyString(token.expiry)"
echo "== 5: un ISO ilegible pasa"; annul "$A" "expiresAt = Number.isNaN(ms) ? null : new Date(ms).toISOString()" "expiresAt = Number.isNaN(ms) ? isoExpiry : new Date(ms).toISOString()"
echo "== 6: sin expiry_date"; annul "$A" "  } else if (typeof token.expiry_date === 'number' && Number.isFinite(token.expiry_date)) {" "  } else if (false) {"
echo "== 7: el tipo de token fijo"; annul "$A" "tokenType: toNonEmptyString(token.token_type) ?? 'Bearer'" "tokenType: 'Bearer'"
echo "== 8: el método sólo del documento"; annul "$A" "authMethod: toNonEmptyString(doc.auth_method) ?? toNonEmptyString(token.auth_method)," "authMethod: toNonEmptyString(doc.auth_method),"
echo "== 9: userinfo sin ?alt=json"; annul "$A" "userInfoUrl}?alt=json\`" "userInfoUrl}\`"
echo "== 10: un userinfo fallido nombra la cuenta"; annul "$A" "return response.ok ? toNonEmptyString(toRecord(await response.json()).email) : null" "return toNonEmptyString(toRecord(await response.json()).email)"
echo "== 11: loadCodeAssist fallido se lee"; annul "$A" "          if (!response.ok) continue" "          void 0"
echo "== 12: el proyecto sólo como texto"; annul "$A" " ?? toNonEmptyString(toRecord(declared).id)" ""
echo "== 13: sin el nivel"; annul "$A" "return { projectId, tier: codeAssistOnboardTierId(data) }" "return { projectId, tier: null }"
echo "== 14: sin metadatos"; annul "$A" "body: JSON.stringify({ metadata })" "body: JSON.stringify({})"
echo "== 15: otro perfil de cliente"; annul "$A" "const headers = codeAssistHeaders(CLI_PROFILE, versions, parsed.accessToken)" "const headers = codeAssistHeaders('ide', versions, parsed.accessToken)"
echo "== 16: sin plazo"; annul "$A" "  const timer = setTimeout(() => controller.abort(), timeoutMs)" "  const timer = setTimeout(() => {}, timeoutMs)"
echo "== 17: la cuenta distingue mayúsculas"; annul "$A" "toNonEmptyString(connection.email)?.toLowerCase() === wanted" "toNonEmptyString(connection.email) === email"
echo "== 18: el duplicado se sobrescribe solo"; annul "$A" "      if (!options.overwriteExisting) {
        throw new AuthFileError('An Antigravity" "      if (false) {
        throw new AuthFileError('An Antigravity"
echo "== 19: la elección del operador se pierde"; annul "$A" "          autoSync: true,
          ...existingData," "          ...existingData,
          autoSync: true,"
echo "== 20: el cliente OAuth guardado gana"; annul "$A" "          ...existingData,
          ...tokenData(enriched, importedAt)," "          ...tokenData(enriched, importedAt),
          ...existingData,"
echo "== 21: el proyecto conocido se pierde"; annul "$A" "projectId: enriched.projectId ?? existingData.projectId," "projectId: enriched.projectId,"
echo "== 22: el nivel conocido se pierde"; annul "$A" "tier: enriched.tier ?? existingData.tier," "tier: enriched.tier,"
echo "== 23: el nombre guardado se pierde"; annul "$A" "name: options.name || (existing.name as string | undefined) || email," "name: options.name || email,"
echo "== 24: sin identidad se importa"; annul "$A" "  } else if (!options.overwriteExisting) {" "  } else if (false) {"
echo "== 25: sin proyecto no se degrada"; annul "$A" "        ...projectStatus(enriched),
        isActive: true," "        isActive: true,"
echo "== 26: una conexión nueva sin proyecto no se degrada"; annul "$A" "    isActive: true,
    ...projectStatus(enriched)," "    isActive: true,"
echo "== 27: el correo declarado no gana"; annul "$A" "  const email = options.email || enriched.email" "  const email = enriched.email || options.email"
echo "== 28: sin autoSync en lo nuevo"; annul "$A" "providerSpecificData: { autoSync: true, ...tokenData" "providerSpecificData: { ...tokenData"
echo "== 29: sin el cliente builtin"; annul "$A" "oauthClient: BUILTIN_OAUTH_CLIENT, importedAt" "importedAt"
echo "== 30: la hora de importación del reloj real"; annul "$A" "  const importedAt = new Date((deps.now ?? Date.now)()).toISOString()" "  const importedAt = new Date().toISOString()"
echo "== 31: cp — RFC3339 no se lee"; annul "$C" "    if (Number.isFinite(ms)) return new Date(ms).toISOString()" "    void ms"
echo "== 32: cp — siempre milisegundos"; annul "$C" "expired < SECONDS_CEILING ? expired * MILLISECONDS_PER_SECOND : expired" "expired"
echo "== 33: cp — siempre segundos"; annul "$C" "expired < SECONDS_CEILING ? expired * MILLISECONDS_PER_SECOND : expired" "expired * MILLISECONDS_PER_SECOND"
echo "== 34: cp — un expired cero cuenta"; annul "$C" "Number.isFinite(expired) && expired > 0" "Number.isFinite(expired)"
echo "== 35: cp — sin expires_in"; annul "$C" "  if (typeof expiresIn === 'number' && Number.isFinite(expiresIn) && expiresIn > 0) return" "  if (false) return"
echo "== 36: cp — un expires_in cero cuenta"; annul "$C" "Number.isFinite(expiresIn) && expiresIn > 0" "Number.isFinite(expiresIn)"
echo "== 37: cp — el tipo distingue mayúsculas"; annul "$C" "const type = asString(record.type)?.toLowerCase()" "const type = asString(record.type)"
echo "== 38: cp — un arreglo es un registro"; annul "$C" "  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null" "  if (!raw || typeof raw !== 'object') return null"
echo "== 39: cp — sin access token se importa"; annul "$C" "  if (!accessToken) return null
  return {" "  return {"
echo "== 40: cp — projectId camelCase gana"; annul "$C" "asString(record.project_id) ?? asString(record.projectId)" "asString(record.projectId) ?? asString(record.project_id)"
echo "== 41: cp — muse por la rama general"; annul "$C" "  if (provider === MUSE_PROVIDER) return" "  if (false) return"
echo "== 42: cp — muse sin dca_token"; annul "$C" "const dcaToken = asString(record.dca_token) || (isDca(accessToken) ? accessToken : null)" "const dcaToken = isDca(accessToken) ? accessToken : null"
echo "== 43: cp — la api_key DCA es de inferencia"; annul "$C" "const inferenceKey = apiKey && !isDca(apiKey) ? apiKey" "const inferenceKey = apiKey ? apiKey"
echo "== 44: cp — muse sin claves se importa"; annul "$C" "  if (!inferenceKey && !dcaToken) return null" "  if (false) return null"
echo "== 45: cp — la clave acuñada hereda el reloj"; annul "$C" "expiresAt: inferenceKey ? null : resolveCliProxyExpiry(record, nowMs)," "expiresAt: resolveCliProxyExpiry(record, nowMs),"
echo "== 46: cp — authKind sin defecto"; annul "$C" "authKind: asString(record.auth_kind) || 'oauth'," "authKind: asString(record.auth_kind),"
echo "== 47: cp — el nombre sin defecto"; annul "$C" "name: parsed.email || \`\${parsed.provider} (CLIProxyAPI import)\`," "name: parsed.email,"
echo "== 48: cp — projectId vacío se escribe"; annul "$C" "      ...(parsed.projectId ? { projectId: parsed.projectId } : {})," "      projectId: parsed.projectId,"
echo "== 49: cp — sin marca de importación"; annul "$C" "      importedFrom: IMPORTED_FROM,
      importedAt" "      importedAt"
echo "== 50: cp — sin la variable del directorio"; annul "$C" "  return readVariable(env, CONFIG_DIR_VARIABLE) ?? join(home, DEFAULT_CONFIG_DIR)" "  return join(home, DEFAULT_CONFIG_DIR)"
echo "== 51: cp — .JSON en mayúsculas no cuenta"; annul "$C" "file.toLowerCase().endsWith('.json')" "file.endsWith('.json')"
echo "== 52: cp — todos los archivos"; annul "$C" "const jsonFiles = entries.filter(file => file.toLowerCase().endsWith('.json'))" "const jsonFiles = entries"
echo "== 53: cp — un JSON roto corta el barrido"; annul "$C" "    } catch {
      skipped++
    }" "    } finally {
    }"
echo "== 54: cp — un directorio ausente lanza"; annul "$C" "  } catch {
    return { candidates: [], skipped: 0, scanned: 0 }
  }" "  } finally {
  }"
echo "== 55: cp — la vista previa lleva tokens"; annul "$C" "candidates.map(candidate => ({ provider: candidate.provider, type: candidate.type, email: candidate.email }))" "candidates.map(candidate => ({ ...candidate }))"
echo "== 56: cp — un rechazo corta la importación"; annul "$C" "    } catch (error) {
      results.push" "    } finally {
    }
    if (false) {
      const error = 0
      results.push"
echo "== restaurado"; run
